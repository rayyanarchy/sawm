import { addDays, daysBetween } from './dates'

export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi’ al-Awwal',
  'Rabi’ al-Thani',
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  'Sha’ban',
  'Ramadan',
  'Shawwal',
  'Dhul Qa’dah',
  'Dhul Hijjah',
] as const

export interface HijriDate {
  year: number
  /** 1 for Muharram through 12 for Dhul Hijjah. */
  month: number
  day: number
  /** 29 or 30. */
  monthLength: number
}

/** A Hijri month as the data source reckons it, before any Hijri Offset. */
export interface BaseMonth {
  year: number
  month: number
  /** The Gregorian date (YYYY-MM-DD) of its first day. */
  start: string
  length: number
}

/** "1448-09" for Ramadan 1448. */
export const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

export function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

/**
 * The months the data source's Hijri Dates describe, in order, found from the days loaded so far.
 * `days` maps Gregorian dates to the data source's Hijri Date for them.
 */
export function baseMonths(days: ReadonlyMap<string, HijriDate>): BaseMonth[] {
  const months = new Map<string, BaseMonth>()
  for (const [date, hijri] of days) {
    const key = monthKey(hijri.year, hijri.month)
    if (!months.has(key)) {
      months.set(key, { year: hijri.year, month: hijri.month, start: addDays(date, 1 - hijri.day), length: hijri.monthLength })
    }
  }
  return [...months.values()].sort((a, b) => a.start.localeCompare(b.start))
}

/**
 * The user's Hijri calendar: each month starts on the data source's start shifted by the offset in effect
 * for that month, and runs until the next month starts, so it can have 29 or 30 days whatever the source says.
 */
export function hijriCalendar(months: readonly BaseMonth[], offsetFor: (year: number, month: number) => number) {
  const starts = months.map((m) => ({ ...m, userStart: addDays(m.start, offsetFor(m.year, m.month)) }))
  const last = months.at(-1)
  if (last) {
    const after = nextMonth(last.year, last.month)
    starts.push({ ...after, start: addDays(last.start, last.length), length: 30, userStart: addDays(addDays(last.start, last.length), offsetFor(after.year, after.month)) })
  }

  return {
    /** The user's Hijri Date for a Gregorian date, or undefined outside the loaded months. */
    dateOf(date: string): HijriDate | undefined {
      for (let i = 0; i < starts.length - 1; i++) {
        const month = starts[i]!
        const next = starts[i + 1]!
        if (date >= month.userStart && date < next.userStart) {
          return { year: month.year, month: month.month, day: daysBetween(month.userStart, date) + 1, monthLength: daysBetween(month.userStart, next.userStart) }
        }
      }
      return undefined
    },
    /** The Gregorian date a Hijri month starts on, for the user. */
    startOf(year: number, month: number): string | undefined {
      return starts.find((m) => m.year === year && m.month === month)?.userStart
    },
  }
}

export type HijriCalendar = ReturnType<typeof hijriCalendar>
