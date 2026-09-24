import { createMockStore } from './mock'
import { createSharePointStore, hasGeneratedServices } from './sharepoint'
import type { DataStore } from './types'

/**
 * SharePoint once `pa app add data-source` has generated services; the mock before that.
 * Append ?mock to the URL to force the mock even when services exist.
 */
function pick(): DataStore {
  const forceMock = typeof location !== 'undefined' && new URLSearchParams(location.search).has('mock')
  return !forceMock && hasGeneratedServices() ? createSharePointStore() : createMockStore()
}

export const store: DataStore = pick()
export type { Assignment, CheckIn, DataStore, NewAssignment, Platform, SiteKey } from './types'
