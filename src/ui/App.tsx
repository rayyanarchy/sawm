import { useEffect, useSyncExternalStore } from 'react'
import type { Sawm } from '../core'
import { LocationSearch } from './LocationSearch'
import { navigate, usePath } from './router'
import { SettingsScreen } from './SettingsScreen'
import { Shell } from './Shell'
import { TodayScreen } from './TodayScreen'
import { useAppliedTheme } from './useAppliedTheme'

export function App({ sawm }: { sawm: Sawm }) {
  const today = useSyncExternalStore(sawm.subscribe, sawm.today)
  const settings = useSyncExternalStore(sawm.subscribe, sawm.settings)
  const theme = useAppliedTheme(settings.theme)
  const path = usePath()

  // Keep today current: on opening, on coming back to the app, and every minute, since a new day may need a new month.
  useEffect(() => {
    const refresh = () => void sawm.refresh()
    refresh()
    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [sawm])

  if (today.status === 'no-location') {
    return (
      <Shell sky="neutral" theme={theme} showNav={false}>
        <LocationSearch sawm={sawm} onDone={() => navigate('/', { replace: true })} />
      </Shell>
    )
  }

  const sky = today.status === 'ready' ? today.phase : 'neutral'
  return (
    <Shell sky={sky} theme={theme}>
      {path === '/settings/location' ? (
        <LocationSearch sawm={sawm} canCancel onDone={() => navigate('/')} />
      ) : path.startsWith('/settings') ? (
        <SettingsScreen sawm={sawm} settings={settings} />
      ) : (
        <TodayScreen today={today} />
      )}
    </Shell>
  )
}
