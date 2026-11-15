import { Link } from 'react-router'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { ApiError } from '@/lib/apiClient'

/** 404 gets a friendly "not found" (it may have been deleted); anything else gets a retry. */
export function ApplicationLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Application not found"
        description="It may have been deleted, or the link is wrong."
        action={
          <Link to="/applications" className={buttonClasses('secondary')}>
            Back to applications
          </Link>
        }
      />
    )
  }

  return <ErrorState error={error} onRetry={onRetry} title="Could not load this application" />
}
