import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/SelectField'
import { controlClasses } from '@/components/ui/fieldStyles'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { hasActiveFilters } from '../listParams'
import {
  applicationSources,
  applicationStatuses,
  sourceLabels,
  statusLabels,
  type ApplicationListParams,
} from '../types'

const statusOptions = applicationStatuses.map((status) => ({ value: status, label: statusLabels[status] }))
const sourceOptions = applicationSources.map((source) => ({ value: source, label: sourceLabels[source] }))

interface ApplicationFiltersProps {
  params: ApplicationListParams
  onChange: (changes: Partial<ApplicationListParams>, options?: { replace?: boolean }) => void
}

export function ApplicationFilters({ params, onChange }: ApplicationFiltersProps) {
  const followUpId = useId()

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 lg:flex-row lg:items-center">
      <SearchBox
        value={params.search}
        // replace: typing should not add one browser-history entry per search.
        onSearch={(search) => onChange({ search }, { replace: true })}
      />

      <div className="grid grid-cols-2 gap-3 lg:flex">
        <SelectField
          label="Status"
          hideLabel
          placeholder="All statuses"
          options={statusOptions}
          value={params.status ?? ''}
          onChange={(event) => onChange({ status: (event.target.value || undefined) as ApplicationListParams['status'] })}
        />
        <SelectField
          label="Source"
          hideLabel
          placeholder="All sources"
          options={sourceOptions}
          value={params.source ?? ''}
          onChange={(event) => onChange({ source: (event.target.value || undefined) as ApplicationListParams['source'] })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <label htmlFor={followUpId} className="flex items-center gap-2 text-sm whitespace-nowrap text-slate-700">
          <input
            id={followUpId}
            type="checkbox"
            className="size-4 rounded border-slate-300 accent-brand-600"
            checked={params.needsFollowUp}
            onChange={(event) => onChange({ needsFollowUp: event.target.checked })}
          />
          Needs follow-up
        </label>

        {hasActiveFilters(params) && (
          <Button
            variant="ghost"
            onClick={() => onChange({ search: '', status: undefined, source: undefined, needsFollowUp: false })}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * The input updates on every keystroke (local state), but the URL — and therefore the API
 * request — only changes 300 ms after the user stops typing.
 */
function SearchBox({ value, onSearch }: { value: string; onSearch: (search: string) => void }) {
  const inputId = useId()
  const [text, setText] = useState(value)
  const debounced = useDebouncedValue(text.trim(), 300)

  // The URL changed from outside (e.g. "Clear filters" or the back button): show its value.
  // Adjusting state during render is React's recommended alternative to a syncing effect.
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== debounced) {
      setText(value)
    }
  }

  // Refs give the effect the latest props without making it re-run on every render.
  const valueRef = useRef(value)
  const onSearchRef = useRef(onSearch)
  useEffect(() => {
    valueRef.current = value
    onSearchRef.current = onSearch
  })

  useEffect(() => {
    if (debounced !== valueRef.current) {
      onSearchRef.current(debounced)
    }
  }, [debounced])

  return (
    <div className="flex-1">
      <label htmlFor={inputId} className="sr-only">
        Search by company or position
      </label>
      <input
        id={inputId}
        type="search"
        placeholder="Search company or position…"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={controlClasses(false)}
      />
    </div>
  )
}
