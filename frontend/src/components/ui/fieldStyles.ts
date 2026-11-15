import { cn } from '@/lib/cn'

/** Shared look of text inputs, selects and textareas. */
export function controlClasses(hasError: boolean, className?: string): string {
  return cn(
    'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-xs placeholder:text-slate-400',
    hasError ? 'border-red-500' : 'border-slate-300',
    className,
  )
}

/** Ids that tie a control to its error or hint text through aria-describedby. */
export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}
