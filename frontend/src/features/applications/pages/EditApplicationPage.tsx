import { useNavigate, useParams } from 'react-router'
import { useToast } from '@/components/toast/ToastContext'
import { PageSpinner } from '@/components/ui/Spinner'
import { usePageTitle } from '@/lib/usePageTitle'
import { useApplication, useUpdateApplication } from '../api'
import { ApplicationForm } from '../components/ApplicationForm'
import { ApplicationLoadError } from '../components/ApplicationLoadError'
import { BackLink } from '../components/BackLink'
import { toFormValues } from '../schemas'
import type { SaveApplicationRequest } from '../types'

export function EditApplicationPage() {
  usePageTitle('Edit application')
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const application = useApplication(id)
  const updateApplication = useUpdateApplication(id)

  if (application.isPending) {
    return <PageSpinner label="Loading application" />
  }

  if (application.isError) {
    return <ApplicationLoadError error={application.error} onRetry={() => void application.refetch()} />
  }

  const handleSubmit = async (request: SaveApplicationRequest) => {
    await updateApplication.mutateAsync(request)
    toast('Changes saved')
    navigate(`/applications/${id}`)
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <BackLink to={`/applications/${id}`}>Back to application</BackLink>
      <h1 className="text-2xl font-semibold text-slate-900">Edit application</h1>
      <ApplicationForm
        // The form reads defaultValues once; the key remounts it if another application is opened.
        key={application.data.id}
        defaultValues={toFormValues(application.data)}
        submitLabel="Save changes"
        cancelTo={`/applications/${id}`}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
