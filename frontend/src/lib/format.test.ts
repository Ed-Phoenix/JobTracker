import { describe, expect, it } from 'vitest'
import { formatDate, formatDaysAgo, formatMoney, parseDateOnly, todayIso } from './format'

describe('format', () => {
  it('parses date-only values as local dates (no off-by-one day in negative UTC offsets)', () => {
    const date = parseDateOnly('2026-09-05')

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
    expect(date.getDate()).toBe(5)
    expect(formatDate('2026-09-05')).toBe('Sep 5, 2026')
  })

  it('formats today as YYYY-MM-DD with zero padding', () => {
    expect(todayIso(new Date(2026, 0, 7, 23, 30))).toBe('2026-01-07')
  })

  it('describes elapsed days in words', () => {
    const now = new Date('2026-11-14T12:00:00Z')

    expect(formatDaysAgo('2026-11-14T08:00:00Z', now)).toBe('Today')
    expect(formatDaysAgo('2026-11-13T08:00:00Z', now)).toBe('Yesterday')
    expect(formatDaysAgo('2026-11-02T08:00:00Z', now)).toBe('12 days ago')
  })

  it('formats money without decimals and survives unknown currency codes', () => {
    expect(formatMoney(18000, 'MXN')).toBe('MX$18,000')
    expect(formatMoney(2500, 'USD')).toBe('$2,500')
    expect(formatMoney(null, 'MXN')).toBeNull()
    expect(formatMoney(100, 'ZZZ1')).toBe('100 ZZZ1')
  })
})
