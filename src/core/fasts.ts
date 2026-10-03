import { daysBetween } from './dates'
import type { HijriDate } from './hijri'

export type FastTypeId =
  | 'ramadan'
  | 'arafah'
  | 'ashura'
  | 'sixOfShawwal'
  | 'firstNine'
  | 'whiteDays'
  | 'mondaysThursdays'
  | 'dawud'

export interface FastType {
  id: FastTypeId
  label: string
  description: string
}

/** Every Fast Type, in label order: when a date matches several, the first one here names it. */
export const FAST_TYPES: readonly FastType[] = [
  { id: 'ramadan', label: 'Ramadan', description: 'Every day of the month of Ramadan.' },
  { id: 'arafah', label: 'Day of Arafah', description: 'The 9th of Dhul Hijjah.' },
  { id: 'ashura', label: 'Ashura', description: 'The 10th of Muharram, with the 9th (or the 11th).' },
  { id: 'sixOfShawwal', label: 'Six of Shawwal', description: 'Six days after Eid al-Fitr; 2–7 Shawwal unless you move them.' },
  { id: 'firstNine', label: 'First Nine of Dhul Hijjah', description: 'The 1st to the 9th of Dhul Hijjah.' },
  { id: 'whiteDays', label: 'White Days', description: 'The 13th, 14th and 15th of every Hijri month.' },
  { id: 'mondaysThursdays', label: 'Mondays & Thursdays', description: 'Every Monday and Thursday.' },
  { id: 'dawud', label: 'Fast of Dawud', description: 'Every other day, from a day you choose.' },
]

export const ONE_OFF_LABEL = 'One-off Fast'

/** Which Fast Types the user follows. */
export type FollowedFastTypes = Record<FastTypeId, boolean>

export const DEFAULT_FOLLOWED: FollowedFastTypes = {
  ramadan: true,
  arafah: false,
  ashura: false,
  sixOfShawwal: false,
  firstNine: false,
  whiteDays: false,
  mondaysThursdays: false,
  dawud: false,
}

/** The choices that shape some Fast Types. */
export interface FastOptions {
  /** The first day of the Fast of Dawud (YYYY-MM-DD). */
  dawudStart?: string
  /** Which days of Shawwal the Six of Shawwal fall on. */
  shawwalDays: number[]
  /** Whether the Day of Arafah follows the user's own Hijri Date or the Makkah Date. */
  arafahReference: 'local' | 'makkah'
  /** The day fasted with Ashura (the 10th of Muharram). */
  ashuraPairing: '9-10' | '10-11'
}

export const DEFAULT_OPTIONS: FastOptions = {
  shawwalDays: [2, 3, 4, 5, 6, 7],
  arafahReference: 'local',
  ashuraPairing: '9-10',
}

export type ForbiddenDay = 'Eid al-Fitr' | 'Eid al-Adha' | 'Day of Tashreeq'

export type DayPlan =
  /** `oneOff` is true when the user added this date themselves. */
  | { status: 'planned'; label: string; types: FastTypeId[]; oneOff?: true }
  /** The user isn't fasting a date that would otherwise be a Planned Fast. */
  | { status: 'skipped'; label: string }
  | { status: 'forbidden'; reason: ForbiddenDay }
  | { status: 'none' }

/** A run of dates the user isn't fasting (from and to inclusive, YYYY-MM-DD). */
export interface Skip {
  from: string
  to: string
}

/** The user's own changes to the plan. */
export interface PlanChanges {
  skips: Skip[]
  oneOffs: string[]
}

/** A day on which fasting is not allowed, whatever the user follows. */
export function forbiddenDay(hijri: HijriDate): ForbiddenDay | undefined {
  if (hijri.month === 10 && hijri.day === 1) return 'Eid al-Fitr'
  if (hijri.month === 12 && hijri.day === 10) return 'Eid al-Adha'
  if (hijri.month === 12 && hijri.day >= 11 && hijri.day <= 13) return 'Day of Tashreeq'
  return undefined
}

export interface PlanInput {
  date: string
  /** The user's Hijri Date. */
  hijri: HijriDate
  /** The Makkah Date: the data source's Hijri Date with no Hijri Offset. */
  makkah?: HijriDate
  /** 0 for Sunday through 6 for Saturday. */
  weekday: number
}

/** The Fast Types a date matches, before Forbidden Days, Skips and One-off Fasts are considered. */
export function matchingFastTypes({ date, hijri, makkah, weekday }: PlanInput, followed: FollowedFastTypes, options: FastOptions): FastTypeId[] {
  const arafahDate = options.arafahReference === 'makkah' && makkah ? makkah : hijri
  const ashuraDays = options.ashuraPairing === '9-10' ? [9, 10] : [10, 11]
  const matches: Record<FastTypeId, boolean> = {
    ramadan: hijri.month === 9,
    arafah: arafahDate.month === 12 && arafahDate.day === 9,
    ashura: hijri.month === 1 && ashuraDays.includes(hijri.day),
    sixOfShawwal: hijri.month === 10 && options.shawwalDays.includes(hijri.day),
    firstNine: hijri.month === 12 && hijri.day <= 9,
    whiteDays: hijri.day >= 13 && hijri.day <= 15,
    mondaysThursdays: weekday === 1 || weekday === 4,
    dawud: options.dawudStart !== undefined && daysBetween(options.dawudStart, date) >= 0 && daysBetween(options.dawudStart, date) % 2 === 0,
  }
  return FAST_TYPES.filter((type) => followed[type.id] && matches[type.id]).map((type) => type.id)
}

export const isSkipped = (date: string, skips: readonly Skip[]) => skips.some((skip) => date >= skip.from && date <= skip.to)

/** Whether a date is a Planned Fast, and why. Forbidden Days override everything, then Skips, then One-off Fasts. */
export function planDay(input: PlanInput, followed: FollowedFastTypes, options: FastOptions, changes: PlanChanges): DayPlan {
  const forbidden = forbiddenDay(input.hijri)
  if (forbidden) return { status: 'forbidden', reason: forbidden }
  const types = matchingFastTypes(input, followed, options)
  const oneOff = changes.oneOffs.includes(input.date)
  const label = FAST_TYPES.find((type) => type.id === types[0])?.label ?? (oneOff ? ONE_OFF_LABEL : undefined)
  if (!label) return { status: 'none' }
  if (isSkipped(input.date, changes.skips)) return { status: 'skipped', label }
  return { status: 'planned', label, types, ...(oneOff ? { oneOff: true as const } : {}) }
}

/** Removes one date from a set of Skips, splitting any run it falls inside. */
export function withoutDate(skips: readonly Skip[], date: string, addDays: (date: string, days: number) => string): Skip[] {
  return skips.flatMap((skip) => {
    if (date < skip.from || date > skip.to) return [skip]
    const parts: Skip[] = []
    if (skip.from < date) parts.push({ from: skip.from, to: addDays(date, -1) })
    if (date < skip.to) parts.push({ from: addDays(date, 1), to: skip.to })
    return parts
  })
}
