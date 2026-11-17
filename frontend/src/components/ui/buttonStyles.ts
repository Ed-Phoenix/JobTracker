import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/60',
  secondary: 'bg-surface text-fg ring-1 ring-inset ring-line-strong hover:bg-surface-sunken disabled:text-fg-faint',
  ghost: 'text-fg-soft hover:bg-surface-muted disabled:text-fg-faint',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60 dark:hover:bg-red-500',
}

/**
 * Button look as a plain function, so a <Link> that navigates can look like a button
 * while staying a real link (correct semantics: links go somewhere, buttons do something).
 */
export function buttonClasses(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold',
    'transition-colors disabled:cursor-not-allowed',
    variants[variant],
    className,
  )
}
