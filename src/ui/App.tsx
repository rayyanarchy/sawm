import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Sawm } from '../core'
import { LocationSearch } from './LocationSearch'
import { placeName } from './placeName'

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
