import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '@/components/toast/ToastContext'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ApiError } from '@/lib/apiClient'
import { useDeleteApplication } from '../api'
import type { ApplicationDetail } from '../types'

interface DeleteApplicationDialogProps {
  application: ApplicationDetail
  onClose: () => void
}

/** Deleting cannot be undone, so it always asks first and names exactly what will be removed. */
export function DeleteApplicationDialog({ application, onClose }: DeleteApplicationDialogProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const deleteApplication = useDeleteApplication(application.id)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteApplication.mutateAsync()
      toast(`Application to ${application.company} deleted`)
      navigate('/applications', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server. Try again.')
    }
  }

  return (
    <Dialog
      title="Delete this application?"
      description={
        <>
          The application to <strong className="font-medium text-fg">{application.company}</strong> and its
          status history will be removed. This cannot be undone.
        </>
      }
      onClose={onClose}
    >
      {error && <Alert className="mb-4">{error}</Alert>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {/* Cancel comes first in the DOM, so it receives the initial focus: the safe choice. */}
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={deleteApplication.isPending} onClick={handleDelete}>
          Delete application
        </Button>
      </div>
    </Dialog>
  )
}
