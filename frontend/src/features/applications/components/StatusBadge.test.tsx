import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { applicationStatuses, statusLabels } from '../types'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it.each(applicationStatuses)('shows a readable label for %s', (status) => {
    render(<StatusBadge status={status} />)

    // The label is always text, so the status never depends on color alone.
    expect(screen.getByText(statusLabels[status])).toBeInTheDocument()
  })

  it('gives each status its own color', () => {
    const classNames = applicationStatuses.map((status) => {
      const { container } = render(<StatusBadge status={status} />)
      return (container.firstElementChild as HTMLElement).className
    })

    expect(new Set(classNames).size).toBe(applicationStatuses.length)
  })
})
