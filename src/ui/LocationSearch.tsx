import { useState, useSyncExternalStore, type FormEvent } from 'react'
import type { Place, Sawm } from '../core'
import s from './LocationSearch.module.css'
import { placeName } from './placeName'
import { useLocate, type LocateState } from './useLocate'

function useOnline() {
  return useSyncExternalStore(
    (listener) => {
      window.addEventListener('online', listener)
      window.addEventListener('offline', listener)
      return () => {
        window.removeEventListener('online', listener)
        window.removeEventListener('offline', listener)
      }
    },
    () => navigator.onLine,
  )
}

/** Searching for a place by name and picking one of the results. */
export function PlaceSearch({ sawm, onChosen, label }: { sawm: Sawm; onChosen: (place: Place) => Promise<void>; label?: string }) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>()
  const [state, setState] = useState<'idle' | 'searching' | 'failed' | 'saving'>('idle')

  async function search(event: FormEvent) {
    event.preventDefault()
    setState('searching')
    try {
      setPlaces(await sawm.searchPlaces(query))
      setState('idle')
    } catch {
      setState('failed')
    }
  }

  async function choose(place: Place) {
    setState('saving')
    await onChosen(place)
    setPlaces(undefined)
    setQuery('')
    setState('idle')
  }

  return (
    <>
      <form role="search" className={s.form} onSubmit={search}>
        <input
          id="place"
          className={s.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="City or town"
          aria-label={label}
          autoComplete="off"
          enterKeyHint="search"
          required
        />
        <button type="submit" className={s.submit} disabled={state === 'searching'}>
          {state === 'searching' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {state === 'failed' && (
        <p role="alert" className={s.note}>
          Couldn’t search right now. Check your connection and try again.
        </p>
      )}
      {places &&
        (places.length === 0 ? (
          <p role="status" className={s.note}>
            No places found. Try a nearby city.
          </p>
        ) : (
          <ul className={s.results}>
            {places.map((place) => (
              <li key={`${place.latitude},${place.longitude}`}>
                <button type="button" className={s.result} disabled={state === 'saving'} onClick={() => void choose(place)}>
                  <span className={s.resultName}>{place.name}</span>
                  <span className={s.resultRegion}>{placeName({ ...place, name: '' }).replace(/^, /, '')}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </>
  )
}

export function LocateProblem({ state, children }: { state: LocateState; children?: string }) {
  if (state === 'denied') {
    return (
      <p role="alert" className={s.note}>
        Location access is off for Sawm. {children ?? 'Search for your city instead.'}
      </p>
    )
  }
  if (state === 'no-position') {
    return (
      <p role="alert" className={s.note}>
        Couldn’t find where you are. {children ?? 'Search for your city instead.'}
      </p>
    )
  }
  return null
}

/** Setup step 1: where the user is fasting. */
export function LocationSearch({ sawm, onDone }: { sawm: Sawm; onDone: () => void }) {
  const online = useOnline()
  const { state, locate } = useLocate(sawm)

  return (
    <section className={s.search}>
      <p className={s.brand}>Sawm</p>
      <h1 className={s.question}>
        <label htmlFor="place">Where are you fasting?</label>
      </h1>
      {!online && (
        <p role="status" className={s.note}>
          You’re offline. Sawm needs to go online once to find your place and load its times.
        </p>
      )}
      <button type="button" className={s.locate} onClick={async () => (await locate()) && onDone()} disabled={state === 'locating'}>
        <span className={s.locateDot} aria-hidden="true" />
        {state === 'locating' ? 'Finding you…' : 'Use my location'}
      </button>
      <LocateProblem state={state} />
      <p className={s.or}>or search</p>
      <PlaceSearch
        sawm={sawm}
        onChosen={async (place) => {
          await sawm.setSavedLocation(place)
          onDone()
        }}
      />
    </section>
  )
}
