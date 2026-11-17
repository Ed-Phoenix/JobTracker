import { Link } from 'react-router'
import { formatDate, formatDaysAgo } from '@/lib/format'
import {
  sourceLabels,
  workModeLabels,
  type ApplicationListParams,
  type ApplicationSummary,
  type SortField,
} from '../types'
import { FollowUpBadge, StatusBadge } from './StatusBadge'

interface ApplicationsTableProps {
  items: ApplicationSummary[]
  params: ApplicationListParams
  onSort: (field: SortField) => void
}

/**
 * Two layouts for the same data: a sortable table on large screens and a list of cards on
 * small ones, where a 6-column table would force horizontal scrolling.
 */
export function ApplicationsTable({ items, params, onSort }: ApplicationsTableProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl bg-surface ring-1 ring-line lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Job applications</caption>
          <thead className="border-b border-line bg-surface-sunken text-xs uppercase tracking-wide text-fg-subtle">
            <tr>
              <SortableHeader field="company" label="Company" params={params} onSort={onSort} />
              <SortableHeader field="position" label="Position" params={params} onSort={onSort} />
              <SortableHeader field="status" label="Status" params={params} onSort={onSort} />
              <th scope="col" className="px-4 py-3 font-medium">
                Source
              </th>
              <SortableHeader field="appliedOn" label="Applied" params={params} onSort={onSort} />
              <SortableHeader field="lastActivityAt" label="Last activity" params={params} onSort={onSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {items.map((application) => (
              <tr key={application.id} className="hover:bg-surface-sunken">
                <td className="px-4 py-3">
                  <Link
                    to={`/applications/${application.id}`}
                    className="font-medium text-fg hover:text-accent hover:underline"
                  >
                    {application.company}
                  </Link>
                  <div className="text-xs text-fg-subtle">
                    {[application.location, workModeLabels[application.workMode]].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="px-4 py-3 text-fg-soft">{application.position}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={application.status} />
                    {application.needsFollowUp && <FollowUpBadge />}
                  </div>
                </td>
                <td className="px-4 py-3 text-fg-soft">{sourceLabels[application.source]}</td>
                <td className="px-4 py-3 whitespace-nowrap text-fg-soft">{formatDate(application.appliedOn)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-fg-subtle">
                  {formatDaysAgo(application.lastActivityAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden" aria-label="Job applications">
        {items.map((application) => (
          <li key={application.id}>
            <Link
              to={`/applications/${application.id}`}
              className="block rounded-2xl bg-surface p-4 ring-1 ring-line hover:ring-accent-line"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{application.company}</p>
                  <p className="truncate text-sm text-fg-muted">{application.position}</p>
                </div>
                <StatusBadge status={application.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                <span>Applied {formatDate(application.appliedOn)}</span>
                <span>{sourceLabels[application.source]}</span>
                {application.needsFollowUp && <FollowUpBadge />}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

interface SortableHeaderProps {
  field: SortField
  label: string
  params: ApplicationListParams
  onSort: (field: SortField) => void
}

function SortableHeader({ field, label, params, onSort }: SortableHeaderProps) {
  const active = params.sortBy === field
  const direction = params.sortDir === 'asc' ? 'ascending' : 'descending'

  return (
    // aria-sort tells screen readers which column the table is sorted by, and in which direction.
    <th scope="col" aria-sort={active ? direction : 'none'} className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 rounded whitespace-nowrap uppercase tracking-wide hover:text-fg"
      >
        {label}
        <span aria-hidden="true" className={active ? 'text-accent' : 'text-fg-faint'}>
          {active && params.sortDir === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </th>
  )
}
