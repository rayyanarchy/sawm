import type { Device, PositionResult, Push } from '../device'
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
  /** Whether location access was already allowed (for the travel prompt). */
  locationPermission?: 'granted' | 'prompt' | 'denied'
  /** What the browser does when asked for push notifications. */
  push?: { support?: ReturnType<Push['support']>; answer?: 'granted' | 'denied' }
}) {
  let now = Date.parse(options.now)
  let online = true
  let held: (() => void)[] | undefined
  const requests: string[] = []
  /** Every call to Sawm's own server, with its method and parsed body. */
  const server: { method: string; url: string; body: unknown }[] = []
  let subscribed = false
  let currentPosition = options.position
  const stored = new Map<string, string>()

  const device: Device = {
    async fetch(url, init) {
      if (url.startsWith('/')) {
        if (!online) throw new TypeError('Failed to fetch')
        const method = init?.method ?? 'GET'
        server.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
        if (url === '/api/reminders/key') return Response.json({ publicKey: 'BFAKEPUBLICKEY' })
        return new Response(null, { status: 204 })
      }
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
    push: {
      support: () => options.push?.support ?? 'supported',
      async subscribe(publicKey) {
        if (publicKey !== 'BFAKEPUBLICKEY') throw new Error('Subscribed with the wrong VAPID key')
        if (options.push?.answer === 'denied') return 'denied'
        subscribed = true
        return { endpoint: 'https://push.example.com/send/device-1', keys: { p256dh: 'p256dh-key', auth: 'auth-secret' } }
      },
      async unsubscribe() {
        subscribed = false
      },
      async current() {
        return subscribed ? { endpoint: 'https://push.example.com/send/device-1', keys: { p256dh: 'p256dh-key', auth: 'auth-secret' } } : undefined
      },
    },
    geolocation: {
      async current(): Promise<PositionResult> {
        const position = currentPosition ?? 'unavailable'
        return typeof position === 'string' ? { status: position } : { status: 'ok', ...position }
      },
      async permission() {
        return options.locationPermission ?? 'prompt'
      },
    },
  }

  return {
    device,
    /** Every URL the core has requested from other services, in order. */
    requests,
    server,
    isSubscribed: () => subscribed,
    moveTo(position: { latitude: number; longitude: number }) {
      currentPosition = position
    },
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
