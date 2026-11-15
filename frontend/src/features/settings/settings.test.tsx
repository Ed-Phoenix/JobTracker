import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'
import { demoUser, server } from '@/test/server'

describe('settings', () => {
  it('starts with the current profile and keeps Save disabled until something changes', async () => {
    renderApp('/settings', { authenticated: true })

    expect(await screen.findByLabelText('Full name')).toHaveValue(demoUser.fullName)
    expect(screen.getByLabelText('Follow-up reminder (days)')).toHaveValue(7)
    expect(screen.getByLabelText('Email')).toHaveValue(demoUser.email)
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled()
  })

  it('validates the follow-up range before calling the API', async () => {
    const { user } = renderApp('/settings', { authenticated: true })
    const days = await screen.findByLabelText('Follow-up reminder (days)')

    await user.clear(days)
    await user.type(days, '120')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(await screen.findByText('Use 90 days or fewer.')).toBeInTheDocument()
  })

  it('saves the profile, confirms it and updates the name in the header', async () => {
    let body: unknown
    server.use(
      http.patch('*/api/auth/me', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...demoUser, fullName: 'Ana P. Gómez', followUpDays: 14 })
      }),
    )
    const { user } = renderApp('/settings', { authenticated: true })

    const name = await screen.findByLabelText('Full name')
    await user.clear(name)
    await user.type(name, 'Ana P. Gómez')
    const days = screen.getByLabelText('Follow-up reminder (days)')
    await user.clear(days)
    await user.type(days, '14')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(body).toEqual({ fullName: 'Ana P. Gómez', followUpDays: 14 })
    expect(within(screen.getByRole('banner')).getByText('Ana P. Gómez')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled()
  })
})
