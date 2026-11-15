import { useEffect, useState } from 'react'

/**
 * Returns `value`, but only after it stopped changing for `delayMs`.
 * Used for search: typing "acme" sends one request instead of four.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    // Each keystroke cancels the previous timer.
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
