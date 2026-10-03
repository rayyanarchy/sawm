// PROTOTYPE (#38): shapes the core's Today into what the variants draw, and simulates the moment of the day.
import type { Today } from '../../core'

export type PrototypeState = 'before-suhoor' | 'fasting' | 'not-fasting'

export const STATES: { key: PrototypeState; label: string }[] = [
  { key: 'before-suhoor', label: 'Before Suhoor' },
  { key: 'fasting', label: 'Fasting' },
  { key: 'not-fasting', label: 'Not fasting' },
]

export interface Time {
  at: number
  hhmm: string
  h12: string
  meridiem: 'am' | 'pm'
}

export interface DayModel {
  state: PrototypeState
  place: string
  region: string
  weekday: string
  weekdayShort: string
  gregorian: string
  gregorianShort: string
  hijri: string
  suhoor: Time
  iftar: Time
  now: number
  nowHhmm: string
  /** 0..1 through the fast; 0 before Suhoor ends. */
  progress: number
  /** Milliseconds until Suhoor ends (before Suhoor) or until Iftar (fasting). */
  remaining: number
  /** Whole hours between Suhoor and Iftar, positioned 0..1 along the fast. */
  hours: { hour: number; at: number }[]
  nextFast: { weekday: string; date: string; dateShort: string; inDays: number; label: string }
  week: { weekdayShort: string; day: number; isToday: boolean; isFast: boolean }[]
}

type ReadyToday = Extract<Today, { status: 'ready' }>

const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi’ al-Awwal', 'Rabi’ al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah',
  'Rajab', 'Sha’ban', 'Ramadan', 'Shawwal', 'Dhul Qa’dah', 'Dhul Hijjah',
]

function time(iso: string): Time {
  const hhmm = iso.slice(11, 16)
  const [h, m] = hhmm.split(':').map(Number) as [number, number]
  return { at: Date.parse(iso), hhmm, h12: `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`, meridiem: h < 12 ? 'am' : 'pm' }
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number]
  return h * 60 + m
}

export function buildDay(today: ReadyToday, state: PrototypeState, realNow: number, elapsed: number): DayModel {
  const zone = today.location.timeZone ?? 'UTC'
  const suhoor = time(today.suhoor.at)
  const iftar = time(today.iftar.at)
  const length = iftar.at - suhoor.at
  const now =
    state === 'fasting' ? suhoor.at + 0.62 * length + elapsed
    : state === 'before-suhoor' ? suhoor.at - (112 * 60_000) + elapsed
    : realNow

  const fmt = (options: Intl.DateTimeFormatOptions, at = now) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, ...options }).format(at)
  const hijriParts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: zone, day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(now)
  const hijriPart = (type: string) => Number(hijriParts.find((p) => p.type === type)?.value)

  const startMinutes = minutes(suhoor.hhmm)
  const endMinutes = minutes(iftar.hhmm)
  const hours = []
  for (let hour = Math.floor(startMinutes / 60) + 1; hour * 60 < endMinutes; hour++) {
    hours.push({ hour, at: (hour * 60 - startMinutes) / (endMinutes - startMinutes) })
  }

  // The next Monday or Thursday after today, as a stand-in Next Fast.
  const weekdayIndex = new Date(`${today.date}T12:00:00Z`).getUTCDay()
  const inDays = [1, 2, 3, 4, 5, 6, 7].find((d) => [1, 4].includes((weekdayIndex + d) % 7))!
  const next = Date.parse(`${today.date}T12:00:00Z`) + inDays * 86_400_000
  const nextFmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(next)

  const week = Array.from({ length: 7 }, (_, i) => {
    const at = Date.parse(`${today.date}T12:00:00Z`) + i * 86_400_000
    const weekday = new Date(at).getUTCDay()
    return {
      weekdayShort: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' }).format(at),
      day: new Date(at).getUTCDate(),
      isToday: i === 0,
      isFast: i === 0 ? state !== 'not-fasting' : weekday === 1 || weekday === 4,
    }
  })

  return {
    state,
    place: today.location.name,
    region: [today.location.region, today.location.country].filter(Boolean).join(', '),
    weekday: fmt({ weekday: 'long' }),
    weekdayShort: fmt({ weekday: 'short' }),
    gregorian: fmt({ day: 'numeric', month: 'long', year: 'numeric' }),
    gregorianShort: fmt({ day: '2-digit', month: '2-digit' }).replace('/', '.'),
    hijri: `${hijriPart('day')} ${HIJRI_MONTHS[hijriPart('month') - 1]} ${hijriPart('year')}`,
    suhoor,
    iftar,
    now,
    nowHhmm: fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    progress: state === 'fasting' ? Math.min(1, Math.max(0, (now - suhoor.at) / length)) : 0,
    remaining: state === 'fasting' ? iftar.at - now : state === 'before-suhoor' ? suhoor.at - now : 0,
    hours,
    nextFast: {
      weekday: nextFmt({ weekday: 'long' }),
      date: nextFmt({ day: 'numeric', month: 'long' }),
      dateShort: nextFmt({ day: '2-digit', month: '2-digit' }).replace('/', '.'),
      inDays,
      label: 'Mondays & Thursdays',
    },
    week,
  }
}

export function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60_000))
  return { hours: Math.floor(total / 60), minutes: total % 60, seconds: Math.max(0, Math.floor(ms / 1000) % 60) }
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

/** "3 hours and 12 minutes" */
export function inWords(ms: number) {
  const { hours, minutes } = split(ms)
  if (hours === 0) return plural(minutes, 'minute')
  if (minutes === 0) return plural(hours, 'hour')
  return `${plural(hours, 'hour')} and ${plural(minutes, 'minute')}`
}

export const daysInWords = (days: number) => (days === 1 ? 'tomorrow' : `in ${NUMBER_WORDS[days] ?? days} days`)

export const daysAway = (days: number) => (days === 1 ? 'tomorrow' : `${NUMBER_WORDS[days] ?? days} days away`)
