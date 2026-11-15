import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './apiClient'

/**
 * Turns an API failure into form feedback.
 * - 400 with per-field errors: each message is attached to its input and null is returned.
 * - Anything else: returns a message to show above the form.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: ReadonlyArray<Path<T>>,
): string | null {
  if (error instanceof ApiError) {
    const unmatched: string[] = []

    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      const name = knownFields.find((known) => known.toLowerCase() === field.toLowerCase())
      if (name) {
        setError(name, { type: 'server', message: messages[0] })
      } else {
        unmatched.push(...messages)
      }
    }

    if (Object.keys(error.fieldErrors).length > 0) {
      return unmatched.length > 0 ? unmatched.join(' ') : null
    }

    if (error.status === 429) {
      return 'Too many attempts. Please wait a minute and try again.'
    }

    return error.message
  }

  return 'Could not reach the server. Check your connection and try again.'
}
