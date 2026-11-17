import { useState, type FormEvent } from 'react'
import { useToast } from '@/components/toast/ToastContext'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField } from '@/components/ui/SelectField'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { ApiError } from '@/lib/apiClient'
import { useChangeStatus } from '../api'
import { applicationStatuses, statusLabels, type ApplicationDetail, type ApplicationStatus } from '../types'

interface ChangeStatusDialogProps {
  application: ApplicationDetail
  onClose: () => void
}

export function ChangeStatusDialog({ application, onClose }: ChangeStatusDialogProps) {
  const toast = useToast()
  const changeStatus = useChangeStatus(application.id)
  const [status, setStatus] = useState<ApplicationStatus | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Mirror the domain rules so the user only sees valid choices. The API still enforces them (409).
  const options = applicationStatuses
    .filter((candidate) => candidate !== application.status)
    .filter((candidate) => candidate !== 'Accepted' || application.status === 'Offer')
    .map((candidate) => ({ value: candidate, label: statusLabels[candidate] }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!status) {
      setError('Choose the new status.')
      return
    }

    setError(null)
    try {
      await changeStatus.mutateAsync({ status, note: note.trim() || null })
      toast(`Status changed to ${statusLabels[status]}`)
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server. Try again.')
    }
  }

  return (
    <Dialog
      title="Change status"
      description={
        <>
          {application.position} at {application.company}. Currently{' '}
          <strong className="font-medium text-fg">{statusLabels[application.status]}</strong>.
        </>
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <SelectField
          label="New status"
          placeholder="Choose…"
          options={options}
          value={status}
          onChange={(event) => setStatus(event.target.value as ApplicationStatus | '')}
        />
        <TextAreaField
          label="Note (optional)"
          rows={3}
          maxLength={1000}
          placeholder="e.g. Interview scheduled for Monday at 10:00"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={changeStatus.isPending}>
            Save status
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
