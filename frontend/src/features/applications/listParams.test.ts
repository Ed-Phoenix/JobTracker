import { describe, expect, it } from 'vitest'
import { defaultListParams, nextSort, parseListParams, toApiQuery, toSearchParams } from './listParams'

describe('listParams', () => {
  it('uses defaults for an empty URL', () => {
    expect(parseListParams(new URLSearchParams())).toEqual(defaultListParams)
  })

  it('ignores invalid values instead of sending them to the API', () => {
    const params = parseListParams(new URLSearchParams('status=Hacked&sortBy=passwordHash&sortDir=up&page=-3'))

    expect(params.status).toBeUndefined()
    expect(params.sortBy).toBe('appliedOn')
    expect(params.sortDir).toBe('desc')
    expect(params.page).toBe(1)
  })

  it('round-trips through the URL, which only contains non-default values', () => {
    const params = { ...defaultListParams, search: 'acme', status: 'Offer' as const, page: 2 }

    const url = toSearchParams(params)

    expect(url.toString()).toBe('search=acme&status=Offer&page=2')
    expect(parseListParams(url)).toEqual(params)
    expect(toSearchParams(defaultListParams).toString()).toBe('')
  })

  it('always sends sort and paging to the API', () => {
    expect(toApiQuery({ ...defaultListParams, needsFollowUp: true })).toBe(
      'sortBy=appliedOn&sortDir=desc&page=1&pageSize=20&needsFollowUp=true',
    )
  })

  it('flips the direction on the active column and picks a natural order for a new one', () => {
    expect(nextSort(defaultListParams, 'appliedOn')).toEqual({ sortBy: 'appliedOn', sortDir: 'asc' })
    expect(nextSort(defaultListParams, 'company')).toEqual({ sortBy: 'company', sortDir: 'asc' })
    expect(nextSort({ ...defaultListParams, sortBy: 'company' }, 'lastActivityAt')).toEqual({
      sortBy: 'lastActivityAt',
      sortDir: 'desc',
    })
  })
})
