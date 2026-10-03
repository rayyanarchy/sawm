import { get, set } from 'idb-keyval'
import type { Device } from '../core'

/** The real device: the network, IndexedDB and the system clock. */
export const browserDevice: Device = {
  fetch: (url) => fetch(url),
  storage: {
    get: (key) => get(key),
    set: (key, value) => set(key, value),
  },
  clock: { now: () => Date.now() },
}
