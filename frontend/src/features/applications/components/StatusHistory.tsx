import { formatDateTime } from '@/lib/format'
import { statusLabels, type StatusChange } from '../types'
import { StatusBadge } from './StatusBadge'

/** Vertical timeline of status changes, newest first (an ordered list for screen readers). */
export function StatusHistory({ history }: { history: StatusChange[] }) {
  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6">
      {history.map((change) => (
        <li key={change.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.84rem] top-1 size-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200"
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={change.toStatus} />
            <span className="text-sm text-slate-600">
              {change.fromStatus ? `from ${statusLabels[change.fromStatus]}` : 'Application created'}
            </span>
          </div>
          <time dateTime={change.changedAt} className="mt-1 block text-xs text-slate-500">
            {formatDateTime(change.changedAt)}
          </time>
          {change.note && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{change.note}</p>}
        </li>
      ))}
    </ol>
  )
}
