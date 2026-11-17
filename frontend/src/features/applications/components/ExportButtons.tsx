import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/toast/ToastContext'
import { api } from '@/lib/apiClient'
import { saveFile } from '@/lib/saveFile'
import { toExportQuery, type ExportFormat } from '../listParams'
import type { ApplicationListParams } from '../types'

const formats: { format: ExportFormat; label: string }[] = [
  { format: 'csv', label: 'CSV' },
  { format: 'xlsx', label: 'Excel' },
]

/** Downloads what the list shows (same search, filters and order), every page at once. */
export function ExportButtons({ params, disabled }: { params: ApplicationListParams; disabled?: boolean }) {
  const toast = useToast()

  // A mutation, not a query: it is an action the user triggers, and the file must not be cached.
  const download = useMutation({
    mutationFn: (format: ExportFormat) => api.download(`/applications/export?${toExportQuery(params, format)}`),
    onSuccess: ({ blob, fileName }) => saveFile(blob, fileName),
    onError: () => toast('Could not export your applications. Please try again.', 'error'),
  })

  return (
    <div role="group" aria-label="Export applications" className="flex gap-2">
      {formats.map(({ format, label }) => (
        <Button
          key={format}
          variant="secondary"
          disabled={disabled || download.isPending}
          loading={download.isPending && download.variables === format}
          onClick={() => download.mutate(format)}
        >
          Export {label}
        </Button>
      ))}
    </div>
  )
}
