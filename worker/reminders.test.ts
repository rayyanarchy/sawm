import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleReminders, objectName, ReminderDevice, type ObjectState, type ReminderEntry } from './reminders'
import { CEK_INFO, concat, fromBase64Url, hkdf, NONCE_INFO, toBase64Url, WEB_PUSH_INFO } from './webpush'

const T = Date.parse('2027-02-08T00:00:00Z')
const MINUTE = 60_000

/** A browser's side of a push subscription: its keys, so the fake push service can decrypt what it receives. */
async function subscriber(endpoint = 'https://push.example.com/send/abc') {
  const keys = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const publicKey = new Uint8Array((await crypto.subtle.exportKey('raw', keys.publicKey)) as ArrayBuffer)
  const auth = crypto.getRandomValues(new Uint8Array(16))
  return { keys, publicKey, auth, subscription: { endpoint, keys: { p256dh: toBase64Url(publicKey), auth: toBase64Url(auth) } } }
}

async function decrypt(body: Uint8Array, browser: Awaited<ReturnType<typeof subscriber>>) {
  const salt = body.slice(0, 16)
  const idLength = body[20]!
  const asPublic = body.slice(21, 21 + idLength)
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = { name: 'ECDH', public: asKey } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0]
  const secret = new Uint8Array(await crypto.subtle.deriveBits(ecdh, browser.keys.privateKey, 256))
  const ikm = await hkdf(browser.auth, secret, concat(WEB_PUSH_INFO, browser.publicKey, asPublic), 32)
  const cek = await crypto.subtle.importKey('raw', await hkdf(salt, ikm, CEK_INFO, 16), 'AES-GCM', false, ['decrypt'])
  const nonce = await hkdf(salt, ikm, NONCE_INFO, 12)
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, cek, body.slice(21 + idLength)))
  expect(plain.at(-1)).toBe(2) // the padding delimiter of a single, final record
  return JSON.parse(new TextDecoder().decode(plain.slice(0, -1)))
}

const vapidKeys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
const vapidPublic = toBase64Url(new Uint8Array((await crypto.subtle.exportKey('raw', vapidKeys.publicKey)) as ArrayBuffer))
const env = {
  VAPID_PUBLIC_KEY: vapidPublic,
  VAPID_PRIVATE_KEY: ((await crypto.subtle.exportKey('jwk', vapidKeys.privateKey)) as JsonWebKey).d!,
  VAPID_SUBJECT: 'https://sawm.example',
}

/** The reminder service with in-memory Durable Objects, a controllable clock and a fake push service. */
function service() {
  let now = T
  const objects = new Map<string, { device: ReminderDevice; alarm?: number; data: Map<string, unknown> }>()
  const namespace = {
    idFromName: (name: string) => name,
    get(id: unknown) {
      let object = objects.get(id as string)
      if (!object) {
        const data = new Map<string, unknown>()
        const state: ObjectState = {
          storage: {
            get: async <T>(key: string) => structuredClone(data.get(key)) as T | undefined,
            put: async (key, value) => void data.set(key, structuredClone(value)),
            deleteAll: async () => data.clear(),
            setAlarm: async (at) => void (object!.alarm = at),
            deleteAlarm: async () => void (object!.alarm = undefined),
          },
        }
        object = { device: new ReminderDevice(state, env, () => now), data }
        objects.set(id as string, object)
      }
      return { fetch: (input: string, init?: RequestInit) => object!.device.fetch(new Request(input, init)) }
    },
  }
  const api = (method: string, path: string, body?: unknown) =>
    handleReminders(new Request(`https://sawm.example${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }), namespace, env, now)

  return {
    api,
    setNow: (at: number) => void (now = at),
    async objectFor(endpoint: string) {
      return objects.get(await objectName(endpoint))!
    },
    /** Moves the clock to each alarm in turn up to `until`, firing it, like the runtime would. */
    async runAlarmsUntil(endpoint: string, until: number) {
      const object = await this.objectFor(endpoint)
      while (object.alarm !== undefined && object.alarm <= until) {
        now = object.alarm
        await object.device.alarm()
      }
      now = until
    },
  }
}

const entry = (id: string, at: number, expiresAt = at + 30 * MINUTE): ReminderEntry => ({
  id,
  at,
  expiresAt,
  title: `Title ${id}`,
  body: `Body ${id}`,
  url: '/',
})

let pushes: { url: string; headers: Headers; body: Uint8Array }[]
let pushStatus: number

beforeEach(() => {
  pushes = []
  pushStatus = 201
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    pushes.push({ url, headers: new Headers(init.headers), body: new Uint8Array(init.body as ArrayBuffer) })
    return new Response(null, { status: pushStatus })
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('Reminder service', () => {
  it('delivers each Reminder at its instant, encrypted for the device and signed with VAPID', async () => {
    const browser = await subscriber()
    const s = service()
    expect((await s.api('PUT', '/api/reminders', { subscription: browser.subscription, entries: [entry('a', T + 10 * MINUTE), entry('b', T + 20 * MINUTE)] })).status).toBe(204)

    await s.runAlarmsUntil(browser.subscription.endpoint, T + 15 * MINUTE)

    expect(pushes).toHaveLength(1)
    const [push] = pushes
    expect(push!.url).toBe(browser.subscription.endpoint)
    expect(push!.headers.get('Content-Encoding')).toBe('aes128gcm')
    expect(push!.headers.get('TTL')).toBe(String(30 * 60))
    expect(await decrypt(push!.body, browser)).toEqual({ title: 'Title a', body: 'Body a', url: '/', tag: 'a' })

    const [, token, key] = push!.headers.get('Authorization')!.match(/^vapid t=([^,]+), k=(.+)$/)!
    expect(key).toBe(vapidPublic)
    const [header, payload, signature] = token!.split('.')
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(payload!)))).toMatchObject({ aud: 'https://push.example.com', sub: 'https://sawm.example' })
    const verified = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, vapidKeys.publicKey, fromBase64Url(signature!), new TextEncoder().encode(`${header}.${payload}`))
    expect(verified).toBe(true)

    await s.runAlarmsUntil(browser.subscription.endpoint, T + 25 * MINUTE)
    expect(pushes).toHaveLength(2)
  })

  it('replaces the whole schedule on each upload', async () => {
    const browser = await subscriber()
    const s = service()
    await s.api('PUT', '/api/reminders', { subscription: browser.subscription, entries: [entry('a', T + 10 * MINUTE), entry('b', T + 20 * MINUTE)] })
    await s.api('PUT', '/api/reminders', { subscription: browser.subscription, entries: [entry('c', T + 30 * MINUTE)] })

    await s.runAlarmsUntil(browser.subscription.endpoint, T + 40 * MINUTE)

    expect(await Promise.all(pushes.map((p) => decrypt(p.body, browser).then((d) => d.tag)))).toEqual(['c'])
  })

  it('drops a Reminder that would arrive after it has expired', async () => {
    const browser = await subscriber()
    const s = service()
    await s.api('PUT', '/api/reminders', { subscription: browser.subscription, entries: [entry('late', T + 10 * MINUTE, T + 11 * MINUTE)] })

    s.setNow(T + 12 * MINUTE)
    await (await s.objectFor(browser.subscription.endpoint)).device.alarm()

    expect(pushes).toEqual([])
  })

  it('forgets a subscription the push service says is gone', async () => {
    const browser = await subscriber()
    const s = service()
    await s.api('PUT', '/api/reminders', { subscription: browser.subscription, entries: [entry('a', T + 10 * MINUTE), entry('b', T + 20 * MINUTE)] })
    pushStatus = 410

    await s.runAlarmsUntil(browser.subscription.endpoint, T + 30 * MINUTE)

    expect(pushes).toHaveLength(1)
    expect((await s.objectFor(browser.subscription.endpoint)).data.size).toBe(0)
  })

  it('stops delivering once the device turns Reminders off', async () => {
    const browser = await subscriber()
    const s = service()
    await s.api('PUT', '/api/reminders', { subscription: browser.subscription, entries: [entry('a', T + 10 * MINUTE)] })

    expect((await s.api('DELETE', '/api/reminders', { endpoint: browser.subscription.endpoint })).status).toBe(204)
    await s.runAlarmsUntil(browser.subscription.endpoint, T + 30 * MINUTE)

    expect(pushes).toEqual([])
  })

  it('carries a schedule over when the browser replaces its subscription', async () => {
    const before = await subscriber('https://push.example.com/send/old')
    const after = await subscriber('https://push.example.com/send/new')
    const s = service()
    await s.api('PUT', '/api/reminders', { subscription: before.subscription, entries: [entry('a', T + 10 * MINUTE)] })

    await s.api('POST', '/api/reminders/move', { from: before.subscription.endpoint, to: after.subscription })
    await s.runAlarmsUntil(after.subscription.endpoint, T + 30 * MINUTE)

    expect(pushes.map((p) => p.url)).toEqual([after.subscription.endpoint])
    expect(await decrypt(pushes[0]!.body, after)).toMatchObject({ tag: 'a' })
  })

  it('refuses malformed or oversized schedules', async () => {
    const { subscription } = await subscriber()
    const s = service()
    const put = async (body: unknown) => (await s.api('PUT', '/api/reminders', body)).status

    expect(await put({ subscription, entries: Array.from({ length: 401 }, (_, i) => entry(`e${i}`, T + MINUTE)) })).toBe(400)
    expect(await put({ subscription, entries: [entry('far', T + 62 * 86_400_000)] })).toBe(400)
    expect(await put({ subscription: { ...subscription, endpoint: 'http://push.example.com/x' }, entries: [] })).toBe(400)
    expect(await put({ subscription, entries: [{ ...entry('x', T + MINUTE), url: 'https://elsewhere.example' }] })).toBe(400)
    expect(await put({ subscription, entries: [entry('ok', T + MINUTE)] })).toBe(204)
  })

  it('hands browsers the VAPID public key to subscribe with', async () => {
    const s = service()
    expect(await (await s.api('GET', '/api/reminders/key')).json()).toEqual({ publicKey: vapidPublic })
  })

  it('sends a test Reminder straight away', async () => {
    const browser = await subscriber()
    const s = service()

    expect((await s.api('POST', '/api/reminders/test', { subscription: browser.subscription })).status).toBe(204)

    expect(await decrypt(pushes[0]!.body, browser)).toMatchObject({ title: 'Reminders are on', tag: 'test' })
  })
})
