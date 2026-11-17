import { cn } from '@/lib/cn'
import { statusLabels, type ApplicationStatus } from '../types'

// Light background + dark text of the same hue (and the reverse in dark mode): readable (WCAG AA
// contrast) and color is never the only signal, because the label is always written out.
const styles: Record<ApplicationStatus, string> = {
  Applied: 'bg-surface-muted text-fg-soft ring-slate-500/20 dark:ring-slate-400/25',
  HrInterview: 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/25',
  TechnicalInterview:
    'bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/30',
  TechnicalTest: 'bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30',
  Offer: 'bg-amber-50 text-amber-800 ring-amber-600/30 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30',
  Accepted: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  Rejected: 'bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/25',
  NoResponse: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-400/10 dark:text-zinc-400 dark:ring-zinc-400/25',
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
      className="inline-flex items-center whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-inset ring-orange-600/30 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/30"
      title="No recent activity. Consider following up."
    >
      Follow up
    </span>
  )
}
