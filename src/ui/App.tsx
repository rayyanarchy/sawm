import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Sawm } from '../core'
import { LocationSearch } from './LocationSearch'
import { placeName } from './placeName'
import { TodayPrototype } from './today-prototype/TodayPrototype'

// PROTOTYPE (#38): the Today variants only exist in development, behind ?variant=.
const showPrototype = import.meta.env.DEV && new URLSearchParams(window.location.search).has('variant')

export function App({ sawm }: { sawm: Sawm }) {
  const today = useSyncExternalStore(sawm.subscribe, sawm.today)
  const [changingLocation, setChangingLocation] = useState(false)

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

  // PROTOTYPE (#38): ?place=Karachi picks the first search result, so the variants can be opened straight away.
  useEffect(() => {
    const place = new URLSearchParams(window.location.search).get('place')
    if (!import.meta.env.DEV || !place || sawm.today().status !== 'no-location') return
    void sawm.searchPlaces(place).then(([first]) => first && sawm.setSavedLocation(first))
  }, [sawm])

  if (showPrototype && today.status === 'ready' && !changingLocation) {
    return <TodayPrototype today={today} />
  }

  if (today.status === 'no-location') {
    return <LocationSearch sawm={sawm} onDone={() => setChangingLocation(false)} />
  }
  if (changingLocation) {
    return <LocationSearch sawm={sawm} onDone={() => setChangingLocation(false)} canCancel />
  }

  return (
    <main>
      <h1>Sawm</h1>
      <p>{placeName(today.location)}</p>
      {today.status === 'ready' ? (
        <dl>
          <dt>Suhoor</dt>
          <dd>
            <time dateTime={today.suhoor.at}>{today.suhoor.local}</time>
          </dd>
          <dt>Iftar</dt>
          <dd>
            <time dateTime={today.iftar.at}>{today.iftar.local}</time>
          </dd>
        </dl>
      ) : (
        <p role="status">Today's times aren't available. Check your connection; Sawm will try again.</p>
      )}
      <button type="button" onClick={() => setChangingLocation(true)}>
        Change location
      </button>
    </main>
  )
}
