import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string
  /** One line of context under the number. */
  detail?: ReactNode
}

/** A headline number. Not a chart: a single value reads faster as text than as a one-bar chart. */
export function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      {/* dt/dd: the label and its value stay associated for screen readers. */}
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</dd>
      {detail && <dd className="mt-1 text-sm text-slate-500">{detail}</dd>}
    </div>
  )
}
