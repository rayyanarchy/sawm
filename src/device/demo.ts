import type { Device } from '../core'

/** A clock that can be moved, so the demo can show Sawm at any moment. */
export interface DemoClock {
  /** How far the demo is from the real time, in milliseconds. */
  offset(): number
  setOffset(milliseconds: number): void
}

/**
 * The real device with three changes for the demo: its clock can be moved, nothing it writes is kept (writes stay in
 * memory over what's already saved), and it never talks to Sawm's own server, so a moved clock can't replace the
 * real Reminder Schedule or send error reports.
 */
export function demoDevice(real: Device): { device: Device; clock: DemoClock } {
  let offset = 0
  const written = new Map<string, unknown>()
  const device: Device = {
    ...real,
    fetch: (url, init) => (url.startsWith('/') ? Promise.resolve(new Response(null, { status: 204 })) : real.fetch(url, init)),
    storage: {
      get: async <T>(key: string) => (written.has(key) ? (written.get(key) as T) : real.storage.get<T>(key)),
      set: async (key, value) => void written.set(key, value),
    },
    clock: { now: () => real.clock.now() + offset },
  }
  return { device, clock: { offset: () => offset, setOffset: (milliseconds) => void (offset = milliseconds) } }
}
