/** Sawm is English end-to-end, but dates follow an English-speaking user's own conventions where we know them. */
const locale = navigator.languages.find((language) => language.toLowerCase().startsWith('en')) ?? 'en-GB'

const noon = (date: string) => Date.parse(`${date}T12:00:00Z`)

/** "Sunday", for a YYYY-MM-DD date. */
export const weekday = (date: string) => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(noon(date))

/** "Sun 4 October" (or the user's English-locale order), for a YYYY-MM-DD date. */
export const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(noon(date))

/** "4 October 2026" (or the user's English-locale order), for a YYYY-MM-DD date. */
export const longDate = (date: string) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(noon(date))
