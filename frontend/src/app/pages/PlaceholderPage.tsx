import { useAuth } from '@/features/auth/AuthContext'
import { usePageTitle } from '@/lib/usePageTitle'

/** Temporary page for sections that are built in the next phases. */
export function PlaceholderPage({ title }: { title: string }) {
  usePageTitle(title)
  const { user } = useAuth()

  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">
        Signed in as <span className="font-medium text-slate-900">{user?.email}</span>. This section is coming soon.
      </p>
    </section>
  )
}
