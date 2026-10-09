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
  /** The evening before a voluntary Planned Fast, at a local time (HH:mm). */
  nightBefore: { on: boolean; time: string }
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  on: false,
  suhoor: { on: true, minutesBefore: 45 },
  iftar: { on: true, minutesBefore: 0 },
  nightBefore: { on: true, time: '21:00' },
}

/** How far ahead the Reminder Schedule reaches. */
export const SCHEDULE_DAYS = 60

const MINUTE = 60_000

const inMinutes = (minutes: number) => (minutes === 1 ? '1 minute' : `${minutes} minutes`)

/** The Saved Location's offset ("+05:00") on a day, read from one of its times. */
const offsetOf = (day: Day) => day.suhoor.at.slice(19)

/** An instant from a date and wall-clock time at the Saved Location. */
const at = (date: string, time: string, offset: string) => Date.parse(`${date}T${time}:00${offset}`)

export interface ScheduleInput {
  today: string
  now: number
  dayAt: (date: string) => Day | undefined
  settings: ReminderSettings
  /** The Month-end Check asked on the evening of a date, if one is due and unanswered. */
  monthEndQuestion: (date: string) => string | undefined
}

/**
 * The Reminder Schedule from today through the next 60 days: Suhoor, Iftar and Night-before Reminders for
 * Planned Fasts, Month-end Check Reminders, and a Renewal Reminder a week before the schedule runs out.
 */
export function reminderSchedule({ today, now, dayAt, settings, monthEndQuestion }: ScheduleInput): ReminderEntry[] {
  const entries: ReminderEntry[] = []
  let lastDay: Day | undefined
  for (let i = 0; i <= SCHEDULE_DAYS; i++) {
    const day = dayAt(addDays(today, i))
    if (!day) break
    lastDay = day
    const question = monthEndQuestion(day.date)
    if (question) {
      entries.push({
        id: `${day.date}:month-end`,
        at: Date.parse(day.iftar.at) + 120 * MINUTE,
        expiresAt: at(addDays(day.date, 1), '00:00', offsetOf(day)),
        title: question,
        body: 'Tap to answer, so Sawm keeps your calendar right.',
        url: '/',
      })
    }
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
    const before = dayAt(addDays(day.date, -1))
    if (settings.nightBefore.on && label !== 'Ramadan' && before) {
      entries.push({
        id: `${day.date}:night-before`,
        at: at(before.date, settings.nightBefore.time, offsetOf(before)),
        expiresAt: suhoor,
        title: `Tomorrow: ${label}`,
        body: `Suhoor ends at ${day.suhoor.local}, Iftar at ${day.iftar.local}.`,
        url: '/',
      })
    }
  }
  if (lastDay) {
    const renewal = addDays(today, SCHEDULE_DAYS - 7)
    entries.push({
      id: `${renewal}:renewal`,
      at: at(renewal, '12:00', offsetOf(lastDay)),
      expiresAt: at(addDays(today, SCHEDULE_DAYS), '00:00', offsetOf(lastDay)),
      title: 'Open Sawm to keep your reminders going',
      body: 'Reminders are planned two months ahead; opening Sawm plans the next ones.',
      url: '/',
    })
  }
  return entries.filter((entry) => entry.expiresAt > now && entry.at > now - MINUTE).sort((a, b) => a.at - b.at)
}
