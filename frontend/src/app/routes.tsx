import type { RouteObject } from 'react-router'
import { PageSpinner } from '@/components/ui/Spinner'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/components/RouteGuards'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './pages/NotFoundPage'

/**
 * The route tree. Guards are "layout routes" without a path: they decide whether
 * their children render. Exported as plain data so tests can mount the same tree.
 *
 * Code splitting: the private pages use `lazy`, so each one is a separate JavaScript file
 * downloaded the first time it is visited. The login page (what a new visitor sees first)
 * does not pay for the dashboard's chart library.
 */
export const routes: RouteObject[] = [
  {
    // Shown while the first lazy page of the session is downloading.
    hydrateFallbackElement: <PageSpinner />,
    children: [
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
              {
                path: '/',
                lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage }),
              },
              {
                path: '/applications',
                lazy: async () => ({
                  Component: (await import('@/features/applications/pages/ApplicationsListPage')).ApplicationsListPage,
                }),
              },
              {
                path: '/board',
                lazy: async () => ({ Component: (await import('@/features/applications/pages/BoardPage')).BoardPage }),
              },
              {
                path: '/applications/new',
                lazy: async () => ({
                  Component: (await import('@/features/applications/pages/NewApplicationPage')).NewApplicationPage,
                }),
              },
              {
                path: '/applications/:id',
                lazy: async () => ({
                  Component: (await import('@/features/applications/pages/ApplicationDetailPage')).ApplicationDetailPage,
                }),
              },
              {
                path: '/applications/:id/edit',
                lazy: async () => ({
                  Component: (await import('@/features/applications/pages/EditApplicationPage')).EditApplicationPage,
                }),
              },
              {
                path: '/settings',
                lazy: async () => ({ Component: (await import('@/features/settings/SettingsPage')).SettingsPage }),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
