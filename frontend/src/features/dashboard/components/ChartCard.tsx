import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  description: string
  children: ReactNode
  /** The same data as a table: for screen readers, keyboard users and anyone who wants exact numbers. */
  table: { columns: [string, string]; rows: Array<[string, number]> }
}

export function ChartCard({ title, description, children, table }: ChartCardProps) {
  return (
    <section className="flex flex-col rounded-2xl bg-white p-6 ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>

      {/* The SVG itself is hidden from screen readers; the table below carries the same values. */}
      <div className="mt-4 flex-1" aria-hidden="true">
        {children}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900">View as table</summary>
        <table className="mt-3 w-full text-left">
          <caption className="sr-only">{title}</caption>
          <thead className="text-xs text-slate-500 uppercase">
            <tr>
              <th scope="col" className="py-1 font-medium">
                {table.columns[0]}
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                {table.columns[1]}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {table.rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row" className="py-1.5 font-normal text-slate-700">
                  {label}
                </th>
                <td className="py-1.5 text-right text-slate-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
