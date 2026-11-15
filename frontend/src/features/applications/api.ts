import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import { dashboardKeys } from '@/features/dashboard/queryKeys'
import { toApiQuery } from './listParams'
import type {
  ApplicationDetail,
  ApplicationListParams,
  ApplicationSummary,
  ChangeStatusRequest,
  PagedResult,
  SaveApplicationRequest,
} from './types'

/**
 * Query keys identify cached data. They are hierarchical, so invalidating
 * ['applications', 'list'] refreshes every list (any filter, any page) in one call.
 */
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (params: ApplicationListParams) => [...applicationKeys.lists(), params] as const,
  detail: (id: string) => [...applicationKeys.all, 'detail', id] as const,
}

// ---------- Queries (reads) ----------

export function useApplications(params: ApplicationListParams) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    // TanStack Query passes an AbortSignal: if the filters change mid-request, the old request is cancelled.
    queryFn: ({ signal }) =>
      api.get<PagedResult<ApplicationSummary>>(`/applications?${toApiQuery(params)}`, signal),
    // Keep showing the previous page while the next one loads, instead of flashing a spinner.
    placeholderData: keepPreviousData,
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: ({ signal }) => api.get<ApplicationDetail>(`/applications/${id}`, signal),
  })
}

// ---------- Mutations (writes) ----------

/**
 * After any write: put the fresh detail in the cache (no extra request) and mark lists and
 * dashboard as stale, so they refetch the next time they are on screen.
 */
function afterWrite(queryClient: QueryClient, detail?: ApplicationDetail) {
  if (detail) {
    queryClient.setQueryData(applicationKeys.detail(detail.id), detail)
  }

  void queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SaveApplicationRequest) => api.post<ApplicationDetail>('/applications', request),
    onSuccess: (detail) => afterWrite(queryClient, detail),
  })
}

export function useUpdateApplication(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SaveApplicationRequest) => api.put<ApplicationDetail>(`/applications/${id}`, request),
    onSuccess: (detail) => afterWrite(queryClient, detail),
  })
}

export function useChangeStatus(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ChangeStatusRequest) => api.post<ApplicationDetail>(`/applications/${id}/status`, request),
    onSuccess: (detail) => afterWrite(queryClient, detail),
  })
}

export function useDeleteApplication(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.delete(`/applications/${id}`),
    onSuccess: () => afterWrite(queryClient),
  })
}
