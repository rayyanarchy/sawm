import type { Device, PositionResult } from '../device'
import { fixtureName } from './fixtureName'

const fixtures = import.meta.glob<unknown>('./fixtures/*.json', { eager: true, import: 'default' })

/**
 * A device whose network serves recorded responses, whose storage lives in memory,
 * and whose clock only moves when a test moves it.
 */
export function createFakeDevice(options: {
  now: string
  /** Where the device says it is, or why it won't say. */
  position?: { latitude: number; longitude: number } | 'denied' | 'unavailable'
}) {
  let now = Date.parse(options.now)
  let online = true
  let held: (() => void)[] | undefined
  const requests: string[] = []
  const stored = new Map<string, string>()

  const device: Device = {
    async fetch(url) {
      requests.push(url)
      if (held) await new Promise<void>((resolve) => held!.push(resolve))
      if (!online) throw new TypeError('Failed to fetch')
      const body = fixtures[`./fixtures/${fixtureName(url)}`]
      if (body === undefined) {
        throw new Error(`No recorded response for ${url}. Add it to scripts/record-fixtures.ts and run pnpm fixtures:record.`)
      }
      return Response.json(body)
    },
    storage: {
      async get(key) {
        const value = stored.get(key)
        return value === undefined ? undefined : JSON.parse(value)
      },
      async set(key, value) {
        stored.set(key, JSON.stringify(value))
      },
    },
    clock: { now: () => now },
    geolocation: {
      async current(): Promise<PositionResult> {
        const position = options.position ?? 'unavailable'
        return typeof position === 'string' ? { status: position } : { status: 'ok', ...position }
      },
    },
  }

  return {
    device,
    /** Every URL the core has requested, in order. */
    requests,
    setNow(iso: string) {
      now = Date.parse(iso)
    },
    goOffline() {
      online = false
    },
    goOnline() {
      online = true
    },
    /** Keeps every response waiting until releaseResponses(), to test what happens while requests are in flight. */
    holdResponses() {
      held = []
    },
    releaseResponses(order: 'oldest-first' | 'newest-first' = 'oldest-first') {
      const waiting = held ?? []
      held = undefined
      if (order === 'newest-first') waiting.reverse()
      waiting.forEach((resolve) => resolve())
    },
  }
}
