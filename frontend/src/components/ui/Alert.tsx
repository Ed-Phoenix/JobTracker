import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'error' | 'info' | 'success'

const tones: Record<Tone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-brand-200 bg-brand-50 text-brand-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

interface AlertProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

export function Alert({ tone = 'error', children, className }: AlertProps) {
  return (
    // role="alert" makes screen readers announce errors as soon as they appear.
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone], className)}
    >
      {children}
    </div>
  )
}
