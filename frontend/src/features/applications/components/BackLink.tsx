import { Link } from 'react-router'

export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
      <span aria-hidden="true">←</span> {children}
    </Link>
  )
}
