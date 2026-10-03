import type { Device } from './device'

/** The times and Hijri Date the data source gives for one Gregorian day at one place. */
export interface DayTimes {
  /** The Gregorian date at the place, as YYYY-MM-DD. */
  date: string
  /** Instants as ISO 8601 strings in the place's own offset, e.g. 2026-10-04T05:09:00+05:00. */
  imsak: string
  fajr: string
  maghrib: string
  hijri: { day: number; month: number; year: number; monthLength: number }
}

export interface MonthTimes {
  timeZone: string
  days: DayTimes[]
}

export interface TimesQuery {
  latitude: number
  longitude: number
  /** AlAdhan's id for the Calculation Method. */
  method: number
}

interface AlAdhanCalendar {
  code: number
  data: {
    timings: { Imsak: string; Fajr: string; Maghrib: string }
    date: {
      gregorian: { date: string }
      hijri: { day: string; year: string; month: { number: number; days: number } }
    }
    meta: { timezone: string }
  }[]
}

/** Fetches one Gregorian month of times from AlAdhan (ADR 0001). */
export async function fetchMonth(
  fetch: Device['fetch'],
  { latitude, longitude, method }: TimesQuery,
  year: number,
  month: number,
): Promise<MonthTimes> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    method: String(method),
    iso8601: 'true',
  })
  const response = await fetch(`https://api.aladhan.com/v1/calendar/${year}/${month}?${params}`)
  if (!response.ok) throw new Error(`AlAdhan responded with status ${response.status}`)
  const { code, data } = (await response.json()) as AlAdhanCalendar
  if (code !== 200 || data.length === 0) throw new Error(`AlAdhan returned no calendar (code ${code})`)

  return {
    timeZone: data[0]!.meta.timezone,
    days: data.map(({ timings, date }) => {
      const [day, monthOfYear, gregorianYear] = date.gregorian.date.split('-')
      return {
        date: `${gregorianYear}-${monthOfYear}-${day}`,
        imsak: timings.Imsak,
        fajr: timings.Fajr,
        maghrib: timings.Maghrib,
        hijri: {
          day: Number(date.hijri.day),
          month: date.hijri.month.number,
          year: Number(date.hijri.year),
          monthLength: date.hijri.month.days,
        },
      }
    }),
  }
}
