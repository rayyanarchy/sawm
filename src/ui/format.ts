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
