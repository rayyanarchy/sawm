import { useLayoutEffect, useSyncExternalStore } from 'react'
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

  // A layout effect, so the theme is on <html> before the Shell (a child, whose effects run first) reads its colours.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return theme
}
