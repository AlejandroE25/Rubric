// Where the three lists from the build spec live. Fill in SITE_URL after creating the
// SharePoint site; list names must match exactly (they are case-sensitive).
export const SITE_URL = 'https://<tenant>.sharepoint.com/sites/<site>'

export const LISTS = {
  assignments: 'Assignments',
  checkIns: 'CheckIns',
  runtime: 'Runtime',
} as const

// Choice values on Assignments.Platform, in the order the form offers them.
export const PLATFORMS = ['PrairieLearn', 'Gradescope', 'SmartPhysics', 'Canvas', 'Other'] as const

// The weekday check-in: one Yes/No column per site on the CheckIns list.
export const CHECK_SITES = [
  { key: 'PL', label: 'PrairieLearn' },
  { key: 'GS', label: 'Gradescope' },
  { key: 'SP', label: 'SmartPhysics' },
] as const

// The Tick flow runs every 15 minutes, so a heartbeat older than three missed runs means
// the flow is off (expired connection, throttling, or the inactivity turn-off).
export const STALE_TICK_MINUTES = 45
