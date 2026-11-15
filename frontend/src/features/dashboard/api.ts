import { useQuery } from '@tanstack/react-query'
import { useApplications } from '@/features/applications/api'
import { defaultListParams } from '@/features/applications/listParams'
import { api } from '@/lib/apiClient'
import { dashboardKeys } from './queryKeys'
import type { DashboardSummary } from './types'

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: ({ signal }) => api.get<DashboardSummary>('/dashboard/summary', signal),
  })
}

/** The five applications that have waited longest for a follow-up. Reuses the list endpoint. */
export function useFollowUpApplications() {
  return useApplications({
    ...defaultListParams,
    needsFollowUp: true,
    sortBy: 'lastActivityAt',
    sortDir: 'asc',
    pageSize: 5,
  })
}
