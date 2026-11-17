import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'

const navigation = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/applications', label: 'Applications', end: false },
  { to: '/board', label: 'Board', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

/** Shell of the private area: header with navigation, then the current page in <Outlet />. */
export function AppLayout() {
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    await logout()
  }

  return (
    <div className="min-h-dvh">
      {/* First focusable element: lets keyboard users jump over the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" aria-label="JobTracker home">
            <Logo />
          </Link>

          {/* On small screens the nav drops to its own full-width row (order-last + w-full). */}
          <nav aria-label="Main" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-fg-muted sm:inline">{user?.fullName}</span>
            <ThemeToggle />
            <Button variant="secondary" onClick={handleLogout} loading={signingOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
