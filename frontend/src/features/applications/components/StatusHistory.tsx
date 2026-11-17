import { formatDateTime } from '@/lib/format'
import { statusLabels, type StatusChange } from '../types'
import { StatusBadge } from './StatusBadge'

/** Vertical timeline of status changes, newest first (an ordered list for screen readers). */
export function StatusHistory({ history }: { history: StatusChange[] }) {
  return (
    <ol className="relative space-y-6 border-l border-line pl-6">
      {history.map((change) => (
        <li key={change.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.84rem] top-1 size-3 rounded-full border-2 border-surface bg-brand-500 ring-1 ring-accent-line"
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={change.toStatus} />
            <span className="text-sm text-fg-muted">
              {change.fromStatus ? `from ${statusLabels[change.fromStatus]}` : 'Application created'}
            </span>
          </div>
          <time dateTime={change.changedAt} className="mt-1 block text-xs text-fg-subtle">
            {formatDateTime(change.changedAt)}
          </time>
          {change.note && <p className="mt-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm text-fg-soft">{change.note}</p>}
        </li>
      ))}
    </ol>
  )
}
