import { useCallback, useEffect, useState } from 'react'

export const themePreferences = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof themePreferences)[number]

const storageKey = 'theme'
const darkQuery = '(prefers-color-scheme: dark)'

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey)
    return themePreferences.find((preference) => preference === stored) ?? 'system'
  } catch {
    return 'system'
  }
}

function prefersDark(): boolean {
  return window.matchMedia?.(darkQuery).matches ?? false
}

/** Same rule as public/theme.js, which runs before React for the first paint. */
export function applyTheme(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * The user's choice (Light, Dark or System), saved in localStorage. With "System" the page also
 * follows the OS while it is open, e.g. when the computer switches to dark mode at sunset.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference)

  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system' || !window.matchMedia) return

    const media = window.matchMedia(darkQuery)
    const follow = () => applyTheme('system')
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // Not saved, but it still applies for this visit.
    }
    setPreferenceState(next)
  }, [])

  return { preference, setPreference }
}
