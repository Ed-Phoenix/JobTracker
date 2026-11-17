import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeToggle', () => {
  it('cycles System -> Light -> Dark, applies the class and remembers the choice', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: 'Theme: System. Switch to Light' })
    expect(document.documentElement).not.toHaveClass('dark')

    await user.click(button)
    expect(button).toHaveAccessibleName('Theme: Light. Switch to Dark')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')

    await user.click(button)
    expect(button).toHaveAccessibleName('Theme: Dark. Switch to System')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')

    await user.click(button)
    expect(localStorage.getItem('theme')).toBe('system')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('starts from the saved preference', () => {
    localStorage.setItem('theme', 'dark')
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Theme: Dark. Switch to System' })).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('ignores an unknown saved value', () => {
    localStorage.setItem('theme', 'purple')
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: /^Theme: System/ })).toBeInTheDocument()
  })
})
