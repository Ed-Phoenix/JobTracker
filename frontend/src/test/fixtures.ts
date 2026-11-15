import type {
  ApplicationDetail,
  ApplicationSummary,
  PagedResult,
} from '@/features/applications/types'

/** Test data builders: sensible defaults, override only what the test cares about. */

export function makeSummary(overrides: Partial<ApplicationSummary> = {}): ApplicationSummary {
  return {
    id: '0196f000-0000-7000-8000-000000000001',
    company: 'Acme',
    position: 'Junior Developer',
    location: 'Monterrey',
    workMode: 'Hybrid',
    salaryAmount: 18000,
    salaryCurrency: 'MXN',
    appliedOn: '2026-11-02',
    source: 'LinkedIn',
    status: 'Applied',
    lastActivityAt: '2026-11-02T15:00:00Z',
    needsFollowUp: false,
    ...overrides,
  }
}

export function makeDetail(overrides: Partial<ApplicationDetail> = {}): ApplicationDetail {
  const summary = makeSummary(overrides)
  return {
    ...summary,
    jobUrl: 'https://example.com/jobs/1',
    notes: 'Prepare questions about the team.',
    createdAt: '2026-11-02T15:00:00Z',
    updatedAt: '2026-11-02T15:00:00Z',
    statusHistory: [
      { id: 'h1', fromStatus: null, toStatus: 'Applied', note: null, changedAt: '2026-11-02T15:00:00Z' },
    ],
    ...overrides,
  }
}

export function paged<T>(items: T[], overrides: Partial<PagedResult<T>> = {}): PagedResult<T> {
  return {
    items,
    page: 1,
    pageSize: 20,
    totalCount: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    ...overrides,
  }
}
