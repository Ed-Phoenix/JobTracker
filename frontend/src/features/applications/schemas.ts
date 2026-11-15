import { z } from 'zod'
import { todayIso } from '@/lib/format'
import {
  applicationSources,
  workModes,
  type ApplicationDetail,
  type SaveApplicationRequest,
} from './types'

// The form works with strings (that is what inputs hold). Converting to the API's shape
// (numbers, nulls) happens in toRequest(), which keeps the schema simple and its types plain.

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Latest date the API accepts: tomorrow, to tolerate time-zone differences with the server. */
function latestAllowedDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return todayIso(tomorrow)
}

export const applicationFormSchema = z.object({
  company: z.string().trim().min(1, 'Enter the company.').max(200, 'Use 200 characters or fewer.'),
  position: z.string().trim().min(1, 'Enter the position.').max(200, 'Use 200 characters or fewer.'),
  jobUrl: z
    .string()
    .trim()
    .max(2048, 'The link is too long.')
    .refine((value) => value === '' || isHttpUrl(value), 'Enter a full link starting with http:// or https://.'),
  location: z.string().trim().max(200, 'Use 200 characters or fewer.'),
  workMode: z.enum(workModes, { error: 'Choose a work mode.' }),
  source: z.enum(applicationSources, { error: 'Choose where you found it.' }),
  appliedOn: z
    .string()
    .min(1, 'Choose the date you applied.')
    .refine((value) => value >= '2000-01-01', 'Choose a date after the year 2000.')
    .refine((value) => value <= latestAllowedDate(), 'The date cannot be in the future.'),
  salaryAmount: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{1,10}(\.\d{1,2})?$/.test(value), 'Enter an amount like 18000 or 18000.50.'),
  salaryCurrency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter code such as MXN or USD.'),
  notes: z.string().max(4000, 'Use 4000 characters or fewer.'),
})

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>

/** Field names, for mapping API validation errors onto inputs. */
export const applicationFormFields = Object.keys(applicationFormSchema.shape) as Array<keyof ApplicationFormValues>

export function emptyFormValues(): Partial<ApplicationFormValues> {
  return {
    company: '',
    position: '',
    jobUrl: '',
    location: '',
    appliedOn: todayIso(),
    salaryAmount: '',
    salaryCurrency: 'MXN',
    notes: '',
  }
}

export function toFormValues(application: ApplicationDetail): ApplicationFormValues {
  return {
    company: application.company,
    position: application.position,
    jobUrl: application.jobUrl ?? '',
    location: application.location ?? '',
    workMode: application.workMode,
    source: application.source,
    appliedOn: application.appliedOn,
    salaryAmount: application.salaryAmount === null ? '' : String(application.salaryAmount),
    salaryCurrency: application.salaryCurrency,
    notes: application.notes ?? '',
  }
}

const nullIfEmpty = (value: string) => (value.trim() === '' ? null : value.trim())

export function toRequest(values: ApplicationFormValues): SaveApplicationRequest {
  return {
    company: values.company.trim(),
    position: values.position.trim(),
    jobUrl: nullIfEmpty(values.jobUrl),
    location: nullIfEmpty(values.location),
    workMode: values.workMode,
    source: values.source,
    appliedOn: values.appliedOn,
    salaryAmount: values.salaryAmount.trim() === '' ? null : Number(values.salaryAmount),
    salaryCurrency: values.salaryCurrency.trim().toUpperCase(),
    notes: nullIfEmpty(values.notes),
  }
}
