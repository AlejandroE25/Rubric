import type { Assignment, CheckIn, DataStore, NewAssignment } from './types'
import { CHECK_SITES } from '../config'
import { localStamp } from '../lib/dates'

// In-browser stand-in for the three SharePoint lists, persisted to localStorage so the
// screen can be exercised end to end without a Power Platform environment.

const KEY = 'rubric.mock.v2'

interface Db {
  nextId: number
  assignments: Assignment[]
  checkIns: CheckIn[]
}

function at(daysFromNow: number, hour: number, minute: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d
}

function seed(): Db {
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000)
  return {
    nextId: 46,
    assignments: [
      { id: 41, title: 'MATH 241 Quiz 6 corrections', dueAt: at(-1, 23, 59), link: 'https://us.prairielearn.com', platform: 'PrairieLearn', status: 'To Do', completedAt: null },
      { id: 42, title: 'PHYS 211 Unit 7 Prelecture', dueAt: hoursFromNow(5), link: 'https://www.smartphysics.com', platform: 'SmartPhysics', status: 'To Do', completedAt: null },
      { id: 43, title: 'MATH 241 HW 7', dueAt: at(1, 23, 59), link: 'https://us.prairielearn.com', platform: 'PrairieLearn', status: 'To Do', completedAt: null },
      { id: 44, title: 'CS 173 Homework 5', dueAt: at(3, 23, 59), link: 'https://cs173.tech', platform: 'CS173.tech', status: 'To Do', completedAt: null },
      { id: 45, title: 'RHET 105 Draft 2', dueAt: at(6, 9, 0), link: 'https://canvas.illinois.edu', platform: 'Canvas', status: 'To Do', completedAt: null },
    ],
    checkIns: [],
  }
}

function revive(raw: string): Db {
  const db = JSON.parse(raw) as Db
  for (const a of db.assignments) {
    a.dueAt = new Date(a.dueAt)
    a.completedAt = a.completedAt ? new Date(a.completedAt) : null
  }
  for (const c of db.checkIns) c.completedAt = c.completedAt ? new Date(c.completedAt) : null
  return db
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return revive(raw)
  } catch {
    // Storage unavailable or corrupt: fall through to a fresh seed.
  }
  return seed()
}

function save(db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // Non-persistent mode is fine for a mock.
  }
}

const delay = () => new Promise((r) => setTimeout(r, 120))

export function createMockStore(): DataStore {
  const db = load()
  const commit = () => save(db)

  return {
    kind: 'mock',

    async listOpenAssignments() {
      await delay()
      return db.assignments.filter((a) => a.status === 'To Do').map((a) => ({ ...a }))
    },

    async addAssignment(a: NewAssignment) {
      await delay()
      const row: Assignment = { id: db.nextId++, ...a, status: 'To Do', completedAt: null }
      db.assignments.push(row)
      commit()
      return { ...row }
    },

    async completeAssignment(id: number) {
      await delay()
      const row = db.assignments.find((a) => a.id === id)
      if (row) {
        row.status = 'Done'
        row.completedAt = new Date()
        commit()
      }
    },

    async getOrCreateCheckIn(date: string) {
      await delay()
      let row = db.checkIns.find((c) => c.date === date)
      if (!row) {
        // CheckIns is its own list, so its IDs don't consume ticket numbers.
        const unticked = Object.fromEntries(CHECK_SITES.map((s) => [s.key, false])) as Record<(typeof CHECK_SITES)[number]['key'], boolean>
        row = { id: db.checkIns.length + 1, date, completedAt: null, ...unticked }
        db.checkIns.push(row)
        commit()
      }
      return { ...row }
    },

    async updateCheckIn(id, patch) {
      await delay()
      const row = db.checkIns.find((c) => c.id === id)
      if (!row) throw new Error(`CheckIn ${id} not found`)
      Object.assign(row, patch)
      commit()
      return { ...row }
    },

    async getLastTick() {
      // Pretend the Tick flow ran within the last 15 minutes.
      const d = new Date(Date.now() - 6 * 60_000)
      return localStamp(d)
    },
  }
}

/** Wipe the mock back to its seed data (exposed on window for convenience in dev). */
export function resetMock() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
