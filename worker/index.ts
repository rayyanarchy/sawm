import { handleReminders, ReminderDevice as ReminderDeviceLogic } from './reminders'

/** The Durable Object behind each push subscription (see reminders.ts). */
export class ReminderDevice extends ReminderDeviceLogic {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/health') return Response.json({ ok: true })
    if (pathname.startsWith('/api/reminders')) return handleReminders(request, env.REMINDERS, env.VAPID_PUBLIC_KEY)
    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
