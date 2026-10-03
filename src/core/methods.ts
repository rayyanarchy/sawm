/** A Calculation Method, by AlAdhan's id, with the plain name the user sees. */
export interface CalculationMethod {
  id: number
  name: string
  /** Who defines it, when the name alone doesn't say. */
  authority?: string
}

export const CALCULATION_METHODS: readonly CalculationMethod[] = [
  { id: 3, name: 'Muslim World League' },
  { id: 2, name: 'ISNA', authority: 'Islamic Society of North America' },
  { id: 1, name: 'Karachi', authority: 'University of Islamic Sciences, Karachi' },
  { id: 4, name: 'Umm al-Qura', authority: 'Umm al-Qura University, Makkah' },
  { id: 5, name: 'Egypt', authority: 'Egyptian General Authority of Survey' },
  { id: 15, name: 'Moonsighting Committee', authority: 'Moonsighting Committee Worldwide' },
  { id: 8, name: 'Gulf Region' },
  { id: 16, name: 'Dubai' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 23, name: 'Jordan', authority: 'Ministry of Awqaf, Jordan' },
  { id: 13, name: 'Turkey', authority: 'Diyanet' },
  { id: 14, name: 'Russia', authority: 'Spiritual Administration of Muslims of Russia' },
  { id: 12, name: 'France', authority: 'UOIF' },
  { id: 22, name: 'Portugal', authority: 'Comunidade Islâmica de Lisboa' },
  { id: 18, name: 'Tunisia' },
  { id: 19, name: 'Algeria' },
  { id: 21, name: 'Morocco' },
  { id: 11, name: 'Singapore', authority: 'MUIS' },
  { id: 17, name: 'Malaysia', authority: 'JAKIM' },
  { id: 20, name: 'Indonesia', authority: 'Kemenag' },
  { id: 7, name: 'Tehran', authority: 'Institute of Geophysics, University of Tehran' },
  { id: 0, name: 'Shia Ithna-Ashari', authority: 'Leva Institute, Qum' },
]

const MUSLIM_WORLD_LEAGUE = 3

/** The method most people in a country follow, where AlAdhan has one; Muslim World League otherwise. */
const BY_COUNTRY: Record<string, number> = {
  PK: 1, IN: 1, BD: 1, AF: 1,
  SA: 4, YE: 4,
  US: 2, CA: 2,
  EG: 5, SD: 5, LY: 5,
  AE: 8, OM: 8, BH: 8,
  KW: 9,
  QA: 10,
  JO: 23,
  TR: 13,
  RU: 14,
  FR: 12,
  PT: 22,
  TN: 18,
  DZ: 19,
  MA: 21,
  SG: 11,
  MY: 17, BN: 17,
  ID: 20,
  IR: 7,
}

export function defaultMethodFor(countryCode: string): number {
  return BY_COUNTRY[countryCode.toUpperCase()] ?? MUSLIM_WORLD_LEAGUE
}

export function methodById(id: number): CalculationMethod {
  return CALCULATION_METHODS.find((method) => method.id === id) ?? { id, name: `Method ${id}` }
}
