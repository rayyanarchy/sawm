import { useState, type FormEvent } from 'react'
import type { Place, Sawm } from '../core'
import s from './LocationSearch.module.css'
import { placeName } from './placeName'

type SearchState = 'idle' | 'searching' | 'failed' | 'saving' | 'locating' | 'denied' | 'no-position'

interface LocationSearchProps {
  sawm: Sawm
  /** Called once a place is chosen, or when the user cancels. */
  onDone: () => void
  /** Whether there's a Saved Location to go back to. */
  canCancel?: boolean
}

export function LocationSearch({ sawm, onDone, canCancel = false }: LocationSearchProps) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>()
  const [state, setState] = useState<SearchState>('idle')

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

  async function locate() {
    setState('locating')
    const result = await sawm.useCurrentLocation()
    if (result === 'ok') onDone()
    else setState(result === 'denied' ? 'denied' : 'no-position')
  }

  async function choose(place: Place) {
    setState('saving')
    await sawm.setSavedLocation(place)
    onDone()
  }

  return (
    <section className={s.search}>
      {!canCancel && <p className={s.brand}>Sawm</p>}
      <h1 className={s.question}>
        <label htmlFor="place">Where are you fasting?</label>
      </h1>
      <button type="button" className={s.locate} onClick={locate} disabled={state === 'locating' || state === 'saving'}>
        <span className={s.locateDot} aria-hidden="true" />
        {state === 'locating' ? 'Finding you…' : 'Use my location'}
      </button>
      {state === 'denied' && (
        <p role="alert" className={s.note}>
          Location access is off for Sawm. Search for your city instead.
        </p>
      )}
      {state === 'no-position' && (
        <p role="alert" className={s.note}>
          Couldn’t find where you are. Search for your city instead.
        </p>
      )}
      <p className={s.or}>or search</p>
      <form role="search" className={s.form} onSubmit={search}>
        <input
          id="place"
          className={s.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="City or town"
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
                <button type="button" className={s.result} disabled={state === 'saving'} onClick={() => choose(place)}>
                  <span className={s.resultName}>{place.name}</span>
                  <span className={s.resultRegion}>{placeName({ ...place, name: '' }).replace(/^, /, '')}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {canCancel && (
        <button type="button" className={s.cancel} onClick={onDone}>
          Cancel
        </button>
      )}
    </section>
  )
}
