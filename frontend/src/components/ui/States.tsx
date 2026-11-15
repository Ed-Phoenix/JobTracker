import type { ReactNode } from 'react'
import { ApiError } from '@/lib/apiClient'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

/** Shown when a request succeeded but there is nothing to display. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

/** Shown when a request failed, with a way to try again. */
export function ErrorState({ error, onRetry, title = 'Something went wrong' }: ErrorStateProps) {
  const message =
    error instanceof ApiError && error.status < 500
      ? error.message
      : 'We could not load this data. Check your connection and try again.'

  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <h2 className="text-base font-semibold text-red-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-red-800">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/** Grey placeholder blocks with the rough shape of the content that is loading. */
export function SkeletonRows({ rows = 5, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-200/70" aria-hidden="true" />
      ))}
    </div>
  )
}
