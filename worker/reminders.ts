// The reminder service (ADR 0002, ADR 0003): each push subscription gets one Durable Object, holding the
// subscription and the Reminder Schedule the device uploaded. Its single alarm is set for the next Reminder.
import { sendPush, type PushSubscriptionJSON, type Vapid } from './webpush'

/** One scheduled notification, as the device builds it. Instants are epoch milliseconds. */
export interface ReminderEntry {
  id: string
  at: number
  /** After this, the Reminder is no longer worth delivering. */
  expiresAt: number
  title: string
  body: string
  /** The in-app path to open when the notification is tapped. */
  url: string
}

export interface StoredSchedule {
  subscription: PushSubscriptionJSON
  entries: ReminderEntry[]
}

/** The parts of a Durable Object's state the reminder service uses; small, so tests can supply their own. */
export interface ObjectState {
  storage: {
    get<T>(key: string): Promise<T | undefined>
    put<T>(key: string, value: T): Promise<void>
    deleteAll(): Promise<void>
    setAlarm(at: number): Promise<void>
    deleteAlarm(): Promise<void>
  }
}

export interface ReminderEnv {
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
}

const vapidOf = (env: ReminderEnv): Vapid => ({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT })

export class ReminderDevice {
  constructor(
    private readonly state: ObjectState,
    private readonly env: ReminderEnv,
    private readonly now: () => number = Date.now,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'PUT') {
      await this.store((await request.json()) as StoredSchedule)
      return new Response(null, { status: 204 })
    }
    if (request.method === 'GET') {
      return Response.json((await this.state.storage.get<StoredSchedule>('schedule')) ?? null)
    }
    if (request.method === 'DELETE') {
      await this.clear()
      return new Response(null, { status: 204 })
    }
    return new Response('Method not allowed', { status: 405 })
  }

  async alarm(): Promise<void> {
    const schedule = await this.state.storage.get<StoredSchedule>('schedule')
    if (!schedule) return
    const now = this.now()
    const due = schedule.entries.filter((entry) => entry.at <= now)
    const later = schedule.entries.filter((entry) => entry.at > now)

    for (const entry of due) {
      if (entry.expiresAt <= now) continue
      const response = await sendPush(
        schedule.subscription,
        { title: entry.title, body: entry.body, url: entry.url, tag: entry.id },
        (entry.expiresAt - now) / 1000,
        vapidOf(this.env),
      )
      // The subscription is gone (the user unsubscribed or reinstalled): forget everything.
      if (response.status === 404 || response.status === 410) return this.clear()
      // Anything else unexpected: keep it and try again shortly, until it expires.
      if (!response.ok) later.push({ ...entry, at: now + 60_000 })
    }
    await this.store({ ...schedule, entries: later })
  }

  private async store(schedule: StoredSchedule) {
    const entries = [...schedule.entries].sort((a, b) => a.at - b.at)
    await this.state.storage.put('schedule', { ...schedule, entries })
    if (entries[0]) await this.state.storage.setAlarm(entries[0].at)
    else await this.state.storage.deleteAlarm()
  }

  private async clear() {
    await this.state.storage.deleteAlarm()
    await this.state.storage.deleteAll()
  }
}

const DAY = 86_400_000
const MAX_ENTRIES = 400

/** Checks a schedule upload, so nothing malformed or oversized reaches storage. */
export function validSchedule(body: unknown, now: number): StoredSchedule | undefined {
  if (!body || typeof body !== 'object') return undefined
  const { subscription, entries } = body as Partial<StoredSchedule>
  if (!validSubscription(subscription) || !Array.isArray(entries) || entries.length > MAX_ENTRIES) return undefined
  const ok = entries.every(
    (e) =>
      e &&
      typeof e.id === 'string' &&
      e.id.length <= 80 &&
      Number.isFinite(e.at) &&
      Number.isFinite(e.expiresAt) &&
      e.at <= now + 61 * DAY &&
      e.expiresAt >= e.at &&
      typeof e.title === 'string' &&
      e.title.length <= 120 &&
      typeof e.body === 'string' &&
      e.body.length <= 240 &&
      typeof e.url === 'string' &&
      e.url.startsWith('/') &&
      e.url.length <= 200,
  )
  return ok ? { subscription, entries } : undefined
}

export function validSubscription(value: unknown): value is PushSubscriptionJSON {
  const sub = value as PushSubscriptionJSON | undefined
  if (!sub || typeof sub.endpoint !== 'string' || typeof sub.keys?.p256dh !== 'string' || typeof sub.keys?.auth !== 'string') return false
  try {
    return new URL(sub.endpoint).protocol === 'https:' && sub.endpoint.length <= 1000
  } catch {
    return false
  }
}

/** Each subscription's Durable Object is named by a hash of its endpoint. */
export async function objectName(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface Namespace {
  idFromName(name: string): unknown
  get(id: unknown): { fetch(input: string, init?: RequestInit): Promise<Response> }
}

/** The reminder service's HTTP API, under /api/reminders. */
export async function handleReminders(request: Request, namespace: Namespace, env: ReminderEnv, now = Date.now()): Promise<Response> {
  const { pathname } = new URL(request.url)
  const stubFor = async (endpoint: string) => namespace.get(namespace.idFromName(await objectName(endpoint)))

  if (pathname === '/api/reminders/key' && request.method === 'GET') return Response.json({ publicKey: env.VAPID_PUBLIC_KEY })

  // A Reminder right now, so the user can check they arrive.
  if (pathname === '/api/reminders/test' && request.method === 'POST') {
    const body = (await request.json().catch(() => undefined)) as { subscription?: unknown } | undefined
    if (!validSubscription(body?.subscription)) return new Response('Invalid subscription', { status: 400 })
    const response = await sendPush(
      body.subscription,
      { title: 'Reminders are on', body: 'This is how Sawm will remind you before Suhoor and at Iftar.', url: '/', tag: 'test' },
      300,
      vapidOf(env),
    )
    return new Response(null, { status: response.ok ? 204 : 502 })
  }

  if (pathname === '/api/reminders' && request.method === 'PUT') {
    const schedule = validSchedule(await request.json().catch(() => undefined), now)
    if (!schedule) return new Response('Invalid schedule', { status: 400 })
    return (await stubFor(schedule.subscription.endpoint)).fetch('https://do/', { method: 'PUT', body: JSON.stringify(schedule) })
  }

  if (pathname === '/api/reminders' && request.method === 'DELETE') {
    const body = (await request.json().catch(() => undefined)) as { endpoint?: unknown } | undefined
    if (typeof body?.endpoint !== 'string') return new Response('Missing endpoint', { status: 400 })
    return (await stubFor(body.endpoint)).fetch('https://do/', { method: 'DELETE' })
  }

  // The browser replaced a subscription: carry its schedule over to the new one.
  if (pathname === '/api/reminders/move' && request.method === 'POST') {
    const body = (await request.json().catch(() => undefined)) as { from?: unknown; to?: unknown } | undefined
    if (typeof body?.from !== 'string' || !validSubscription(body.to)) return new Response('Invalid move', { status: 400 })
    const old = await stubFor(body.from)
    const schedule = (await (await old.fetch('https://do/', { method: 'GET' })).json()) as StoredSchedule | null
    await old.fetch('https://do/', { method: 'DELETE' })
    if (!schedule) return new Response(null, { status: 204 })
    return (await stubFor(body.to.endpoint)).fetch('https://do/', { method: 'PUT', body: JSON.stringify({ ...schedule, subscription: body.to }) })
  }

  return new Response('Not found', { status: 404 })
}
