import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { makeDetail, makeSummary, paged } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import { server } from '@/test/server'
import type { ApplicationDetail, ApplicationSummary, PagedResult } from './types'

/** Mocks the list endpoint and records the query string of every request it receives. */
function mockList(respond: (url: URL) => PagedResult<ApplicationSummary>) {
  const requests: URLSearchParams[] = []
  server.use(
    http.get('*/api/applications', ({ request }) => {
      const url = new URL(request.url)
      requests.push(url.searchParams)
      return HttpResponse.json(respond(url))
    }),
  )
  return requests
}

const acme = makeSummary({ id: 'a1', company: 'Acme', position: 'Backend Developer' })
const globex = makeSummary({ id: 'a2', company: 'Globex', position: 'QA Engineer', status: 'HrInterview', needsFollowUp: true })

describe('applications list', () => {
  it('shows the applications returned by the API', async () => {
    mockList(() => paged([acme, globex]))
    renderApp('/applications', { authenticated: true })

    const table = await screen.findByRole('table')
    expect(within(table).getByRole('link', { name: 'Acme' })).toHaveAttribute('href', '/applications/a1')
    expect(within(table).getByText('HR interview')).toBeInTheDocument()
    expect(within(table).getByText('Follow up')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1–2 of 2')
  })

  it('filters by status through the URL and sends the filter to the API', async () => {
    const requests = mockList(() => paged([acme]))
    const { user, router } = renderApp('/applications?page=2', { authenticated: true })
    await screen.findByRole('table')

    await user.selectOptions(screen.getByLabelText('Status'), 'Offer')

    await waitFor(() => expect(router.state.location.search).toBe('?status=Offer'))
    // Changing a filter resets to page 1.
    await waitFor(() => expect(requests.at(-1)?.get('status')).toBe('Offer'))
    expect(requests.at(-1)?.get('page')).toBe('1')
  })

  it('debounces the search box: one request after typing stops', async () => {
    const requests = mockList(() => paged([acme]))
    const { user, router } = renderApp('/applications', { authenticated: true })
    await screen.findByRole('table')
    const before = requests.length

    await user.type(screen.getByLabelText('Search by company or position'), 'acme')

    await waitFor(() => expect(router.state.location.search).toBe('?search=acme'))
    await waitFor(() => expect(requests.at(-1)?.get('search')).toBe('acme'))
    expect(requests.length).toBe(before + 1)
  })

  it('sorts when a column header is clicked and marks the column with aria-sort', async () => {
    const requests = mockList(() => paged([acme, globex]))
    const { user } = renderApp('/applications', { authenticated: true })
    const table = await screen.findByRole('table')

    await user.click(within(table).getByRole('button', { name: /company/i }))

    await waitFor(() => expect(requests.at(-1)?.get('sortBy')).toBe('company'))
    expect(requests.at(-1)?.get('sortDir')).toBe('asc')
    expect(within(await screen.findByRole('table')).getByRole('columnheader', { name: /company/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  it('requests the next page', async () => {
    const requests = mockList((url) =>
      paged([url.searchParams.get('page') === '2' ? globex : acme], { page: Number(url.searchParams.get('page')), totalCount: 21, totalPages: 2 }),
    )
    const { user } = renderApp('/applications', { authenticated: true })
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('link', { name: 'Globex' }, { timeout: 2000 })).toBeInTheDocument()
    expect(requests.at(-1)?.get('page')).toBe('2')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('invites the user to add the first application when there are none', async () => {
    mockList(() => paged([]))
    renderApp('/applications', { authenticated: true })

    expect(await screen.findByRole('heading', { name: 'No applications yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add your first application' })).toHaveAttribute('href', '/applications/new')
  })

  it('offers to clear the filters when nothing matches', async () => {
    mockList((url) => paged(url.searchParams.get('status') ? [] : [acme]))
    const { user, router } = renderApp('/applications?status=Offer', { authenticated: true })

    expect(await screen.findByRole('heading', { name: 'No applications match your filters' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])

    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('shows an error with a retry button when the API fails', async () => {
    let calls = 0
    mockList(() => {
      calls++
      if (calls === 1) throw new Error('boom')
      return paged([acme])
    })
    const { user } = renderApp('/applications', { authenticated: true })

    expect(await screen.findByRole('heading', { name: 'Could not load your applications' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
})

describe('creating an application', () => {
  it('validates required fields before calling the API', async () => {
    let posted = false
    server.use(http.post('*/api/applications', () => {
      posted = true
      return HttpResponse.json({})
    }))
    const { user } = renderApp('/applications/new', { authenticated: true })

    await user.click(await screen.findByRole('button', { name: 'Save application' }))

    expect(await screen.findByText('Enter the company.')).toBeInTheDocument()
    expect(screen.getByText('Choose a work mode.')).toBeInTheDocument()
    expect(screen.getByText('Choose where you found it.')).toBeInTheDocument()
    expect(posted).toBe(false)
  })

  it('sends the converted request, shows a confirmation and opens the new application', async () => {
    let body: unknown
    const created = makeDetail({ id: 'new-1', company: 'Initech', position: 'Junior .NET Developer' })
    server.use(
      http.post('*/api/applications', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(created, { status: 201 })
      }),
      http.get('*/api/applications/new-1', () => HttpResponse.json(created)),
    )
    const { user, router } = renderApp('/applications/new', { authenticated: true })

    await user.type(await screen.findByLabelText('Company'), 'Initech')
    await user.type(screen.getByLabelText('Position'), 'Junior .NET Developer')
    await user.selectOptions(screen.getByLabelText('Work mode'), 'Remote')
    await user.selectOptions(screen.getByLabelText('Source'), 'Referral')
    await user.type(screen.getByLabelText('Salary offered'), '21000')
    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(await screen.findByText('Application to Initech added')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/applications/new-1'))
    expect(body).toMatchObject({
      company: 'Initech',
      workMode: 'Remote',
      source: 'Referral',
      salaryAmount: 21000,
      salaryCurrency: 'MXN',
      jobUrl: null,
      notes: null,
    })
  })

  it('shows API validation errors next to the matching field', async () => {
    server.use(
      http.post('*/api/applications', () =>
        HttpResponse.json({ status: 400, errors: { company: ['Company is already taken by a test.'] } }, { status: 400 }),
      ),
    )
    const { user } = renderApp('/applications/new', { authenticated: true })

    await user.type(await screen.findByLabelText('Company'), 'Initech')
    await user.type(screen.getByLabelText('Position'), 'Developer')
    await user.selectOptions(screen.getByLabelText('Work mode'), 'Remote')
    await user.selectOptions(screen.getByLabelText('Source'), 'Other')
    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(await screen.findByText('Company is already taken by a test.')).toBeInTheDocument()
    expect(screen.getByLabelText('Company')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('application detail', () => {
  it('shows a friendly message when the application does not exist', async () => {
    server.use(http.get('*/api/applications/missing', () => HttpResponse.json({ status: 404 }, { status: 404 })))
    renderApp('/applications/missing', { authenticated: true })

    expect(await screen.findByRole('heading', { name: 'Application not found' })).toBeInTheDocument()
  })

  it('changes the status from a dialog and shows the new history', async () => {
    let current: ApplicationDetail = makeDetail({ id: 'd1' })
    let body: unknown
    server.use(
      http.get('*/api/applications/d1', () => HttpResponse.json(current)),
      http.post('*/api/applications/d1/status', async ({ request }) => {
        body = await request.json()
        current = {
          ...current,
          status: 'HrInterview',
          statusHistory: [
            { id: 'h2', fromStatus: 'Applied', toStatus: 'HrInterview', note: 'Call on Monday', changedAt: '2026-11-10T16:00:00Z' },
            ...current.statusHistory,
          ],
        }
        return HttpResponse.json(current)
      }),
    )
    const { user } = renderApp('/applications/d1', { authenticated: true })

    await user.click(await screen.findByRole('button', { name: 'Change status' }))
    const dialog = screen.getByRole('dialog', { name: 'Change status' })
    // "Accepted" is only offered after an offer, mirroring the API rule.
    expect(within(dialog).queryByRole('option', { name: 'Accepted' })).not.toBeInTheDocument()

    await user.selectOptions(within(dialog).getByLabelText('New status'), 'HrInterview')
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Call on Monday')
    await user.click(within(dialog).getByRole('button', { name: 'Save status' }))

    expect(await screen.findByText('Status changed to HR interview')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(body).toEqual({ status: 'HrInterview', note: 'Call on Monday' })
    expect(screen.getByText('Call on Monday')).toBeInTheDocument()
  })

  it('shows the API message inside the dialog when the change is rejected', async () => {
    server.use(
      http.get('*/api/applications/d1', () => HttpResponse.json(makeDetail({ id: 'd1' }))),
      http.post('*/api/applications/d1/status', () =>
        HttpResponse.json({ status: 409, detail: 'The application is already in status X.' }, { status: 409 }),
      ),
    )
    const { user } = renderApp('/applications/d1', { authenticated: true })

    await user.click(await screen.findByRole('button', { name: 'Change status' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('New status'), 'Rejected')
    await user.click(within(dialog).getByRole('button', { name: 'Save status' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The application is already in status X.')
  })

  it('closes dialogs with Escape and returns focus to the button that opened them', async () => {
    server.use(http.get('*/api/applications/d1', () => HttpResponse.json(makeDetail({ id: 'd1' }))))
    const { user } = renderApp('/applications/d1', { authenticated: true })

    const trigger = await screen.findByRole('button', { name: 'Delete' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Delete this application?' })
    // The safe action receives the initial focus.
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('deletes after confirmation and goes back to the list', async () => {
    let deleted = false
    server.use(
      http.get('*/api/applications/d1', () => HttpResponse.json(makeDetail({ id: 'd1', company: 'Acme' }))),
      http.delete('*/api/applications/d1', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    mockList(() => paged([]))
    const { user, router } = renderApp('/applications/d1', { authenticated: true })

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete application' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/applications'))
    expect(deleted).toBe(true)
    expect(await screen.findByText('Application to Acme deleted')).toBeInTheDocument()
  })
})

describe('exporting applications', () => {
  it('downloads the file with the current filters and the name the server suggests', async () => {
    mockList(() => paged([acme]))
    let exportQuery: URLSearchParams | undefined
    server.use(
      http.get('*/api/applications/export', ({ request }) => {
        exportQuery = new URL(request.url).searchParams
        return new HttpResponse('Company\r\nAcme\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': "attachment; filename=export.csv; filename*=UTF-8''jobtracker-applications-2026-11-17.csv",
          },
        })
      }),
    )
    // jsdom has no object URLs and does not navigate on click: record what would be downloaded.
    const createObjectURL = vi.fn(() => 'blob:export')
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    const downloads: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })

    const { user } = renderApp('/applications?status=Offer&sortBy=company&sortDir=asc&page=2', { authenticated: true })
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Export CSV' }))

    await waitFor(() => expect(downloads).toEqual(['jobtracker-applications-2026-11-17.csv']))
    expect(exportQuery?.get('format')).toBe('csv')
    expect(exportQuery?.get('status')).toBe('Offer')
    expect(exportQuery?.get('sortBy')).toBe('company')
    // The export covers every page, not just the one on screen.
    expect(exportQuery?.has('page')).toBe(false)
    expect(createObjectURL).toHaveBeenCalledOnce()

    click.mockRestore()
  })

  it('tells the user when the export fails', async () => {
    mockList(() => paged([acme]))
    server.use(http.get('*/api/applications/export', () => HttpResponse.json({ status: 500 }, { status: 500 })))
    const { user } = renderApp('/applications', { authenticated: true })
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Export Excel' }))

    expect(await screen.findByText('Could not export your applications. Please try again.')).toBeInTheDocument()
  })

  it('disables the export when there is nothing to export', async () => {
    renderApp('/applications', { authenticated: true })

    await screen.findByText('No applications yet')
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  })
})
