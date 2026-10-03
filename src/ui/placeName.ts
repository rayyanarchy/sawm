import type { Place } from '../core'

/** "Karachi, Sindh, Pakistan" */
export function placeName({ name, region, country }: Place): string {
  return [name, region, country].filter(Boolean).join(', ')
}
