import { addDays } from './dates'
import type { Day } from './sawm'

/** One scheduled notification. Instants are epoch milliseconds; the server delivers it at `at` (ADR 0003). */
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

export interface ReminderSettings {
  /** Whether Reminders are on for this device at all. */
  on: boolean
  suhoor: { on: boolean; minutesBefore: number }
  iftar: { on: boolean; minutesBefore: number }
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  on: false,
  suhoor: { on: true, minutesBefore: 45 },
  iftar: { on: true, minutesBefore: 0 },
}

/** How far ahead the Reminder Schedule reaches. */
export const SCHEDULE_DAYS = 60

const MINUTE = 60_000

const inMinutes = (minutes: number) => (minutes === 1 ? '1 minute' : `${minutes} minutes`)

/** The Suhoor and Iftar Reminders for the Planned Fasts from today through the next 60 days. */
export function reminderSchedule(today: string, now: number, dayAt: (date: string) => Day | undefined, settings: ReminderSettings): ReminderEntry[] {
  const entries: ReminderEntry[] = []
  for (let i = 0; i <= SCHEDULE_DAYS; i++) {
    const day = dayAt(addDays(today, i))
    if (!day) break
    if (day.plan.status !== 'planned') continue
    const label = day.plan.label
    const suhoor = Date.parse(day.suhoor.at)
    const iftar = Date.parse(day.iftar.at)

    if (settings.suhoor.on) {
      const lead = settings.suhoor.minutesBefore
      entries.push({
        id: `${day.date}:suhoor`,
        at: suhoor - lead * MINUTE,
        expiresAt: suhoor,
        title: lead > 0 ? `Suhoor ends in ${inMinutes(lead)}` : 'Suhoor ends now',
        body: `${label} · Suhoor ends at ${day.suhoor.local}`,
        url: '/',
      })
    }
    if (settings.iftar.on) {
      const lead = settings.iftar.minutesBefore
      entries.push({
        id: `${day.date}:iftar`,
        at: iftar - lead * MINUTE,
        expiresAt: iftar + 30 * MINUTE,
        title: lead > 0 ? `Iftar in ${inMinutes(lead)}` : 'It’s time for Iftar',
        body: `${label} · Iftar at ${day.iftar.local}`,
        url: '/',
      })
    }
  }
  return entries.filter((entry) => entry.expiresAt > now && entry.at > now - MINUTE).sort((a, b) => a.at - b.at)
}
