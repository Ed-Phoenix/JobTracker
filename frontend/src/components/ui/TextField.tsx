import { useId, type InputHTMLAttributes, type Ref } from 'react'
import { cn } from '@/lib/cn'

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
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-xs',
          'placeholder:text-slate-400',
          error ? 'border-red-500' : 'border-slate-300',
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1.5 text-sm text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
