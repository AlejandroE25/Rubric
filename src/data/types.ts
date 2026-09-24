import type { CHECK_SITES, PLATFORMS } from '../config'

export type Platform = (typeof PLATFORMS)[number]
export type Status = 'To Do' | 'Done' | 'Archived'
export type SiteKey = (typeof CHECK_SITES)[number]['key']

/** One row of the Assignments list: the ticket. `id` is the SharePoint item ID, the n in [HW-n]. */
export interface Assignment {
  id: number
  title: string
  dueAt: Date
  link: string
  platform: Platform
  status: Status
  completedAt: Date | null
}

export interface NewAssignment {
  title: string
  dueAt: Date
  link: string
  platform: Platform
}

/** One row of the CheckIns list. Title is the local ISO date, e.g. 2026-09-18. */
export type CheckIn = {
  id: number
  date: string
  completedAt: Date | null
} & Record<SiteKey, boolean>

/**
 * Everything the screen needs. Two implementations: SharePoint (via the code app's generated
 * connector services) and an in-browser mock for local development.
 */
export interface DataStore {
  readonly kind: 'sharepoint' | 'mock'
  listOpenAssignments(): Promise<Assignment[]>
  addAssignment(a: NewAssignment): Promise<Assignment>
  completeAssignment(id: number): Promise<void>
  /** Today's row, created lazily on first open each day (as the canvas app did). */
  getOrCreateCheckIn(date: string): Promise<CheckIn>
  updateCheckIn(id: number, patch: Partial<Pick<CheckIn, SiteKey>> & { completedAt?: Date }): Promise<CheckIn>
  /** Runtime.LastTick, the Tick flow's heartbeat. Local timestamp string, or null if never set. */
  getLastTick(): Promise<string | null>
}
