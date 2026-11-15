import { cn } from '@/lib/cn'
import { statusLabels, type ApplicationStatus } from '../types'

// Light background + dark text of the same hue: readable (WCAG AA contrast) and color is never
// the only signal, because the label is always written out.
const styles: Record<ApplicationStatus, string> = {
  Applied: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  HrInterview: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  TechnicalInterview: 'bg-indigo-50 text-indigo-800 ring-indigo-600/20',
  TechnicalTest: 'bg-violet-50 text-violet-800 ring-violet-600/20',
  Offer: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  Accepted: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  Rejected: 'bg-red-50 text-red-800 ring-red-600/20',
  NoResponse: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
}

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        styles[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  )
}

export function FollowUpBadge() {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-inset ring-orange-600/30"
      title="No recent activity. Consider following up."
    >
      Follow up
    </span>
  )
}
