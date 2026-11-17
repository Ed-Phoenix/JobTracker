import { useId, type Ref, type SelectHTMLAttributes } from 'react'
import { FieldMessage } from './FieldMessage'
import { controlClasses, describedBy } from './fieldStyles'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  /** First, empty option ("Choose…" or "All statuses"). */
  placeholder?: string
  error?: string
  hint?: string
  /** Hides the label visually but keeps it for screen readers (compact filter bars). */
  hideLabel?: boolean
  ref?: Ref<HTMLSelectElement>
}

/** A native <select>: keyboard and screen-reader support come for free. */
export function SelectField({
  label,
  options,
  placeholder,
  error,
  hint,
  hideLabel = false,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className={className}>
      <label
        htmlFor={selectId}
        className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-fg-soft'}
      >
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(selectId, error, hint)}
        className={controlClasses(Boolean(error), 'pr-8')}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessage id={selectId} error={error} hint={hint} />
    </div>
  )
}
