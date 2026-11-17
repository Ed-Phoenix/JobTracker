import { cn } from '@/lib/cn'
import { themePreferences, useTheme, type ThemePreference } from '@/lib/theme'

const labels: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' }

/**
 * One button that cycles System -> Light -> Dark. The accessible name says the current
 * theme and what a click does, because an icon alone tells a screen reader nothing.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const next = themePreferences[(themePreferences.indexOf(preference) + 1) % themePreferences.length]

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Theme: ${labels[preference]}. Switch to ${labels[next]}`}
      title={`Theme: ${labels[preference]}`}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-muted hover:text-fg',
        className,
      )}
    >
      <ThemeIcon preference={preference} />
    </button>
  )
}

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  const common = {
    className: 'size-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (preference === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  }

  if (preference === 'dark') {
    return (
      <svg {...common}>
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}
