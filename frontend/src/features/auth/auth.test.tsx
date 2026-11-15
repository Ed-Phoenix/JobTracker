import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'
import { authResponse, demoUser, server } from '@/test/server'

// Tests interact like a user: find elements by role and accessible name (what a screen reader
// would announce), type and click. They do not depend on CSS classes or component internals.

describe('authentication flow', () => {
  it('redirects a visitor without a session from a private page to the login page', async () => {
    const { router } = renderApp('/applications')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('restores an existing session on startup using the refresh cookie', async () => {
    server.use(http.post('*/api/auth/refresh', () => HttpResponse.json(authResponse())))

    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText(/Hi Ana, here is how your job search is going/)).toBeInTheDocument()
  })

  it('shows validation messages without calling the API when the form is empty', async () => {
    const { user } = renderApp('/login')

    await user.click(await screen.findByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('signs in and returns the user to the page they originally asked for', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.json(authResponse())))
    const { user, router } = renderApp('/applications')

    await user.type(await screen.findByLabelText('Email'), demoUser.email)
    await user.type(screen.getByLabelText('Password'), 'Passw0rd-1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Applications' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/applications')
  })

  it('shows the API error when the credentials are wrong', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ status: 401, detail: 'Invalid email or password.' }, { status: 401 }),
      ),
    )
    const { user } = renderApp('/login')

    await user.type(await screen.findByLabelText('Email'), demoUser.email)
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })

  it('validates matching passwords on the register form', async () => {
    const { user } = renderApp('/register')

    await user.type(await screen.findByLabelText('Full name'), 'Ana Pérez')
    await user.type(screen.getByLabelText('Email'), demoUser.email)
    await user.type(screen.getByLabelText('Password'), 'Passw0rd-1')
    await user.type(screen.getByLabelText('Confirm password'), 'Different-1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('places server validation errors next to their field and shows conflicts as a banner', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json({ status: 409, detail: 'An account with this email already exists.' }, { status: 409 }),
      ),
    )
    const { user } = renderApp('/register')

    await user.type(await screen.findByLabelText('Full name'), 'Ana Pérez')
    await user.type(screen.getByLabelText('Email'), demoUser.email)
    await user.type(screen.getByLabelText('Password'), 'Passw0rd-1')
    await user.type(screen.getByLabelText('Confirm password'), 'Passw0rd-1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.')
  })

  it('signs out and goes back to the login page', async () => {
    let loggedOut = false
    server.use(
      http.post('*/api/auth/refresh', () => HttpResponse.json(authResponse())),
      http.post('*/api/auth/logout', () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user, router } = renderApp('/')

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(loggedOut).toBe(true)
  })
})
