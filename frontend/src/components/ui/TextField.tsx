import { useId, type InputHTMLAttributes, type Ref } from 'react'
import { FieldMessage } from './FieldMessage'
import { controlClasses, describedBy } from './fieldStyles'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  /** React 19 passes ref as a normal prop; React Hook Form's register() provides it. */
  ref?: Ref<HTMLInputElement>
}

/**
 * Labelled input with accessible error reporting:
 * the label is linked by id, and the error is linked with aria-describedby
 * so screen readers read it together with the field.
 */
export function TextField({ label, error, hint, className, id, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg-soft">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        className={controlClasses(Boolean(error))}
        {...props}
      />
      <FieldMessage id={inputId} error={error} hint={hint} />
    </div>
  )
}
