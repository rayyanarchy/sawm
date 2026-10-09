import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react'
import type { Sawm } from '../core'
import { FastsSetup } from './FastsSetup'
import { LocationSearch } from './LocationSearch'
import { RemindersSetup } from './RemindersSetup'
import { navigate, usePath } from './router'
import { Shell } from './Shell'
import { TodayScreen } from './TodayScreen'
import { useAppliedTheme } from './useAppliedTheme'

// Loaded on first visit to keep the first screen fast.
const CalendarScreen = lazy(() => import('./CalendarScreen').then((m) => ({ default: m.CalendarScreen })))
const SettingsScreen = lazy(() => import('./SettingsScreen').then((m) => ({ default: m.SettingsScreen })))

export function App({ sawm }: { sawm: Sawm }) {
  const today = useSyncExternalStore(sawm.subscribe, sawm.today)
  const settings = useSyncExternalStore(sawm.subscribe, sawm.settings)
  const theme = useAppliedTheme(settings.theme)
  const path = usePath()

  // Keep today current: on opening, on coming back to the app, and every minute, since a new day may need a new month.
  useEffect(() => {
    const refresh = () => void sawm.refresh()
    refresh()
    void sawm.checkTravel()
    const onVisible = () => document.visibilityState === 'visible' && void sawm.checkTravel()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', refresh)
    }
  }, [sawm])

  // Once set up, ask the browser to keep Sawm's data even when space runs low (it may say no; that's fine).
  useEffect(() => {
    if (settings.setup.fasts) void navigator.storage?.persist?.()
  }, [settings.setup.fasts])

  // The countdown moves on by the minute; the core only tells us when something on screen changes.
  useEffect(() => {
    const timer = setInterval(() => sawm.tick(), 1000)
    return () => clearInterval(timer)
  }, [sawm])

  if (today.status === 'no-location') {
    return (
      <Shell sky="neutral" theme={theme} showNav={false}>
        <LocationSearch sawm={sawm} onDone={() => navigate('/', { replace: true })} />
      </Shell>
    )
  }

  const sky = today.status === 'ready' ? today.phase : 'neutral'

  if (!settings.setup.fasts) {
    return (
      <Shell sky={sky} theme={theme} showNav={false}>
        <FastsSetup sawm={sawm} settings={settings} />
      </Shell>
    )
  }

  if (!settings.setup.reminders) {
    return (
      <Shell sky={sky} theme={theme} showNav={false}>
        <RemindersSetup sawm={sawm} />
      </Shell>
    )
  }

  return (
    <Shell sky={sky} theme={theme}>
      <Suspense fallback={null}>
      {path === '/settings/location' ? (
        <LocationSearch sawm={sawm} canCancel onDone={() => navigate('/')} />
      ) : path.startsWith('/settings') ? (
        <SettingsScreen sawm={sawm} settings={settings} />
      ) : path.startsWith('/calendar') ? (
        <CalendarScreen sawm={sawm} />
      ) : (
        <TodayScreen today={today} sawm={sawm} />
      )}
      </Suspense>
    </Shell>
  )
}
