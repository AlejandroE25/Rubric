import { LISTS, PLATFORMS, SITE_URL } from '../config'
import type { Assignment, CheckIn, DataStore, NewAssignment, Platform, SiteKey, Status } from './types'

/*
 * SharePoint adapter over the code app's generated connector services.
 *
 * `pa app add data-source --connector shared_sharepointonline ... --table <list>` writes
 * TypeScript services into src/generated/services/. They are loaded with import.meta.glob
 * so the app still builds (and falls back to the mock) before they exist.
 *
 * Two generated shapes are supported, because the tabular SharePoint output has differed
 * between CLI versions:
 *   1. one service per list, e.g. AssignmentsService.getAll({ filter }) / create() / update()
 *   2. a single SharePointOnlineService.GetItems({ dataset, table }) / PostItem() / PatchItem()
 * Everything else in the app only sees the DataStore interface.
 */

// The code-apps data layer wraps every call in { success, data, error }.
interface OpResult<T> {
  success: boolean
  data?: T
  error?: unknown
}

type Row = Record<string, unknown>

interface TableService {
  getAll(options?: { filter?: string; top?: number; orderBy?: string[] }): Promise<OpResult<Row[]>>
  create(record: Row): Promise<OpResult<Row>>
  update(id: string, changes: Row): Promise<OpResult<Row>>
}

interface SharePointOnlineService {
  GetItems(args: { dataset: string; table: string; $filter?: string; $top?: number }): Promise<OpResult<{ value?: Row[] }>>
  PostItem(args: { dataset: string; table: string; item: Row }): Promise<OpResult<Row>>
  PatchItem(args: { dataset: string; table: string; id: number; item: Row }): Promise<OpResult<Row>>
}

/** How a Choice column is written. The Microsoft reference says plain strings; if SharePoint
 *  answers "Value does not fall within the expected range", switch this to 'object'. */
const CHOICE_WRITE = 'string' as 'string' | 'object'

// ── Generated-service discovery ─────────────────────────────────────────────

const generated = import.meta.glob('../generated/services/*.ts')

export function hasGeneratedServices(): boolean {
  return Object.keys(generated).length > 0
}

async function loadExports(): Promise<Record<string, unknown>> {
  const all: Record<string, unknown> = {}
  for (const load of Object.values(generated)) Object.assign(all, (await load()) as Record<string, unknown>)
  return all
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

interface ListClient {
  getAll(filter?: string): Promise<Row[]>
  create(record: Row): Promise<Row>
  update(id: number, changes: Row): Promise<Row>
}

function unwrap<T>(r: OpResult<T>, what: string): T {
  if (!r.success) {
    const e = r.error
    const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e)
    throw new Error(`${what} failed: ${msg}`)
  }
  return r.data as T
}

async function buildClients(): Promise<Record<keyof typeof LISTS, ListClient>> {
  const exports = await loadExports()

  const perTable = (list: string): TableService | undefined => {
    const want = normalize(list)
    for (const [name, value] of Object.entries(exports)) {
      const n = normalize(name).replace(/service$/, '')
      if (n === want && value && typeof (value as TableService).getAll === 'function') return value as TableService
    }
    return undefined
  }

  const spo = Object.entries(exports).find(
    ([name, v]) => /sharepointonline/i.test(name) && v && typeof (v as SharePointOnlineService).GetItems === 'function',
  )?.[1] as SharePointOnlineService | undefined

  const client = (list: string): ListClient => {
    const svc = perTable(list)
    if (svc) {
      return {
        async getAll(filter) {
          return unwrap(await svc.getAll(filter ? { filter } : undefined), `Read ${list}`) ?? []
        },
        async create(record) {
          return unwrap(await svc.create(record), `Create in ${list}`)
        },
        async update(id, changes) {
          return unwrap(await svc.update(String(id), changes), `Update ${list} #${id}`)
        },
      }
    }
    if (spo) {
      return {
        async getAll(filter) {
          const r = await spo.GetItems({ dataset: SITE_URL, table: list, ...(filter ? { $filter: filter } : {}), $top: 500 })
          return unwrap(r, `Read ${list}`)?.value ?? []
        },
        async create(record) {
          return unwrap(await spo.PostItem({ dataset: SITE_URL, table: list, item: record }), `Create in ${list}`)
        },
        async update(id, changes) {
          return unwrap(await spo.PatchItem({ dataset: SITE_URL, table: list, id, item: changes }), `Update ${list} #${id}`)
        },
      }
    }
    throw new Error(
      `No generated service found for the "${list}" list. Run: pa app add data-source --connector shared_sharepointonline -c <connection-id> -d '<site-url>' --table '${list}'`,
    )
  }

  return {
    assignments: client(LISTS.assignments),
    checkIns: client(LISTS.checkIns),
    runtime: client(LISTS.runtime),
  }
}

// ── Field mapping ───────────────────────────────────────────────────────────

/** Choice columns come back as { Value } objects from some connector versions, strings from others. */
function choice(v: unknown): string {
  if (v && typeof v === 'object' && 'Value' in v) return String((v as { Value: unknown }).Value)
  return v == null ? '' : String(v)
}

const writeChoice = (v: string) => (CHOICE_WRITE === 'object' ? { Value: v } : v)

function date(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

function id(row: Row): number {
  return Number(row.ID ?? row.Id ?? row.id)
}

function toAssignment(row: Row): Assignment {
  const platform = choice(row.Platform)
  return {
    id: id(row),
    title: String(row.Title ?? ''),
    dueAt: date(row.DueAt) ?? new Date(NaN),
    link: String(row.Link ?? ''),
    platform: (PLATFORMS as readonly string[]).includes(platform) ? (platform as Platform) : 'Other',
    status: (choice(row.Status) || 'To Do') as Status,
    completedAt: date(row.CompletedAt),
  }
}

function toCheckIn(row: Row): CheckIn {
  return {
    id: id(row),
    date: String(row.Title ?? ''),
    PL: row.PL === true,
    GS: row.GS === true,
    SP: row.SP === true,
    completedAt: date(row.CompletedAt),
  }
}

// ── Store ───────────────────────────────────────────────────────────────────

export function createSharePointStore(): DataStore {
  let clients: Promise<Record<keyof typeof LISTS, ListClient>> | null = null
  const lists = () => (clients ??= buildClients())

  // Filtering server-side is cheaper, but OData on Choice columns varies by connector
  // version, so fall back to reading the (small) list and filtering here.
  async function readFiltered(list: ListClient, filter: string, keep: (r: Row) => boolean): Promise<Row[]> {
    try {
      return (await list.getAll(filter)).filter(keep)
    } catch {
      return (await list.getAll()).filter(keep)
    }
  }

  return {
    kind: 'sharepoint',

    async listOpenAssignments() {
      const { assignments } = await lists()
      const rows = await readFiltered(assignments, "Status eq 'To Do'", (r) => choice(r.Status) === 'To Do')
      return rows.map(toAssignment)
    },

    async addAssignment(a: NewAssignment) {
      const { assignments } = await lists()
      const row = await assignments.create({
        Title: a.title,
        DueAt: a.dueAt.toISOString(),
        Link: a.link,
        Platform: writeChoice(a.platform),
        Status: writeChoice('To Do'),
      })
      return toAssignment(row)
    },

    async completeAssignment(itemId: number) {
      const { assignments } = await lists()
      await assignments.update(itemId, { Status: writeChoice('Done'), CompletedAt: new Date().toISOString() })
    },

    async getOrCreateCheckIn(day: string) {
      const { checkIns } = await lists()
      const [existing] = await readFiltered(checkIns, `Title eq '${day}'`, (r) => r.Title === day)
      if (existing) return toCheckIn(existing)
      // CheckDate is a date-only column: send the calendar day, not an instant.
      const row = await checkIns.create({ Title: day, CheckDate: day, PL: false, GS: false, SP: false })
      return toCheckIn(row)
    },

    async updateCheckIn(itemId, patch) {
      const { checkIns } = await lists()
      const changes: Row = {}
      for (const k of ['PL', 'GS', 'SP'] as SiteKey[]) if (k in patch) changes[k] = patch[k]
      if (patch.completedAt) changes.CompletedAt = patch.completedAt.toISOString()
      return toCheckIn(await checkIns.update(itemId, changes))
    },

    async getLastTick() {
      const { runtime } = await lists()
      const [row] = await readFiltered(runtime, "Title eq 'LastTick'", (r) => r.Title === 'LastTick')
      const v = row?.Value
      return v ? String(v) : null
    },
  }
}
