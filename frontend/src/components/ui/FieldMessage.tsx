interface FieldMessageProps {
  id: string
  error?: string
  hint?: string
}

/** Error (red) or hint (grey) under a form control. Its id is referenced by aria-describedby. */
export function FieldMessage({ id, error, hint }: FieldMessageProps) {
  if (error) {
    return (
      <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
        {error}
      </p>
    )
  }

  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-500">
        {hint}
      </p>
    )
  }

  return null
}
