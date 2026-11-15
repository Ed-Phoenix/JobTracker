// Types mirror the API's JSON (camelCase, enums as strings).
// Each list of values is declared once "as const", and the union type is derived from it,
// so a <select>, a Zod schema and a type check can never disagree.

export const applicationStatuses = [
  'Applied',
  'HrInterview',
  'TechnicalInterview',
  'TechnicalTest',
  'Offer',
  'Accepted',
  'Rejected',
  'NoResponse',
] as const
export type ApplicationStatus = (typeof applicationStatuses)[number]

export const workModes = ['OnSite', 'Hybrid', 'Remote'] as const
export type WorkMode = (typeof workModes)[number]

export const applicationSources = [
  'LinkedIn',
  'Occ',
  'Indeed',
  'Computrabajo',
  'CompanyWebsite',
  'Referral',
  'Recruiter',
  'Other',
] as const
export type ApplicationSource = (typeof applicationSources)[number]

export const sortFields = ['appliedOn', 'company', 'position', 'status', 'lastActivityAt'] as const
export type SortField = (typeof sortFields)[number]
export type SortDirection = 'asc' | 'desc'

// Record<Union, string> forces a label for every value: adding a status without a label fails to compile.
export const statusLabels: Record<ApplicationStatus, string> = {
  Applied: 'Applied',
  HrInterview: 'HR interview',
  TechnicalInterview: 'Technical interview',
  TechnicalTest: 'Technical test',
  Offer: 'Offer',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
  NoResponse: 'No response',
}

export const workModeLabels: Record<WorkMode, string> = {
  OnSite: 'On-site',
  Hybrid: 'Hybrid',
  Remote: 'Remote',
}

export const sourceLabels: Record<ApplicationSource, string> = {
  LinkedIn: 'LinkedIn',
  Occ: 'OCC Mundial',
  Indeed: 'Indeed',
  Computrabajo: 'Computrabajo',
  CompanyWebsite: 'Company website',
  Referral: 'Referral',
  Recruiter: 'Recruiter',
  Other: 'Other',
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface ApplicationSummary {
  id: string
  company: string
  position: string
  location: string | null
  workMode: WorkMode
  salaryAmount: number | null
  salaryCurrency: string
  /** Date only, "YYYY-MM-DD". */
  appliedOn: string
  source: ApplicationSource
  status: ApplicationStatus
  /** ISO timestamp. */
  lastActivityAt: string
  needsFollowUp: boolean
}

export interface StatusChange {
  id: string
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus
  note: string | null
  changedAt: string
}

export interface ApplicationDetail extends ApplicationSummary {
  jobUrl: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  /** Newest first. */
  statusHistory: StatusChange[]
}

export interface SaveApplicationRequest {
  company: string
  position: string
  jobUrl: string | null
  location: string | null
  workMode: WorkMode
  salaryAmount: number | null
  salaryCurrency: string
  appliedOn: string
  source: ApplicationSource
  notes: string | null
}

export interface ChangeStatusRequest {
  status: ApplicationStatus
  note: string | null
}

export interface ApplicationListParams {
  search: string
  status?: ApplicationStatus
  source?: ApplicationSource
  needsFollowUp: boolean
  sortBy: SortField
  sortDir: SortDirection
  page: number
  pageSize: number
}
