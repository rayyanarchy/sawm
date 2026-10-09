import { addDays } from './dates'
import { SCHEDULE_DAYS, type ReminderSettings } from './reminders'
import type { Day } from './sawm'

const utc = (instant: number) => new Date(instant).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** Folds a content line to 75 octets, as the iCalendar format requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let current = ''
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > (parts.length ? 74 : 75)) {
      parts.push(current)
      current = ''
    }
    current += char
  }
  parts.push(current)
  return parts.join('\r\n ')
}

function event(uid: string, start: number, summary: string, description: string, alarmMinutesBefore: number, stamp: number) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@sawm`,
    `DTSTAMP:${utc(stamp)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(start)}`,
    `SUMMARY:${escape(summary)}`,
    `DESCRIPTION:${escape(description)}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(summary)}`,
    `TRIGGER:${alarmMinutesBefore > 0 ? `-PT${alarmMinutesBefore}M` : 'PT0M'}`,
    'END:VALARM',
    'END:VEVENT',
  ]
}

/**
 * The Calendar Export: an .ics file of the Planned Fasts in the next 60 days, each as "Suhoor ends" and "Iftar"
 * events with alerts at the user's Reminder timings. UIDs are stable per date and event, so importing again
 * updates rather than duplicates in calendar apps that honour them.
 */
export function calendarExport(today: string, now: number, dayAt: (date: string) => Day | undefined, reminders: ReminderSettings): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sawm//Calendar Export//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Sawm']
  for (let i = 0; i <= SCHEDULE_DAYS; i++) {
    const day = dayAt(addDays(today, i))
    if (!day) break
    if (day.plan.status !== 'planned') continue
    const label = day.plan.label
    lines.push(
      ...event(`${day.date}-suhoor`, Date.parse(day.suhoor.at), `Suhoor ends · ${label}`, `Stop eating and drinking by ${day.suhoor.local}.`, reminders.suhoor.minutesBefore, now),
      ...event(`${day.date}-iftar`, Date.parse(day.iftar.at), `Iftar · ${label}`, `Break your fast at ${day.iftar.local}.`, reminders.iftar.minutesBefore, now),
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
