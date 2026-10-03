const formatters = new Map<string, Intl.DateTimeFormat>()

/** The calendar date (YYYY-MM-DD) at an instant, as seen in a time zone. */
export function localDate(instant: number, timeZone: string): string {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, formatter)
  }
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    formatter.formatToParts(instant).find((p) => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** The wall-clock time (HH:mm) of an ISO 8601 instant written in its place's own offset. */
export function wallClockTime(isoWithOffset: string): string {
  return isoWithOffset.slice(11, 16)
}
