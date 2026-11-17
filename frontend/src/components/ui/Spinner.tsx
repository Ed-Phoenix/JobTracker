import { cn } from '@/lib/cn'

interface SpinnerProps {
  className?: string
  /** Announced by screen readers. Pass an empty string when the spinner is decorative. */
  label?: string
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center">
      <svg
        className={cn('size-5 animate-spin text-current', className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
        <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

/** Centered spinner for a whole page or section while its data loads. */
export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-accent">
      <Spinner className="size-8" label={label} />
    </div>
  )
}
