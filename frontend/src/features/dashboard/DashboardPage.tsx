import { Link } from 'react-router'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { statusLabels, type ApplicationStatus } from '@/features/applications/types'
import { useAuth } from '@/features/auth/AuthContext'
import { usePageTitle } from '@/lib/usePageTitle'
import { useDashboardSummary } from './api'
import { ChartCard } from './components/ChartCard'
import { FollowUpList } from './components/FollowUpList'
import { StatTile } from './components/StatTile'
import { StatusChart } from './components/StatusChart'
import { WeeklyChart } from './components/WeeklyChart'
import { formatWeek } from './formatWeek'

const OPEN_STATUSES: ApplicationStatus[] = ['Applied', 'HrInterview', 'TechnicalInterview', 'TechnicalTest', 'Offer']

const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })
const integer = new Intl.NumberFormat('en-US')

export function DashboardPage() {
  usePageTitle('Dashboard')
  const { user } = useAuth()
  const { data, isPending, isError, error, refetch } = useDashboardSummary()
  const firstName = user?.fullName.split(' ')[0]

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {firstName ? `Hi ${firstName}, here` : 'Here'} is how your job search is going.
          </p>
        </div>
        <Link to="/applications/new" className={buttonClasses('primary')}>
          New application
        </Link>
      </div>

      {isPending ? (
        <SkeletonRows rows={4} label="Loading your dashboard" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Could not load your dashboard" />
      ) : data.total === 0 ? (
        <EmptyState
          title="Your dashboard is waiting for data"
          description="Add the jobs you apply to and this page will show your response rate, weekly pace and follow-ups."
          action={
            <Link to="/applications/new" className={buttonClasses('primary')}>
              Add your first application
            </Link>
          }
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile label="Total applications" value={integer.format(data.total)} />
            <StatTile
              label="Response rate"
              value={percent.format(data.responseRate)}
              detail="Got an answer beyond “applied”"
            />
            <StatTile
              label="Active processes"
              value={integer.format(data.byStatus.filter((s) => OPEN_STATUSES.includes(s.status)).reduce((sum, s) => sum + s.count, 0))}
              detail="Not accepted, rejected or ghosted"
            />
            <StatTile
              label="Need a follow-up"
              value={integer.format(data.needsFollowUpCount)}
              detail={
                data.needsFollowUpCount > 0 ? (
                  <Link to="/applications?needsFollowUp=true" className="font-medium text-accent hover:underline">
                    Review them
                  </Link>
                ) : (
                  'All caught up'
                )
              }
            />
          </dl>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Applications per week"
              description="How many jobs you applied to in each of the last 12 weeks."
              table={{
                columns: ['Week of', 'Applications'],
                rows: data.perWeek.map((week) => [formatWeek(week.weekStart), week.count]),
              }}
            >
              <WeeklyChart data={data.perWeek} />
            </ChartCard>
            <ChartCard
              title="Where your applications stand"
              description="Current status of every application, in the order of the hiring process."
              table={{
                columns: ['Status', 'Applications'],
                rows: data.byStatus.map((entry) => [statusLabels[entry.status], entry.count]),
              }}
            >
              <StatusChart data={data.byStatus} />
            </ChartCard>
          </div>

          <FollowUpList total={data.needsFollowUpCount} />
        </>
      )}
    </section>
  )
}
