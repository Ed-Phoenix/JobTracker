import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { PageSpinner } from '@/components/ui/Spinner'
import { daysSince, formatDate, formatDateTime, formatDaysAgo, formatMoney } from '@/lib/format'
import { usePageTitle } from '@/lib/usePageTitle'
import { useApplication } from '../api'
import { ApplicationLoadError } from '../components/ApplicationLoadError'
import { BackLink } from '../components/BackLink'
import { ChangeStatusDialog } from '../components/ChangeStatusDialog'
import { DeleteApplicationDialog } from '../components/DeleteApplicationDialog'
import { StatusBadge } from '../components/StatusBadge'
import { StatusHistory } from '../components/StatusHistory'
import { sourceLabels, workModeLabels } from '../types'

type OpenDialog = 'status' | 'delete' | null

export function ApplicationDetailPage() {
  const { id = '' } = useParams()
  const { data: application, isPending, isError, error, refetch } = useApplication(id)
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  usePageTitle(application ? `${application.company} · ${application.position}` : 'Application')

  if (isPending) {
    return <PageSpinner label="Loading application" />
  }

  if (isError) {
    return <ApplicationLoadError error={error} onRetry={() => void refetch()} />
  }

  const salary = formatMoney(application.salaryAmount, application.salaryCurrency)

  return (
    <section className="space-y-6">
      <BackLink to="/applications">All applications</BackLink>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-fg">{application.position}</h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="mt-1 text-fg-muted">{application.company}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpenDialog('status')}>Change status</Button>
          <Link to={`/applications/${application.id}/edit`} className={buttonClasses('secondary')}>
            Edit
          </Link>
          <Button variant="ghost" className="text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50" onClick={() => setOpenDialog('delete')}>
            Delete
          </Button>
        </div>
      </header>

      {application.needsFollowUp && (
        <Alert tone="info">
          No activity in {daysSince(application.lastActivityAt)} days. It may be a good time to follow up with{' '}
          {application.company}.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Details">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Applied on">{formatDate(application.appliedOn)}</Detail>
              <Detail label="Source">{sourceLabels[application.source]}</Detail>
              <Detail label="Location">{application.location ?? 'Not specified'}</Detail>
              <Detail label="Work mode">{workModeLabels[application.workMode]}</Detail>
              <Detail label="Salary offered">{salary ?? 'Not specified'}</Detail>
              <Detail label="Last activity">{formatDaysAgo(application.lastActivityAt)}</Detail>
              <Detail label="Job posting" className="sm:col-span-2">
                {application.jobUrl ? (
                  // rel="noopener noreferrer": the external page cannot control or see this tab.
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-accent hover:underline"
                  >
                    {application.jobUrl}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  'Not specified'
                )}
              </Detail>
            </dl>
          </Card>

          <Card title="Notes">
            {application.notes ? (
              <p className="text-sm whitespace-pre-line text-fg-soft">{application.notes}</p>
            ) : (
              <p className="text-sm text-fg-subtle">No notes yet.</p>
            )}
          </Card>
        </div>

        <Card title="Status history">
          <StatusHistory history={application.statusHistory} />
          <p className="mt-6 text-xs text-fg-subtle">
            Created {formatDateTime(application.createdAt)} · Updated {formatDateTime(application.updatedAt)}
          </p>
        </Card>
      </div>

      {openDialog === 'status' && <ChangeStatusDialog application={application} onClose={() => setOpenDialog(null)} />}
      {openDialog === 'delete' && (
        <DeleteApplicationDialog application={application} onClose={() => setOpenDialog(null)} />
      )}
    </section>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-line">
      <h2 className="mb-4 text-base font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

function Detail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-fg">{children}</dd>
    </div>
  )
}
