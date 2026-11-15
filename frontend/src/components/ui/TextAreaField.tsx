import { useId, type Ref, type TextareaHTMLAttributes } from 'react'
import { FieldMessage } from './FieldMessage'
import { controlClasses, describedBy } from './fieldStyles'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
  ref?: Ref<HTMLTextAreaElement>
}

export function TextAreaField({ label, error, hint, className, id, rows = 4, ...props }: TextAreaFieldProps) {
  const generatedId = useId()
  const textAreaId = id ?? generatedId

  return (
    <div className={className}>
      <label htmlFor={textAreaId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={textAreaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textAreaId, error, hint)}
        className={controlClasses(Boolean(error), 'resize-y')}
        {...props}
      />
      <FieldMessage id={textAreaId} error={error} hint={hint} />
    </div>
  )
}
