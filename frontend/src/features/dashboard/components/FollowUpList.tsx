import { Link } from 'react-router'
import { StatusBadge } from '@/features/applications/components/StatusBadge'
import { formatDaysAgo } from '@/lib/format'
import { useFollowUpApplications } from '../api'

export function FollowUpList({ total }: { total: number }) {
  const { data, isPending, isError } = useFollowUpApplications()

  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-line">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">Waiting for a follow-up</h2>
        {total > 0 && (
          <Link
            to="/applications?needsFollowUp=true&sortBy=lastActivityAt&sortDir=asc"
            className="text-sm font-medium text-accent hover:underline"
          >
            View all {total}
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm text-fg-muted">Open processes with no news for a while, longest wait first.</p>

      {isPending ? (
        <p className="mt-4 text-sm text-fg-subtle">Loading…</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-700 dark:text-red-400">Could not load this list.</p>
      ) : data.items.length === 0 ? (
        <p className="mt-4 text-sm text-fg-subtle">You are up to date. Nothing needs a follow-up right now.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line-soft">
          {data.items.map((application) => (
            <li key={application.id}>
              <Link
                to={`/applications/${application.id}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-surface-sunken"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{application.company}</p>
                  <p className="truncate text-sm text-fg-muted">{application.position}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={application.status} />
                  <span className="text-xs text-fg-subtle">Last activity {formatDaysAgo(application.lastActivityAt).toLowerCase()}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
