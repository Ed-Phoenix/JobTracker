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
    <section className="flex flex-col rounded-2xl bg-surface p-6 ring-1 ring-line">
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      <p className="mt-1 text-sm text-fg-muted">{description}</p>

      {/* The SVG itself is hidden from screen readers; the table below carries the same values. */}
      <div className="mt-4 flex-1" aria-hidden="true">
        {children}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-fg-muted hover:text-fg">View as table</summary>
        <table className="mt-3 w-full text-left">
          <caption className="sr-only">{title}</caption>
          <thead className="text-xs text-fg-subtle uppercase">
            <tr>
              <th scope="col" className="py-1 font-medium">
                {table.columns[0]}
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                {table.columns[1]}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft tabular-nums">
            {table.rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row" className="py-1.5 font-normal text-fg-soft">
                  {label}
                </th>
                <td className="py-1.5 text-right text-fg">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
