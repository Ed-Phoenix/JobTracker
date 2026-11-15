import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/60',
  secondary: 'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
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
