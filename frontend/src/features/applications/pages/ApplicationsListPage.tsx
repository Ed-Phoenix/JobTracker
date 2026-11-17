import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { cn } from '@/lib/cn'
import { usePageTitle } from '@/lib/usePageTitle'
import { useApplications } from '../api'
import { ApplicationFilters } from '../components/ApplicationFilters'
import { ApplicationsTable } from '../components/ApplicationsTable'
import { ExportButtons } from '../components/ExportButtons'
import { hasActiveFilters, nextSort, parseListParams, toSearchParams } from '../listParams'
import type { ApplicationListParams } from '../types'

export function ApplicationsListPage() {
  usePageTitle('Applications')
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseListParams(searchParams), [searchParams])
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useApplications(params)

  /** Every change goes through the URL; changing a filter or the sort sends the user back to page 1. */
  const update = (changes: Partial<ApplicationListParams>, options?: { replace?: boolean }) => {
    setSearchParams(toSearchParams({ ...params, page: 1, ...changes }), { replace: options?.replace })
  }

  // The page no longer exists (e.g. its last application was deleted): jump to the last real page.
  useEffect(() => {
    if (data && data.totalPages > 0 && params.page > data.totalPages) {
      setSearchParams(toSearchParams({ ...params, page: data.totalPages }), { replace: true })
    }
  }, [data, params, setSearchParams])

  const filtersActive = hasActiveFilters(params)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Applications</h1>
          <p className="mt-1 text-sm text-slate-600">Every job you applied to, and where each process stands.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButtons params={params} disabled={!data || data.totalCount === 0} />
          <Link to="/applications/new" className={buttonClasses('primary')}>
            New application
          </Link>
        </div>
      </div>

      <ApplicationFilters params={params} onChange={update} />

      {/* Announces the result count to screen readers when filters change. */}
      <p className="sr-only" aria-live="polite">
        {data ? `${data.totalCount} applications found` : ''}
      </p>

      {isPending ? (
        <SkeletonRows label="Loading applications" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Could not load your applications" />
      ) : data.totalCount === 0 && !filtersActive ? (
        <EmptyState
          title="No applications yet"
          description="Add the first job you applied to and start tracking its progress."
          action={
            <Link to="/applications/new" className={buttonClasses('primary')}>
              Add your first application
            </Link>
          }
        />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No applications match your filters"
          description="Try another search term or remove some filters."
          action={
            <Button
              variant="secondary"
              onClick={() => update({ search: '', status: undefined, source: undefined, needsFollowUp: false })}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        // While the next page loads, the previous one stays visible but dimmed.
        <div aria-busy={isFetching} className={cn('space-y-4 transition-opacity', isPlaceholderData && 'opacity-60')}>
          <ApplicationsTable items={data.items} params={params} onSort={(field) => update(nextSort(params, field))} />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            totalCount={data.totalCount}
            totalPages={data.totalPages}
            onPageChange={(page) => update({ page })}
          />
        </div>
      )}
    </section>
  )
}
