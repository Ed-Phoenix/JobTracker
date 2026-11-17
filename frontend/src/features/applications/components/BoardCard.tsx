import { useDraggable } from '@dnd-kit/core'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { formatDaysAgo } from '@/lib/format'
import { applicationStatuses, statusLabels, type ApplicationStatus, type ApplicationSummary } from '../types'
import { FollowUpBadge } from './StatusBadge'

const cardClasses = 'rounded-xl bg-surface p-3 shadow-xs ring-1 ring-line select-none'

interface BoardCardProps {
  application: ApplicationSummary
  onMove: (status: ApplicationStatus) => void
}

/**
 * One application on the board. Mouse and touch users can drag the whole card; everybody
 * (keyboard, screen reader, or anyone who cannot drag) can use the "Move to" list instead.
 */
export function BoardCard({ application, onMove }: BoardCardProps) {
  // Only the pointer listeners are spread, not dnd-kit's `attributes`: those would turn the card
  // into a fake focusable button around a real link and a real select. Keyboard users have the select.
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: application.id, data: { application } })

  return (
    <article
      ref={setNodeRef}
      {...listeners}
      aria-label={`${application.company}, ${application.position}`}
      // The original stays in place, faded, while a copy follows the pointer.
      className={cn(cardClasses, 'cursor-grab active:cursor-grabbing', isDragging && 'opacity-40')}
    >
      <CardBody application={application} onMove={onMove} />
    </article>
  )
}

/** The copy shown under the pointer while dragging. Purely visual, so hidden from assistive technology. */
export function BoardCardPreview({ application }: { application: ApplicationSummary }) {
  return (
    <div aria-hidden="true" className={cn(cardClasses, 'rotate-1 cursor-grabbing shadow-lg ring-accent-line')}>
      <CardBody application={application} />
    </div>
  )
}

function CardBody({ application, onMove }: { application: ApplicationSummary; onMove?: (status: ApplicationStatus) => void }) {
  return (
    <>
      <Link
        to={`/applications/${application.id}`}
        className="font-medium text-fg hover:text-accent hover:underline"
        draggable={false}
        tabIndex={onMove ? undefined : -1}
      >
        {application.company}
      </Link>
      <p className="mt-0.5 text-sm text-fg-muted">{application.position}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
        <span>{formatDaysAgo(application.lastActivityAt)}</span>
        {application.needsFollowUp && <FollowUpBadge />}
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-fg-subtle">
        <span className="shrink-0">Move to</span>
        <select
          value={application.status}
          disabled={!onMove}
          onChange={(event) => onMove?.(event.target.value as ApplicationStatus)}
          // Keeps a press on the select from starting a drag.
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          aria-label={`Move ${application.company} to`}
          className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-fg"
        >
          {applicationStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
