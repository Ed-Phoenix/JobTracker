import { useNavigate } from 'react-router'
import { useToast } from '@/components/toast/ToastContext'
import { usePageTitle } from '@/lib/usePageTitle'
import { useCreateApplication } from '../api'
import { ApplicationForm } from '../components/ApplicationForm'
import { BackLink } from '../components/BackLink'
import { emptyFormValues } from '../schemas'
import type { SaveApplicationRequest } from '../types'

export function NewApplicationPage() {
  usePageTitle('New application')
  const navigate = useNavigate()
  const toast = useToast()
  const createApplication = useCreateApplication()

  const handleSubmit = async (request: SaveApplicationRequest) => {
    const created = await createApplication.mutateAsync(request)
    toast(`Application to ${created.company} added`)
    navigate(`/applications/${created.id}`)
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <BackLink to="/applications">All applications</BackLink>
      <h1 className="text-2xl font-semibold text-slate-900">New application</h1>
      <ApplicationForm
        defaultValues={emptyFormValues()}
        submitLabel="Save application"
        cancelTo="/applications"
        onSubmit={handleSubmit}
      />
    </section>
  )
}
