import type { RouteObject } from 'react-router'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/components/RouteGuards'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

/**
 * The route tree. Guards are "layout routes" without a path: they decide whether
 * their children render. Exported as plain data so tests can mount the same tree.
 */
export const routes: RouteObject[] = [
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <PlaceholderPage title="Dashboard" /> },
          { path: '/applications', element: <PlaceholderPage title="Applications" /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
