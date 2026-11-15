// Formatting helpers. The UI is in English, so the locale is fixed to en-US;
// a fixed locale also keeps tests deterministic on any machine.

const MS_PER_DAY = 86_400_000

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * Parses a date-only value ("2026-09-05") as a local date.
 * new Date("2026-09-05") would mean UTC midnight, which in Mexico (UTC-6) is still
 * September 4th: the classic off-by-one-day bug.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** "2026-09-05" -> "Sep 5, 2026" */
export function formatDate(value: string): string {
  return dateFormatter.format(parseDateOnly(value))
}

/** ISO timestamp -> "Sep 5, 2026, 3:42 PM" (in the user's time zone). */
export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}

/** Today as "YYYY-MM-DD" in the user's time zone (the format of <input type="date">). */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function daysSince(isoTimestamp: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(isoTimestamp).getTime()) / MS_PER_DAY))
}

/** "Today", "Yesterday", "12 days ago". */
export function formatDaysAgo(isoTimestamp: string, now: Date = new Date()): string {
  const days = daysSince(isoTimestamp, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

/** 18000, "MXN" -> "MX$18,000". Returns null when there is no amount. */
export function formatMoney(amount: number | null, currency: string): string | null {
  if (amount === null) {
    return null
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // Unknown currency code: fall back to plain text instead of crashing the page.
    return `${amount.toLocaleString('en-US')} ${currency}`
  }
}
