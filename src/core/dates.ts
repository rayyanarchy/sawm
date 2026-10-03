const formatters = new Map<string, Intl.DateTimeFormat>()

/** The calendar date (YYYY-MM-DD) at an instant, as seen in a time zone. */
export function localDate(instant: number, timeZone: string): string {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, formatter)
  }
  const parts = formatter.formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** The wall-clock time (HH:mm) of an ISO 8601 instant written in its place's own offset. */
export function wallClockTime(isoWithOffset: string): string {
  return isoWithOffset.slice(11, 16)
}

const DAY = 86_400_000
const toUtcNoon = (date: string) => Date.parse(`${date}T12:00:00Z`)
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** A calendar date (YYYY-MM-DD) some days later, or earlier when negative. */
export function addDays(date: string, days: number): string {
  return fromUtc(toUtcNoon(date) + days * DAY)
}

/** Whole calendar days from one date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcNoon(to) - toUtcNoon(from)) / DAY)
}

/** 0 for Sunday through 6 for Saturday. */
export function weekdayOf(date: string): number {
  return new Date(toUtcNoon(date)).getUTCDay()
}

/** The Gregorian year and month (1-12) a number of months after a date's month. */
export function monthAfter(date: string, months: number): { year: number; month: number } {
  const [year, month] = date.split('-').map(Number) as [number, number]
  const index = year * 12 + (month - 1) + months
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}
