import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeDetail, makeSummary, paged } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import { server } from '@/test/server'
import type { ApplicationSummary } from './types'

const acme = makeSummary({ id: 'a1', company: 'Acme', position: 'Backend Developer', status: 'Applied' })
const globex = makeSummary({ id: 'a2', company: 'Globex', status: 'TechnicalInterview', needsFollowUp: true })
const initech = makeSummary({ id: 'a3', company: 'Initech', status: 'Offer' })

function mockBoard(items: ApplicationSummary[], totalCount = items.length) {
  server.use(http.get('*/api/applications', () => HttpResponse.json(paged(items, { totalCount }))))
}

const column = (name: string) => screen.getByRole('region', { name })

describe('board', () => {
  it('shows one column per status with its cards and count', async () => {
    mockBoard([acme, globex, initech])
    renderApp('/board', { authenticated: true })

    await screen.findByRole('link', { name: 'Acme' })
    expect(within(column('Applied')).getByRole('link', { name: 'Acme' })).toHaveAttribute('href', '/applications/a1')
    expect(within(column('Technical interview')).getByText('Follow up')).toBeInTheDocument()
    expect(within(column('Offer')).getByRole('heading')).toHaveTextContent('Offer 1 applications')
    expect(within(column('Rejected')).getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getAllByRole('region')).toHaveLength(8)
  })

  it('moves a card right away and saves the new status (optimistic update)', async () => {
    mockBoard([acme])
    let body: unknown
    server.use(
      http.post('*/api/applications/a1/status', async ({ request }) => {
        body = await request.json()
        await delay(200) // The card must move before the API answers.
        return HttpResponse.json(makeDetail({ id: 'a1', company: 'Acme', status: 'HrInterview' }))
      }),
    )
    const { user } = renderApp('/board', { authenticated: true })
    await screen.findByRole('link', { name: 'Acme' })

    await user.selectOptions(screen.getByLabelText('Move Acme to'), 'HrInterview')

    expect(within(column('HR interview')).getByRole('link', { name: 'Acme' })).toBeInTheDocument()
    expect(within(column('Applied')).queryByRole('link', { name: 'Acme' })).not.toBeInTheDocument()
    await waitFor(() => expect(body).toEqual({ status: 'HrInterview', note: null }))
  })

  it('puts the card back and explains why when the API refuses the move', async () => {
    mockBoard([acme])
    server.use(
      http.post('*/api/applications/a1/status', () =>
        HttpResponse.json(
          { status: 409, title: 'Conflict', detail: 'Only an application with an offer can be accepted.' },
          { status: 409 },
        ),
      ),
    )
    const { user } = renderApp('/board', { authenticated: true })
    await screen.findByRole('link', { name: 'Acme' })

    await user.selectOptions(screen.getByLabelText('Move Acme to'), 'Accepted')

    expect(
      await screen.findByText('Could not move Acme. Only an application with an offer can be accepted.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(within(column('Applied')).getByRole('link', { name: 'Acme' })).toBeInTheDocument())
    expect(within(column('Accepted')).queryByRole('link', { name: 'Acme' })).not.toBeInTheDocument()
  })

  it('says when only part of the applications fit on the board', async () => {
    mockBoard([acme], 140)
    renderApp('/board', { authenticated: true })

    expect(await screen.findByText(/Showing the 100 most recently active of 140 applications/)).toBeInTheDocument()
  })

  it('invites the user to add an application when there are none', async () => {
    renderApp('/board', { authenticated: true })

    expect(await screen.findByRole('heading', { name: 'Your board is empty' })).toBeInTheDocument()
  })
})
