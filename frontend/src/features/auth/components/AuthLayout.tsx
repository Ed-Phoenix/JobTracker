import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** Centered card shared by the login and register pages. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <Logo className="mb-8" />
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line sm:p-8">
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-sm text-fg-muted">{footer}</p>
    </main>
  )
}
