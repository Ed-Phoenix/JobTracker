import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { applicationStatuses } from '@/features/applications/types'
import { makeDashboardSummary, makeSummary, paged } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import { server } from '@/test/server'

const counts = [8, 3, 3, 0, 2, 0, 5, 4] // in pipeline order: Applied ... NoResponse

const summary = makeDashboardSummary({
  total: 25,
  responseRate: 0.52,
  needsFollowUpCount: 12,
  byStatus: applicationStatuses.map((status, index) => ({ status, count: counts[index] })),
  perWeek: makeDashboardSummary().perWeek.map((week, index) => ({ ...week, count: index === 11 ? 4 : 1 })),
})

describe('dashboard', () => {
  it('shows the headline numbers', async () => {
    server.use(http.get('*/api/dashboard/summary', () => HttpResponse.json(summary)))
    renderApp('/', { authenticated: true })

    // dt/dd pairs: each value is announced together with its label.
    expect(await screen.findByText('Total applications')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('52%')).toBeInTheDocument()
    // Active = Applied + HR + Technical interview + Technical test + Offer = 8 + 3 + 3 + 0 + 2.
    expect(screen.getByText('16')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review them' })).toHaveAttribute('href', '/applications?needsFollowUp=true')
  })

  it('offers every chart as a table with the exact values', async () => {
    server.use(http.get('*/api/dashboard/summary', () => HttpResponse.json(summary)))
    renderApp('/', { authenticated: true })

    const statusTable = await screen.findByRole('table', { name: 'Where your applications stand' })
    const rows = within(statusTable).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual([
      'Applied8',
      'HR interview3',
      'Technical interview3',
      'Technical test0',
      'Offer2',
      'Accepted0',
      'Rejected5',
      'No response4',
    ])

    const weeklyTable = screen.getByRole('table', { name: 'Applications per week' })
    expect(within(weeklyTable).getAllByRole('row')).toHaveLength(13) // header + 12 weeks
  })

  it('lists the applications waiting longest for a follow-up', async () => {
    let query: URLSearchParams | undefined
    server.use(
      http.get('*/api/dashboard/summary', () => HttpResponse.json(summary)),
      http.get('*/api/applications', ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json(paged([makeSummary({ id: 'f1', company: 'Pixelnorte', needsFollowUp: true })]))
      }),
    )
    renderApp('/', { authenticated: true })

    expect(await screen.findByRole('link', { name: /Pixelnorte/ })).toHaveAttribute('href', '/applications/f1')
    expect(screen.getByRole('link', { name: 'View all 12' })).toBeInTheDocument()
    expect(query?.get('needsFollowUp')).toBe('true')
    expect(query?.get('sortBy')).toBe('lastActivityAt')
    expect(query?.get('sortDir')).toBe('asc')
    expect(query?.get('pageSize')).toBe('5')
  })

  it('guides a new user to add the first application', async () => {
    renderApp('/', { authenticated: true })

    expect(await screen.findByRole('heading', { name: 'Your dashboard is waiting for data' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add your first application' })).toHaveAttribute('href', '/applications/new')
  })

  it('shows an error with a retry when the summary fails', async () => {
    let calls = 0
    server.use(
      http.get('*/api/dashboard/summary', () => {
        calls++
        return calls === 1
          ? HttpResponse.json({ status: 500 }, { status: 500 })
          : HttpResponse.json(summary)
      }),
    )
    const { user } = renderApp('/', { authenticated: true })

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Total applications')).toBeInTheDocument()
  })
})
