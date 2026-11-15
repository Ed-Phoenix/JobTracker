import { Navigate, Outlet, useLocation } from 'react-router'
import { PageSpinner } from '@/components/ui/Spinner'
import { useAuth } from '../AuthContext'

/**
 * Wraps the private pages. This is a UX guard only: the real protection is the API,
 * which rejects any request without a valid token.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <PageSpinner label="Checking your session" />
  }

  if (status === 'unauthenticated') {
    // Remember where the user wanted to go, to send them back there after signing in.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}

/** Wraps login/register: a signed-in user has nothing to do there. */
export function PublicOnlyRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <PageSpinner label="Checking your session" />
  }

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  return <Outlet />
}
