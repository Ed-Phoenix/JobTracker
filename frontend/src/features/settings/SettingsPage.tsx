import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useToast } from '@/components/toast/ToastContext'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { applicationKeys } from '@/features/applications/api'
import { authApi } from '@/features/auth/api'
import { useAuth } from '@/features/auth/AuthContext'
import { dashboardKeys } from '@/features/dashboard/queryKeys'
import { applyServerErrors } from '@/lib/forms'
import { usePageTitle } from '@/lib/usePageTitle'

const settingsSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name.').max(200, 'Use 200 characters or fewer.'),
  // valueAsNumber turns an empty input into NaN, which z.number() rejects with this message.
  followUpDays: z
    .number({ error: 'Enter a number of days.' })
    .int('Use whole days.')
    .min(1, 'Use at least 1 day.')
    .max(90, 'Use 90 days or fewer.'),
})

type SettingsValues = z.infer<typeof settingsSchema>

export function SettingsPage() {
  usePageTitle('Settings')
  const { user, setUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { fullName: user?.fullName ?? '', followUpDays: user?.followUpDays ?? 7 },
  })

  const updateProfile = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updated) => {
      setUser(updated)
      // The follow-up threshold changes which applications are flagged: refresh every list and the dashboard.
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })

  const onSubmit = async (values: SettingsValues) => {
    setFormError(null)
    try {
      const updated = await updateProfile.mutateAsync(values)
      // The saved values become the new baseline, so "isDirty" goes back to false.
      reset({ fullName: updated.fullName, followUpDays: updated.followUpDays })
      toast('Settings saved')
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['fullName', 'followUpDays']))
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Your profile and how JobTracker reminds you to follow up.</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 rounded-2xl bg-white p-6 ring-1 ring-slate-200"
      >
        {formError && <Alert>{formError}</Alert>}

        <TextField label="Email" value={user?.email ?? ''} readOnly disabled hint="Your email cannot be changed." />
        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <TextField
          label="Follow-up reminder (days)"
          type="number"
          inputMode="numeric"
          min={1}
          max={90}
          hint="Open applications with no activity for this many days are flagged for a follow-up."
          error={errors.followUpDays?.message}
          {...register('followUpDays', { valueAsNumber: true })}
        />

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save settings
          </Button>
        </div>
      </form>
    </section>
  )
}
