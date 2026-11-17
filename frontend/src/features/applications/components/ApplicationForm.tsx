import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { SelectField } from '@/components/ui/SelectField'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import { applyServerErrors } from '@/lib/forms'
import {
  applicationFormFields,
  applicationFormSchema,
  toRequest,
  type ApplicationFormValues,
} from '../schemas'
import {
  applicationSources,
  sourceLabels,
  workModeLabels,
  workModes,
  type SaveApplicationRequest,
} from '../types'

const workModeOptions = workModes.map((mode) => ({ value: mode, label: workModeLabels[mode] }))
const sourceOptions = applicationSources.map((source) => ({ value: source, label: sourceLabels[source] }))

interface ApplicationFormProps {
  defaultValues: Partial<ApplicationFormValues>
  submitLabel: string
  cancelTo: string
  /** The page decides what to do (create or update, then navigate). Errors bubble back here. */
  onSubmit: (request: SaveApplicationRequest) => Promise<unknown>
}

/** Shared by the "new" and "edit" pages: same fields, same validation, different action. */
export function ApplicationForm({ defaultValues, submitLabel, cancelTo, onSubmit }: ApplicationFormProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues>({ resolver: zodResolver(applicationFormSchema), defaultValues })

  const submit = async (values: ApplicationFormValues) => {
    setFormError(null)
    try {
      await onSubmit(toRequest(values))
    } catch (error) {
      setFormError(applyServerErrors(error, setError, applicationFormFields))
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className="space-y-6 rounded-2xl bg-surface p-6 ring-1 ring-line"
    >
      {formError && <Alert>{formError}</Alert>}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-fg">The job</legend>
        <TextField label="Company" autoComplete="organization" error={errors.company?.message} {...register('company')} />
        <TextField label="Position" error={errors.position?.message} {...register('position')} />
        <TextField
          label="Job posting link"
          type="url"
          inputMode="url"
          placeholder="https://"
          className="sm:col-span-2"
          error={errors.jobUrl?.message}
          {...register('jobUrl')}
        />
        <TextField label="Location" placeholder="e.g. Monterrey" error={errors.location?.message} {...register('location')} />
        <SelectField
          label="Work mode"
          placeholder="Choose…"
          options={workModeOptions}
          error={errors.workMode?.message}
          {...register('workMode')}
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-fg">Your application</legend>
        <TextField label="Applied on" type="date" error={errors.appliedOn?.message} {...register('appliedOn')} />
        <SelectField
          label="Source"
          placeholder="Choose…"
          options={sourceOptions}
          error={errors.source?.message}
          {...register('source')}
        />
        <TextField
          label="Salary offered"
          inputMode="decimal"
          placeholder="Optional, e.g. 18000"
          hint="Monthly gross amount."
          error={errors.salaryAmount?.message}
          {...register('salaryAmount')}
        />
        <TextField
          label="Currency"
          maxLength={3}
          className="sm:max-w-32"
          error={errors.salaryCurrency?.message}
          {...register('salaryCurrency')}
        />
        <TextAreaField
          label="Notes"
          className="sm:col-span-2"
          placeholder="Contacts, interview prep, anything worth remembering…"
          error={errors.notes?.message}
          {...register('notes')}
        />
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-line-soft pt-6 sm:flex-row sm:justify-end">
        <Link to={cancelTo} className={buttonClasses('secondary')}>
          Cancel
        </Link>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
