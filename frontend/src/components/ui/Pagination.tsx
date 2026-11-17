import { Button } from './Button'

interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, totalCount, totalPages, onPageChange }: PaginationProps) {
  const first = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalCount)

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-fg-muted">
        Showing <span className="font-medium text-fg">{first}</span>–
        <span className="font-medium text-fg">{last}</span> of{' '}
        <span className="font-medium text-fg">{totalCount}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="text-sm text-fg-muted" aria-current="page">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
