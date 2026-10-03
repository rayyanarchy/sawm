import { get, set } from 'idb-keyval'
import type { Device, PositionResult } from '../core'

/** The real device: the network, IndexedDB, the system clock and the browser's geolocation. */
export const browserDevice: Device = {
  fetch: (url) => fetch(url),
  storage: {
    get: (key) => get(key),
    set: (key, value) => set(key, value),
  },
  clock: { now: () => Date.now() },
  geolocation: {
    current: () =>
      new Promise<PositionResult>((resolve) => {
        if (!('geolocation' in navigator)) return resolve({ status: 'unavailable' })
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ status: 'ok', latitude: coords.latitude, longitude: coords.longitude }),
          (error) => resolve({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
        )
      }),
  },
}
