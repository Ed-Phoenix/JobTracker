import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Link } from 'react-router'
import { useToast } from '@/components/toast/ToastContext'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { ApiError } from '@/lib/apiClient'
import { usePageTitle } from '@/lib/usePageTitle'
import { boardLimit, useBoard, useMoveApplication } from '../api'
import { BoardCardPreview } from '../components/BoardCard'
import { BoardColumn } from '../components/BoardColumn'
import { applicationStatuses, statusLabels, type ApplicationStatus, type ApplicationSummary } from '../types'

/** Kanban view: one column per status, newest activity first inside each column. */
export function BoardPage() {
  usePageTitle('Board')
  const toast = useToast()
  const { data, isPending, isError, error, refetch } = useBoard()
  const [dragged, setDragged] = useState<ApplicationSummary | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const move = useMoveApplication({
    onError: (moveError, company) => {
      const reason = moveError instanceof ApiError ? moveError.message : 'Please try again.'
      toast(`Could not move ${company}. ${reason}`, 'error')
      setAnnouncement(`${company} was not moved.`)
    },
  })

  // Small movement before a drag starts, so a plain click still opens the link or the select.
  // Touch waits a moment, so swiping the board sideways scrolls instead of grabbing a card.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const columns = useMemo(() => {
    const byStatus = new Map<ApplicationStatus, ApplicationSummary[]>(applicationStatuses.map((status) => [status, []]))
    for (const application of data?.items ?? []) {
      byStatus.get(application.status)?.push(application)
    }
    for (const list of byStatus.values()) {
      list.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
    }
    return byStatus
  }, [data])

  const moveTo = (application: ApplicationSummary, status: ApplicationStatus) => {
    if (application.status === status) return
    move.mutate({ id: application.id, status, company: application.company })
    // Polite live region: screen readers hear the result of a move without losing their place.
    setAnnouncement(`${application.company} moved to ${statusLabels[status]}.`)
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDragged((active.data.current?.application as ApplicationSummary | undefined) ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragged(null)
    const application = active.data.current?.application as ApplicationSummary | undefined
    if (application && over) {
      moveTo(application, over.id as ApplicationStatus)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Board</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Drag a card to another column, or use its “Move to” list, to change its status.
          </p>
        </div>
        <Link to="/applications/new" className={buttonClasses('primary')}>
          New application
        </Link>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {isPending ? (
        <SkeletonRows label="Loading the board" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Could not load the board" />
      ) : data.totalCount === 0 ? (
        <EmptyState
          title="Your board is empty"
          description="Add the first job you applied to and it will appear in the Applied column."
          action={
            <Link to="/applications/new" className={buttonClasses('primary')}>
              Add your first application
            </Link>
          }
        />
      ) : (
        <>
          {data.totalCount > data.items.length && (
            <p className="text-sm text-fg-muted">
              Showing the {boardLimit} most recently active of {data.totalCount} applications. The full list is on{' '}
              <Link to="/applications" className="font-medium text-accent hover:underline">
                Applications
              </Link>
              .
            </p>
          )}

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setDragged(null)}
          >
            {/* Columns scroll sideways on narrow screens; the page itself never does. */}
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
              {applicationStatuses.map((status) => (
                <BoardColumn key={status} status={status} applications={columns.get(status) ?? []} onMove={moveTo} />
              ))}
            </div>

            <DragOverlay>
              {dragged && <BoardCardPreview application={dragged} />}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </section>
  )
}
