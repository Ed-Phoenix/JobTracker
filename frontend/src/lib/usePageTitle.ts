import { useEffect } from 'react'

/** Sets the browser tab title, e.g. "Sign in · JobTracker". Helps orientation and screen readers. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · JobTracker`
  }, [title])
}
