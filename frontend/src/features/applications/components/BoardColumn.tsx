import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/cn'
import { statusLabels, type ApplicationStatus, type ApplicationSummary } from '../types'
import { BoardCard } from './BoardCard'

interface BoardColumnProps {
  status: ApplicationStatus
  applications: ApplicationSummary[]
  onMove: (application: ApplicationSummary, status: ApplicationStatus) => void
}

/** A status column. It is a drop target: dragging a card here changes the application's status. */
export function BoardColumn({ status, applications, onMove }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const headingId = `board-column-${status}`

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        // relative: the sr-only texts inside are position:absolute; without a positioned ancestor they
        // would escape the board's scroll container and stretch the whole page sideways.
        'relative flex w-72 shrink-0 flex-col rounded-2xl bg-surface-sunken p-3 ring-1 ring-line transition-shadow',
        isOver && 'ring-2 ring-brand-500',
      )}
    >
      <h2 className="flex items-center justify-between px-1 pb-3 text-sm font-semibold text-fg">
        {/* The column (a landmark region) is named after the status alone; the heading also reads the count. */}
        <span id={headingId}>{statusLabels[status]}</span>{' '}
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
          {applications.length}
          <span className="sr-only"> applications</span>
        </span>
      </h2>

      {applications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-xs text-fg-subtle">
          Nothing here
        </p>
      ) : (
        <ul className="space-y-3">
          {applications.map((application) => (
            <li key={application.id}>
              <BoardCard application={application} onMove={(next) => onMove(application, next)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
