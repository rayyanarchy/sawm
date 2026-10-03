import { useEffect, useSyncExternalStore } from 'react'
import type { ThemePreference } from '../core'

const darkScheme = window.matchMedia('(prefers-color-scheme: dark)')

/** Resolves the user's theme preference against the system's, and applies it to the page. */
export function useAppliedTheme(preference: ThemePreference): 'light' | 'dark' {
  const systemDark = useSyncExternalStore(
    (listener) => {
      darkScheme.addEventListener('change', listener)
      return () => darkScheme.removeEventListener('change', listener)
    },
    () => darkScheme.matches,
  )
  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return theme
}
