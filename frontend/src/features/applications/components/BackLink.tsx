import { Link } from 'react-router'

export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg">
      <span aria-hidden="true">←</span> {children}
    </Link>
  )
}
