import type { HijriDate } from './hijri'

export type FastTypeId = 'ramadan'

export interface FastType {
  id: FastTypeId
  label: string
  description: string
}

export const FAST_TYPES: readonly FastType[] = [
  { id: 'ramadan', label: 'Ramadan', description: 'Every day of the month of Ramadan.' },
]

/** Which Fast Types the user follows. */
export type FollowedFastTypes = Record<FastTypeId, boolean>

export const DEFAULT_FOLLOWED: FollowedFastTypes = { ramadan: true }

export type ForbiddenDay = 'Eid al-Fitr' | 'Eid al-Adha' | 'Day of Tashreeq'

export type DayPlan =
  | { status: 'planned'; label: string; types: FastTypeId[] }
  | { status: 'forbidden'; reason: ForbiddenDay }
  | { status: 'none' }

/** A day on which fasting is not allowed, whatever the user follows. */
export function forbiddenDay(hijri: HijriDate): ForbiddenDay | undefined {
  if (hijri.month === 10 && hijri.day === 1) return 'Eid al-Fitr'
  if (hijri.month === 12 && hijri.day === 10) return 'Eid al-Adha'
  if (hijri.month === 12 && hijri.day >= 11 && hijri.day <= 13) return 'Day of Tashreeq'
  return undefined
}

/** Whether a date is a Planned Fast, and why. */
export function planDay(hijri: HijriDate, followed: FollowedFastTypes): DayPlan {
  const forbidden = forbiddenDay(hijri)
  if (forbidden) return { status: 'forbidden', reason: forbidden }

  const types: FastTypeId[] = []
  if (followed.ramadan && hijri.month === 9) types.push('ramadan')

  const first = FAST_TYPES.find((type) => types.includes(type.id))
  return first ? { status: 'planned', label: first.label, types } : { status: 'none' }
}
