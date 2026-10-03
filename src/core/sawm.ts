import { fetchMonth, type DayTimes, type MonthTimes, type TimesQuery } from './aladhan'
import { localDate, wallClockTime } from './dates'
import type { Device } from './device'
import { roundCoordinate, searchPlaces, type Place } from './places'

/** The one place whose times Sawm shows. Its time zone is learnt from the data source. */
export interface SavedLocation extends Place {
  timeZone?: string
}

export interface TimeOfDay {
  /** The instant, as ISO 8601 in the Saved Location's offset. */
  at: string
  /** The wall-clock time at the Saved Location, HH:mm. */
  local: string
}

/** Where the Saved Location is in its day: before Suhoor, between Suhoor and Iftar, or after Iftar. */
export type Phase = 'predawn' | 'day' | 'night'

export type Today =
  | { status: 'no-location' }
  | { status: 'ready'; location: SavedLocation; date: string; phase: Phase; suhoor: TimeOfDay; iftar: TimeOfDay }
  /** There's a Saved Location, but no times for today: offline with nothing saved, or the data source failed. */
  | { status: 'unavailable'; location: SavedLocation }

export type ThemePreference = 'system' | 'light' | 'dark'

/** Everything the user has chosen. Lives only on the device (ADR 0003). */
export interface Settings {
  savedLocation?: SavedLocation
  theme: ThemePreference
}

const DEFAULT_SETTINGS: Settings = { theme: 'system' }

/** Sawm without its screens: everything the app does, behind one interface. */
export interface Sawm {
  /** What the Today screen shows right now. */
  today(): Today
  /** The user's current choices. The same object comes back until one changes. */
  settings(): Settings
  setTheme(theme: ThemePreference): Promise<void>
  /** Cities, towns and villages matching what the user typed. */
  searchPlaces(query: string): Promise<Place[]>
  /** Makes a place the Saved Location and loads its times. */
  setSavedLocation(place: Place): Promise<void>
  /** Loads whatever today needs that isn't on the device yet. Safe to call often. */
  refresh(): Promise<void>
  /** Calls the listener whenever what the app shows may have changed. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void
}

/** Used until Calculation Methods are chosen per country: Muslim World League. */
const DEFAULT_METHOD = 3

const SETTINGS = 'settings'

export async function createSawm(device: Device): Promise<Sawm> {
  let settings: Settings = DEFAULT_SETTINGS
  const months = new Map<string, MonthTimes>()
  const loadingMonths = new Map<string, Promise<MonthTimes>>()
  const listeners = new Set<() => void>()
  let lastToday: { value: Today; json: string } | undefined

  const notify = () => listeners.forEach((listener) => listener())

  async function saveSettings(changes: Partial<Settings>) {
    settings = { ...settings, ...changes }
    await device.storage.set(SETTINGS, settings)
  }

  const query = (place: Place): TimesQuery => ({
    latitude: place.latitude,
    longitude: place.longitude,
    method: DEFAULT_METHOD,
  })

  /** The Gregorian month a date (YYYY-MM-DD) falls in at a place, and the key its times are kept under. */
  const monthOf = (place: Place, date: string) => {
    const [year, month] = date.split('-').map(Number) as [number, number]
    const { latitude, longitude, method } = query(place)
    return { year, month, key: `times:${latitude},${longitude}:${method}:${year}-${month}` }
  }

  const dayAt = (place: SavedLocation, date: string): DayTimes | undefined =>
    months.get(monthOf(place, date).key)?.days.find((day) => day.date === date)

  /** Brings the month containing the place's date at an instant into memory, if it's saved on the device. */
  async function restoreMonthFor(place: SavedLocation, instant: number) {
    if (!place.timeZone) return
    const { key } = monthOf(place, localDate(instant, place.timeZone))
    const saved = await device.storage.get<MonthTimes>(key)
    if (saved) months.set(key, saved)
  }

  /** Brings the month containing the place's date at an instant into memory: from the device if saved, else the network. */
  function loadMonthFor(place: SavedLocation, instant: number): Promise<MonthTimes> {
    const { year, month, key } = monthOf(place, localDate(instant, place.timeZone ?? 'UTC'))
    const loaded = months.get(key)
    if (loaded) return Promise.resolve(loaded)

    let loading = loadingMonths.get(key)
    if (!loading) {
      loading = (async () => {
        let times = await device.storage.get<MonthTimes>(key)
        if (!times) {
          times = await fetchMonth(device.fetch, query(place), year, month)
          await device.storage.set(key, times)
        }
        months.set(key, times)
        return times
      })().finally(() => loadingMonths.delete(key))
      loadingMonths.set(key, loading)
    }
    return loading
  }

  async function refresh() {
    let place = settings.savedLocation
    if (!place) return
    try {
      if (!place.timeZone) {
        // The time zone only arrives with the first month of times, so that month is chosen by UTC.
        const first = await loadMonthFor(place, device.clock.now())
        // The user may have chosen another place while this one was loading; that refresh takes over.
        if (settings.savedLocation !== place) return
        place = { ...place, timeZone: first.timeZone }
        await saveSettings({ savedLocation: place })
      }
      await loadMonthFor(place, device.clock.now())
    } catch {
      // Offline, or the data source failed: Today says its times are unavailable until the next refresh.
    }
    notify()
  }

  function computeToday(): Today {
    const location = settings.savedLocation
    if (!location) return { status: 'no-location' }
    const date = location.timeZone && localDate(device.clock.now(), location.timeZone)
    const day = date && dayAt(location, date)
    if (!date || !day) return { status: 'unavailable', location }
    const now = device.clock.now()
    return {
      status: 'ready',
      location,
      date,
      phase: now < Date.parse(day.fajr) ? 'predawn' : now < Date.parse(day.maghrib) ? 'day' : 'night',
      suhoor: { at: day.fajr, local: wallClockTime(day.fajr) },
      iftar: { at: day.maghrib, local: wallClockTime(day.maghrib) },
    }
  }

  // Start from what's on the device so the first screen never waits on the network; refresh() does the rest.
  settings = { ...DEFAULT_SETTINGS, ...(await device.storage.get<Settings>(SETTINGS)) }
  if (settings.savedLocation) await restoreMonthFor(settings.savedLocation, device.clock.now())

  return {
    today() {
      // The same object comes back until something on it changes, which is what React's external stores expect.
      const value = computeToday()
      const json = JSON.stringify(value)
      if (lastToday?.json !== json) lastToday = { value, json }
      return lastToday.value
    },

    searchPlaces: (text) => searchPlaces(device.fetch, text),

    settings: () => settings,

    async setTheme(theme) {
      await saveSettings({ theme })
      notify()
    },

    async setSavedLocation(place) {
      await saveSettings({
        savedLocation: { ...place, latitude: roundCoordinate(place.latitude), longitude: roundCoordinate(place.longitude) },
      })
      await refresh()
    },

    refresh,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
