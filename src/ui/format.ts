import type { HijriLabel } from '../core'

/** Sawm is English end-to-end, but dates follow an English-speaking user's own conventions where we know them. */
const locale = navigator.languages.find((language) => language.toLowerCase().startsWith('en')) ?? 'en-GB'

const noon = (date: string) => Date.parse(`${date}T12:00:00Z`)
const format = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(noon(date))

/** "Sunday", for a YYYY-MM-DD date. */
export const weekday = (date: string) => format(date, { weekday: 'long' })

/** "Sun 4 Oct" (in the user's English-locale order). */
export const shortDate = (date: string) => format(date, { weekday: 'short', day: 'numeric', month: 'short' })

/** "4 October" (in the user's English-locale order). */
export const dayMonth = (date: string) => format(date, { day: 'numeric', month: 'long' })

/** "4 October 2026" (in the user's English-locale order). */
export const longDate = (date: string) => format(date, { day: 'numeric', month: 'long', year: 'numeric' })

/** "23 Rabi’ al-Thani" */
export const hijriDayMonth = (hijri: HijriLabel) => `${hijri.day} ${hijri.monthName}`

/** "tomorrow", "in 3 days" */
export const inDays = (days: number) => (days === 1 ? 'tomorrow' : `in ${days} days`)

/** "4 hours 59 minutes", for screen readers. */
export function durationInWords({ hours, minutes }: { hours: number; minutes: number }) {
  const parts = []
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  if (minutes || !hours) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
  return parts.join(' ')
}

/** "February 2027" */
export const monthYear = (year: number, month: number) =>
  new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(year, month - 1, 15))

/** "Monday 8 February 2027" */
export const fullDate = (date: string) => format(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** 1 if the user's week starts on Monday, 0 if on Sunday. */
export function firstDayOfWeek(): 0 | 1 {
  const info = (new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } })
  const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay ?? 1
  return firstDay === 7 ? 0 : 1
}

/** Short weekday names starting from the user's first day of the week: ["Mon", "Tue", ...]. */
export function weekdayNames(start: 0 | 1): string[] {
  // 4 January 2026 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => format(`2026-01-${String(4 + start + i).padStart(2, '0')}`, { weekday: 'short' }))
}

/** Whether the device shows a 12-hour clock. */
const twelveHour = (() => {
  const cycle = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle
  return cycle === 'h11' || cycle === 'h12'
})()

/** A wall-clock time ("18:17") in the device's own clock style: "18:17", or "6:17" with "PM". */
export function clockTime(local: string): { time: string; meridiem?: 'AM' | 'PM' } {
  if (!twelveHour) return { time: local }
  const [hours, minutes] = local.split(':').map(Number) as [number, number]
  return { time: `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')}`, meridiem: hours < 12 ? 'AM' : 'PM' }
}

/** "6:17 PM" or "18:17", as plain text. */
export const clockText = (local: string) => {
  const { time, meridiem } = clockTime(local)
  return meridiem ? `${time} ${meridiem}` : time
}

const offsetOf = (timeZone: string | undefined, at: number) =>
  new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value

/**
 * A time zone's offset ("GMT+5:30"), if its clocks read differently from the device's right now. Zones are compared
 * by offset, not name, so two names for one zone (Asia/Kolkata and Asia/Calcutta) don't count as different.
 */
export function zoneOffsetIfDifferent(timeZone: string | undefined, at = Date.now()): string | undefined {
  if (!timeZone) return undefined
  const theirs = offsetOf(timeZone, at)
  return theirs === offsetOf(undefined, at) ? undefined : theirs
}
