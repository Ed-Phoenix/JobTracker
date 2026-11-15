import {
  applicationSources,
  applicationStatuses,
  sortFields,
  type ApplicationListParams,
  type SortDirection,
  type SortField,
} from './types'

// The list's search, filters, sort and page live in the URL (?status=Offer&page=2), not in React state.
// That makes them shareable, bookmarkable and preserved by the browser's back button.

export const defaultListParams: ApplicationListParams = {
  search: '',
  status: undefined,
  source: undefined,
  needsFollowUp: false,
  sortBy: 'appliedOn',
  sortDir: 'desc',
  page: 1,
  pageSize: 20,
}

function oneOf<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((candidate) => candidate === value)
}

/** Reads the URL defensively: unknown values fall back to defaults instead of causing a 400 from the API. */
export function parseListParams(searchParams: URLSearchParams): ApplicationListParams {
  const page = Number(searchParams.get('page'))
  const sortDir = searchParams.get('sortDir')

  return {
    search: searchParams.get('search')?.trim() ?? '',
    status: oneOf(applicationStatuses, searchParams.get('status')),
    source: oneOf(applicationSources, searchParams.get('source')),
    needsFollowUp: searchParams.get('needsFollowUp') === 'true',
    sortBy: oneOf(sortFields, searchParams.get('sortBy')) ?? defaultListParams.sortBy,
    sortDir: sortDir === 'asc' || sortDir === 'desc' ? sortDir : defaultListParams.sortDir,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: defaultListParams.pageSize,
  }
}

/** The URL only shows what differs from the defaults, so the plain list is just "/applications". */
export function toSearchParams(params: ApplicationListParams): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (params.search) searchParams.set('search', params.search)
  if (params.status) searchParams.set('status', params.status)
  if (params.source) searchParams.set('source', params.source)
  if (params.needsFollowUp) searchParams.set('needsFollowUp', 'true')
  if (params.sortBy !== defaultListParams.sortBy || params.sortDir !== defaultListParams.sortDir) {
    searchParams.set('sortBy', params.sortBy)
    searchParams.set('sortDir', params.sortDir)
  }
  if (params.page > 1) searchParams.set('page', String(params.page))

  return searchParams
}

/** Query string for GET /api/applications. */
export function toApiQuery(params: ApplicationListParams): string {
  const query = new URLSearchParams({
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    page: String(params.page),
    pageSize: String(params.pageSize),
  })

  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.source) query.set('source', params.source)
  if (params.needsFollowUp) query.set('needsFollowUp', 'true')

  return query.toString()
}

/** Clicking the active column flips the direction; a new column starts with its natural order. */
export function nextSort(current: ApplicationListParams, field: SortField): { sortBy: SortField; sortDir: SortDirection } {
  if (current.sortBy === field) {
    return { sortBy: field, sortDir: current.sortDir === 'asc' ? 'desc' : 'asc' }
  }

  // Dates read best newest first; text reads best A to Z.
  const dateFields: SortField[] = ['appliedOn', 'lastActivityAt']
  return { sortBy: field, sortDir: dateFields.includes(field) ? 'desc' : 'asc' }
}

export function hasActiveFilters(params: ApplicationListParams): boolean {
  return Boolean(params.search || params.status || params.source || params.needsFollowUp)
}
