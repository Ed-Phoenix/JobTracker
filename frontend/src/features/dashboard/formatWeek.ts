import { parseDateOnly } from '@/lib/format'

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

/** "2026-08-24" -> "Aug 24" (the Monday that starts the week). */
export function formatWeek(weekStart: string): string {
  return shortDate.format(parseDateOnly(weekStart))
}
