import type { ApplicationStatus } from '@/features/applications/types'

export interface StatusCount {
  status: ApplicationStatus
  count: number
}

export interface WeekCount {
  /** Monday of the week, "YYYY-MM-DD". */
  weekStart: string
  count: number
}

/** Mirrors GET /api/dashboard/summary. */
export interface DashboardSummary {
  total: number
  /** Fraction between 0 and 1. */
  responseRate: number
  /** Every status, in pipeline order, including zeros. */
  byStatus: StatusCount[]
  /** The last 12 weeks, oldest first, including zeros. */
  perWeek: WeekCount[]
  needsFollowUpCount: number
}
