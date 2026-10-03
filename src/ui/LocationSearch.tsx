import { useState, type FormEvent } from 'react'
import type { Place, Sawm } from '../core'
import { placeName } from './placeName'

type SearchState = 'idle' | 'searching' | 'failed' | 'saving'

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

  async function choose(place: Place) {
    setState('saving')
    await sawm.setSavedLocation(place)
    onDone()
  }

  return (
    <main>
      <h1>Sawm</h1>
      <form role="search" onSubmit={search}>
        <label htmlFor="place">Where are you fasting?</label>
        <input
          id="place"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="City or town"
          autoComplete="off"
          required
        />
        <button type="submit" disabled={state === 'searching'}>
          Search
        </button>
        {canCancel && (
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        )}
      </form>
      {state === 'failed' && <p role="alert">Couldn't search right now. Check your connection and try again.</p>}
      {places &&
        (places.length === 0 ? (
          <p role="status">No places found. Try a nearby city.</p>
        ) : (
          <ul>
            {places.map((place) => (
              <li key={`${place.latitude},${place.longitude}`}>
                <button type="button" disabled={state === 'saving'} onClick={() => choose(place)}>
                  {placeName(place)}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </main>
  )
}
