import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses, type ButtonVariant } from './buttonStyles'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Shows a spinner and disables the button while an action is in progress. */
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, disabled, className, children, ...props }: ButtonProps) {
  return (
    <button
      // type="button" by default: a <button> inside a form submits it unless told otherwise.
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, className)}
      {...props}
    >
      {loading && <Spinner className="size-4" label="" />}
      {children}
    </button>
  )
}
