import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error'

export type ShowToast = (message: string, tone?: ToastTone) => void

export const ToastContext = createContext<ShowToast | null>(null)

/** const toast = useToast(); toast('Application saved') */
export function useToast(): ShowToast {
  const show = useContext(ToastContext)
  if (!show) {
    throw new Error('useToast must be used inside <ToastProvider>.')
  }

  return show
}
