import { fetchMonth, type DayTimes, type MonthTimes, type TimesQuery } from './aladhan'
import { addDays, daysBetween, localDate, monthAfter, shiftMinutes, wallClockTime, weekdayOf } from './dates'
import type { Device, PushSubscriptionJSON } from './device'
import { calendarExport } from './calendarExport'
import { DEFAULT_REMINDERS, reminderSchedule, type ReminderSettings } from './reminders'
import {
  DEFAULT_FOLLOWED,
  DEFAULT_OPTIONS,
  FAST_TYPES,
  forbiddenDay,
  isSkipped,
  planDay,
  withoutDate,
  type DayPlan,
  type FastOptions,
  type FastType,
  type FastTypeId,
  type FollowedFastTypes,
  type Skip,
} from './fasts'
import { baseMonths, hijriCalendar, HIJRI_MONTHS, monthKey, nextMonth, type BaseMonth, type HijriCalendar, type HijriDate } from './hijri'
import { CALCULATION_METHODS, defaultMethodFor, methodById, type CalculationMethod } from './methods'
import { placeAt, roundCoordinate, searchPlaces, type Place } from './places'

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

export interface HijriLabel extends HijriDate {
  monthName: string
}

/** Everything Sawm knows about one date at the Saved Location. */
export interface Day {
  date: string
  hijri?: HijriLabel
  suhoor: TimeOfDay
  iftar: TimeOfDay
  imsak: TimeOfDay
  plan: DayPlan
}

export interface NextFast {
  date: string
  /** Calendar days from today: 1 is tomorrow. */
  inDays: number
  label: string
}

export type Today =
  | { status: 'no-location' }
  /** There's a Saved Location, but no times for today: offline with nothing saved, or the data source failed. */
  | { status: 'unavailable'; location: SavedLocation }
  | {
      status: 'ready'
      location: SavedLocation
      phase: Phase
      /** The day the screen is about: today until today's Iftar, then tomorrow. */
      focus: Day & { isTomorrow: boolean }
      state: 'before-suhoor' | 'fasting' | 'not-fasting'
      /** Until Suhoor ends (before Suhoor) or until Iftar (fasting), rounded up to the minute. */
      countdown?: { hours: number; minutes: number }
      /** 0 to 1 through the Current Fast. */
      progress?: number
      /** Today's fast, from its Iftar until midnight. */
      fastComplete?: { label: string }
      /** The first Planned Fast after the focus day, within the months loaded. */
      nextFast: NextFast | null
      /** A Month-end Check waiting for an answer. */
      monthEndCheck?: MonthEndCheck
    }

/** The question asked on the evening of the 29th of certain months. */
export interface MonthEndCheck {
  /** The month that's ending, e.g. "1448-09" for Ramadan 1448. */
  month: string
  /** "Has Eid been announced for tomorrow?" */
  question: string
}

/** One Gregorian month of the Calendar. */
export interface CalendarMonth {
  year: number
  /** 1 for January through 12 for December. */
  month: number
  days: (Day & { isToday: boolean; isPast: boolean })[]
  /** The Hijri months this Gregorian month overlaps, in order. */
  hijriMonths: { name: string; year: number }[]
}

export type ThemePreference = 'system' | 'light' | 'dark'

/** Everything the user has chosen. Lives only on the device (ADR 0003). */
export interface Settings {
  savedLocation?: SavedLocation
  /** AlAdhan's id for the Calculation Method the user picked; unset means the default for their country. */
  calculationMethod?: number
  /** AlAdhan's latitudeAdjustmentMethod (1 middle of the night, 2 one seventh, 3 angle-based); unset is AlAdhan's default. */
  highLatitudeRule?: 1 | 2 | 3
  /** Minute Adjustments to match a local mosque's timetable, from −15 to +15. Imsak moves with Suhoor. */
  minuteAdjustments: { suhoor: number; iftar: number }
  /** Whether to show Imsak beside Suhoor. */
  showImsak: boolean
  followed: FollowedFastTypes
  fastOptions: FastOptions
  /**
   * The Hijri Offset, as changes that each apply from a Hijri month ("1448-09") onward.
   * A month uses the latest change at or before it; with none, the offset is 0.
   */
  hijriOffsets: { from: string; offset: number }[]
  /** Whether Sawm asks the Month-end Check. */
  monthEndChecks: boolean
  /** Answers to Month-end Checks, by the month that was ending. */
  monthEndAnswers: Record<string, 'yes' | 'no'>
  /** Runs of dates the user isn't fasting. */
  skips: Skip[]
  /** Dates the user added as Planned Fasts themselves. */
  oneOffs: string[]
  reminders: ReminderSettings
  /** This device's push subscription, while Reminders are on. */
  subscription?: PushSubscriptionJSON
  /** Which setup steps the user has finished or skipped. */
  setup: { fasts: boolean; reminders: boolean }
  theme: ThemePreference
}

const DEFAULT_SETTINGS: Settings = {
  minuteAdjustments: { suhoor: 0, iftar: 0 },
  showImsak: false,
  followed: DEFAULT_FOLLOWED,
  fastOptions: DEFAULT_OPTIONS,
  hijriOffsets: [],
  monthEndChecks: true,
  monthEndAnswers: {},
  skips: [],
  oneOffs: [],
  reminders: DEFAULT_REMINDERS,
  setup: { fasts: false, reminders: false },
  theme: 'system',
}

/** Sawm without its screens: everything the app does, behind one interface. */
export interface Sawm {
  /** What the Today screen shows right now. The same object comes back until something on it changes. */
  today(): Today
  /** A date at the Saved Location, if its month is loaded. */
  day(date: string): Day | undefined
  /** The months the Calendar can show: this one and the next 12. */
  calendarMonths(): { year: number; month: number }[]
  /** A month of the Calendar, if its times are loaded. */
  calendarMonth(year: number, month: number): CalendarMonth | undefined
  /** The user's current choices. The same object comes back until one changes. */
  settings(): Settings
  setTheme(theme: ThemePreference): Promise<void>
  /** The Calculation Method in use, and whether it's the default for the Saved Location's country. */
  calculationMethod(): CalculationMethod & { isDefault: boolean }
  /** Every Calculation Method the user can pick from. */
  calculationMethods(): readonly CalculationMethod[]
  /** The Calculation Method most people in a country follow. */
  defaultCalculationMethod(countryCode: string): number
  /** Picks a Calculation Method, or goes back to the country's default when given undefined. */
  setCalculationMethod(id: number | undefined): Promise<void>
  /** Changes how Suhoor and Iftar are worked out or shown: the High-Latitude Rule, Minute Adjustments, Imsak. */
  setTimePreferences(changes: Partial<Pick<Settings, 'highLatitudeRule' | 'minuteAdjustments' | 'showImsak'>>): Promise<void>
  /** Every Fast Type, and whether the user follows it. */
  fastTypes(): (FastType & { followed: boolean })[]
  /** Follows or stops following a Fast Type. The Fast of Dawud and Mondays & Thursdays exclude each other. */
  setFollowing(id: FastTypeId, followed: boolean): Promise<void>
  /** Changes the choices that shape some Fast Types. */
  setFastOptions(changes: Partial<FastOptions>): Promise<void>
  /** Moves one of the Six of Shawwal from one day of Shawwal to another. */
  moveShawwalDay(from: number, to: number): Promise<void>
  /** The Hijri Offset in effect for the month in progress. */
  hijriOffset(): number
  /** Shifts the user's Hijri calendar by up to 2 days either way, from the month in progress onward. */
  setHijriOffset(offset: number): Promise<void>
  /** Answers the pending Month-end Check: has the next month been announced for tomorrow? */
  answerMonthEndCheck(answer: 'yes' | 'no'): Promise<void>
  setMonthEndChecks(on: boolean): Promise<void>
  /** Marks a date, or a run of dates, as not fasting. Sawm never asks why. */
  skip(from: string, to?: string): Promise<void>
  /** Undoes the Skip covering a date. */
  unskip(date: string): Promise<void>
  /** Adds a date as a One-off Fast; refused on a Forbidden Day. On a Skipped date, it undoes the Skip instead. */
  addOneOff(date: string): Promise<'added' | 'unskipped' | 'forbidden'>
  removeOneOff(date: string): Promise<void>
  /** Turns Reminders on for this device: asks permission, subscribes, and uploads the Reminder Schedule. */
  enableReminders(): Promise<'on' | 'denied' | 'needs-home-screen' | 'unsupported' | 'unavailable'>
  /** Turns Reminders off, and has the server forget this device. */
  disableReminders(): Promise<void>
  /** Changes a Reminder's on/off state or timing. */
  setReminder(kind: 'suhoor' | 'iftar', changes: Partial<ReminderSettings['suhoor']>): Promise<void>
  /** Changes the Night-before Reminder. */
  setNightBefore(changes: Partial<ReminderSettings['nightBefore']>): Promise<void>
  /** Asks the server to send this device a Reminder right now, to check they arrive. */
  testReminder(): Promise<boolean>
  /** The Calendar Export: an .ics file of the next 60 days of Planned Fasts with alerts. */
  calendarExport(): string
  /** Whether this browser can get Reminders at all. */
  reminderSupport(): ReturnType<Device['push']['support']>
  /** Marks a setup step finished (or skipped). */
  completeSetup(step: keyof Settings['setup']): Promise<void>
  /** Cities, towns and villages matching what the user typed. */
  searchPlaces(query: string): Promise<Place[]>
  /** Makes a place the Saved Location and loads its times. */
  setSavedLocation(place: Place): Promise<void>
  /** Sets the Saved Location from the device's own position. */
  useCurrentLocation(): Promise<'ok' | 'denied' | 'unavailable'>
  /** Loads whatever the next 12 months need that isn't on the device yet. Safe to call often. */
  refresh(): Promise<void>
  /** Re-reads the clock, and tells subscribers if what Today shows has changed. Call it every second or so. */
  tick(): void
  /** Calls the listener whenever what the app shows may have changed. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void
  /** A number that changes whenever loaded times or settings change; handy for redrawing derived views. */
  version(): number
}

const SETTINGS = 'settings'
const LAST_UPLOAD = 'reminders:lastUpload'
/** The current month and the next 12. */
const MONTHS_AHEAD = 13

export async function createSawm(device: Device): Promise<Sawm> {
  let settings: Settings = DEFAULT_SETTINGS
  const months = new Map<string, MonthTimes>()
  const loadingMonths = new Map<string, Promise<MonthTimes>>()
  const listeners = new Set<() => void>()
  let lastToday: { value: Today; json: string } | undefined

  // Everything derived from the loaded months and the settings is rebuilt only when either changes.
  let version = 0
  let derived:
    | { version: number; days: Map<string, DayTimes>; hijriMonths: BaseMonth[]; hijri: HijriCalendar; plans: Map<string, Day> }
    | undefined

  /** The Hijri Offset for a month: the latest change at or before it. */
  function offsetFor(year: number, month: number): number {
    const key = monthKey(year, month)
    let offset = 0
    for (const change of settings.hijriOffsets) if (change.from <= key) offset = change.offset
    return offset
  }

  /** Sets the offset from a Hijri month onward, replacing any later changes. */
  function offsetFrom(key: string, offset: number) {
    return [...settings.hijriOffsets.filter((change) => change.from < key), { from: key, offset }]
  }

  const notify = () => listeners.forEach((listener) => listener())

  async function saveSettings(changes: Partial<Settings>) {
    settings = { ...settings, ...changes }
    version++
    await device.storage.set(SETTINGS, settings)
    await syncReminders()
  }

  /**
   * Uploads the Reminder Schedule when it has changed since the last upload (ADR 0003). Never throws:
   * offline, it simply tries again on the next change or refresh.
   */
  async function syncReminders() {
    const subscription = settings.subscription
    const zone = settings.savedLocation?.timeZone
    if (!settings.reminders.on || !subscription || !zone) return
    const now = device.clock.now()
    const entries = reminderSchedule({
      today: localDate(now, zone),
      now,
      dayAt,
      settings: settings.reminders,
      monthEndQuestion: (date) => monthEndQuestionOn(date, 'tomorrow'),
    })
    const body = JSON.stringify({ subscription, entries })
    if (body === (await device.storage.get<string>(LAST_UPLOAD))) return
    try {
      const response = await device.fetch('/api/reminders', { method: 'PUT', headers: { 'content-type': 'application/json' }, body })
      if (response.ok) await device.storage.set(LAST_UPLOAD, body)
    } catch {
      // Offline: the next refresh tries again.
    }
  }

  const methodFor = (place: Place) => settings.calculationMethod ?? defaultMethodFor(place.countryCode)

  const query = (place: Place): TimesQuery => ({
    latitude: place.latitude,
    longitude: place.longitude,
    method: methodFor(place),
    ...(settings.highLatitudeRule ? { highLatitudeRule: settings.highLatitudeRule } : {}),
  })

  const keyOf = (place: Place, year: number, month: number) => {
    const { latitude, longitude, method, highLatitudeRule } = query(place)
    return `times:${latitude},${longitude}:${method}${highLatitudeRule ? `/${highLatitudeRule}` : ''}:${year}-${month}`
  }

  /** Brings a Gregorian month of times into memory: from the device if saved, else the network. */
  function loadMonth(place: Place, { year, month }: { year: number; month: number }): Promise<MonthTimes> {
    const key = keyOf(place, year, month)
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
        version++
        return times
      })().finally(() => loadingMonths.delete(key))
      loadingMonths.set(key, loading)
    }
    return loading
  }

  /** Brings a month into memory only if it's already saved on the device. */
  async function restoreMonth(place: Place, at: { year: number; month: number }) {
    const key = keyOf(place, at.year, at.month)
    const saved = await device.storage.get<MonthTimes>(key)
    if (saved) {
      months.set(key, saved)
      version++
    }
  }

  async function refresh() {
    let place = settings.savedLocation
    if (!place) return
    try {
      if (!place.timeZone) {
        // The time zone only arrives with the first month of times, so that month is chosen by UTC.
        const first = await loadMonth(place, monthAfter(localDate(device.clock.now(), 'UTC'), 0))
        // The user may have chosen another place while this one was loading; that refresh takes over.
        if (settings.savedLocation !== place) return
        place = { ...place, timeZone: first.timeZone }
        await saveSettings({ savedLocation: place })
      }
      const today = localDate(device.clock.now(), place.timeZone!)
      // This month and next come first, so Today works as soon as possible.
      await Promise.all([0, 1].map((i) => loadMonth(place!, monthAfter(today, i))))
      notify()
      for (let i = 2; i < MONTHS_AHEAD; i += 3) {
        await Promise.allSettled([i, i + 1, i + 2].filter((m) => m < MONTHS_AHEAD).map((m) => loadMonth(place!, monthAfter(today, m))))
      }
    } catch {
      // Offline, or the data source failed: Today says its times are unavailable until the next refresh.
    }
    notify()
    // The browser may have replaced the push subscription (its service worker moves the schedule over); follow it.
    if (settings.reminders.on && settings.subscription) {
      const current = await device.push.current().catch(() => undefined)
      if (current && current.endpoint !== settings.subscription.endpoint) await saveSettings({ subscription: current })
    }
    await syncReminders()
  }

  function derive() {
    if (derived?.version === version) return derived
    const place = settings.savedLocation
    const days = new Map<string, DayTimes>()
    if (place) {
      const prefix = keyOf(place, 0, 0).replace(/0-0$/, '')
      for (const [key, month] of months) {
        if (key.startsWith(prefix)) for (const day of month.days) days.set(day.date, day)
      }
    }
    const hijriDays = new Map([...days].map(([date, day]) => [date, day.hijri]))
    const hijriMonths = baseMonths(hijriDays)
    derived = { version, days, hijriMonths, hijri: hijriCalendar(hijriMonths, offsetFor), plans: new Map() }
    return derived
  }

  const time = (iso: string): TimeOfDay => ({ at: iso, local: wallClockTime(iso) })

  function dayAt(date: string): Day | undefined {
    const { days, hijri, plans } = derive()
    const cached = plans.get(date)
    if (cached) return cached
    const times = days.get(date)
    if (!times) return undefined
    const userHijri = hijri.dateOf(date)
    const day: Day = {
      date,
      ...(userHijri ? { hijri: { ...userHijri, monthName: HIJRI_MONTHS[userHijri.month - 1]! } } : {}),
      suhoor: time(shiftMinutes(times.fajr, settings.minuteAdjustments.suhoor)),
      iftar: time(shiftMinutes(times.maghrib, settings.minuteAdjustments.iftar)),
      imsak: time(shiftMinutes(times.imsak, settings.minuteAdjustments.suhoor)),
      plan: userHijri
        ? planDay({ date, hijri: userHijri, makkah: times.hijri, weekday: weekdayOf(date) }, settings.followed, settings.fastOptions, settings)
        : { status: 'none' },
    }
    plans.set(date, day)
    return day
  }

  function computeToday(): Today {
    const location = settings.savedLocation
    if (!location) return { status: 'no-location' }
    if (!location.timeZone) return { status: 'unavailable', location }

    const now = device.clock.now()
    const date = localDate(now, location.timeZone)
    const today = dayAt(date)
    if (!today) return { status: 'unavailable', location }

    const suhoorToday = Date.parse(today.suhoor.at)
    const iftarToday = Date.parse(today.iftar.at)
    const isTomorrow = now >= iftarToday
    const focus = isTomorrow ? dayAt(addDays(date, 1)) : today
    if (!focus) return { status: 'unavailable', location }

    const phase: Phase = now < suhoorToday ? 'predawn' : now < iftarToday ? 'day' : 'night'
    const fastComplete = isTomorrow && today.plan.status === 'planned' ? { label: today.plan.label } : undefined

    let nextFast: NextFast | null = null
    for (let next = addDays(focus.date, 1), day = dayAt(next); day; next = addDays(next, 1), day = dayAt(next)) {
      if (day.plan.status === 'planned') {
        nextFast = { date: next, inDays: daysBetween(date, next), label: day.plan.label }
        break
      }
    }

    const monthEndCheck = pendingMonthEndCheck(date, now)
    const common = {
      status: 'ready' as const,
      location,
      phase,
      focus: { ...focus, isTomorrow },
      nextFast,
      ...(fastComplete ? { fastComplete } : {}),
      ...(monthEndCheck ? { monthEndCheck } : {}),
    }
    if (focus.plan.status !== 'planned') return { ...common, state: 'not-fasting' }

    const suhoor = Date.parse(focus.suhoor.at)
    const iftar = Date.parse(focus.iftar.at)
    if (now < suhoor) return { ...common, state: 'before-suhoor', countdown: roundUpToMinute(suhoor - now) }
    return {
      ...common,
      state: 'fasting',
      countdown: roundUpToMinute(iftar - now),
      progress: Math.round(((now - suhoor) / (iftar - suhoor)) * 1000) / 1000,
    }
  }

  /**
   * The Month-end Check waiting for an answer, if any: from Iftar on the user's 29th of Sha'ban, Ramadan and
   * Dhul Qa'dah (and of Dhul Hijjah for those following Ashura) until it's answered or the following day ends.
   */
  function pendingMonthEndCheck(date: string, now: number): MonthEndCheck | undefined {
    for (const [day29, when] of [[date, 'tomorrow'], [addDays(date, -1), 'today']] as const) {
      const day = dayAt(day29)
      if (!day?.hijri) continue
      if (when === 'tomorrow' && now < Date.parse(day.iftar.at)) continue
      const question = monthEndQuestionOn(day29, when)
      if (question) return { month: monthKey(day.hijri.year, day.hijri.month), question }
    }
    return undefined
  }

  /** The Month-end Check asked about a 29th (evening of `date`), worded for that evening or the day after. */
  function monthEndQuestionOn(date: string, when: 'tomorrow' | 'today'): string | undefined {
    if (!settings.monthEndChecks) return undefined
    const hijri = dayAt(date)?.hijri
    const checked = [8, 9, 11, ...(settings.followed.ashura ? [12] : [])]
    if (!hijri || hijri.day !== 29 || !checked.includes(hijri.month)) return undefined
    if (settings.monthEndAnswers[monthKey(hijri.year, hijri.month)]) return undefined
    const next = HIJRI_MONTHS[nextMonth(hijri.year, hijri.month).month - 1]!
    const event = hijri.month === 9 ? 'Eid' : next
    return when === 'tomorrow' ? `Has ${event} been announced for tomorrow?` : `Did ${event} begin today?`
  }

  function today(): Today {
    // The same object comes back until something on it changes, which is what React's external stores expect.
    const value = computeToday()
    const json = JSON.stringify(value)
    if (lastToday?.json !== json) lastToday = { value, json }
    return lastToday.value
  }

  async function setSavedLocation(place: Place) {
    await saveSettings({
      savedLocation: { ...place, latitude: roundCoordinate(place.latitude), longitude: roundCoordinate(place.longitude) },
    })
    await refresh()
  }

  // Start from what's on the device so the first screen never waits on the network; refresh() does the rest.
  const stored = await device.storage.get<Partial<Settings>>(SETTINGS)
  settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    followed: { ...DEFAULT_SETTINGS.followed, ...stored?.followed },
    fastOptions: { ...DEFAULT_SETTINGS.fastOptions, ...stored?.fastOptions },
    minuteAdjustments: { ...DEFAULT_SETTINGS.minuteAdjustments, ...stored?.minuteAdjustments },
    monthEndAnswers: { ...stored?.monthEndAnswers },
    setup: { ...DEFAULT_SETTINGS.setup, ...stored?.setup },
    reminders: { ...DEFAULT_SETTINGS.reminders, ...stored?.reminders, nightBefore: { ...DEFAULT_SETTINGS.reminders.nightBefore, ...stored?.reminders?.nightBefore } },
  }
  const saved = settings.savedLocation
  if (saved?.timeZone) {
    const date = localDate(device.clock.now(), saved.timeZone)
    for (let i = 0; i < MONTHS_AHEAD; i++) await restoreMonth(saved, monthAfter(date, i))
  }

  return {
    today,

    day: dayAt,

    calendarMonths() {
      const zone = settings.savedLocation?.timeZone
      if (!zone) return []
      const today = localDate(device.clock.now(), zone)
      return Array.from({ length: MONTHS_AHEAD }, (_, i) => monthAfter(today, i))
    },

    calendarMonth(year, month) {
      const zone = settings.savedLocation?.timeZone
      if (!zone) return undefined
      const today = localDate(device.clock.now(), zone)
      const first = `${year}-${String(month).padStart(2, '0')}-01`
      const days: CalendarMonth['days'] = []
      for (let date = first; date.startsWith(first.slice(0, 8)); date = addDays(date, 1)) {
        const day = dayAt(date)
        if (!day) return undefined
        days.push({ ...day, isToday: date === today, isPast: date < today })
      }
      const hijriMonths: CalendarMonth['hijriMonths'] = []
      for (const { hijri } of days) {
        if (hijri && !hijriMonths.some((m) => m.name === hijri.monthName && m.year === hijri.year)) {
          hijriMonths.push({ name: hijri.monthName, year: hijri.year })
        }
      }
      return { year, month, days, hijriMonths }
    },

    settings: () => settings,

    async setTheme(theme) {
      await saveSettings({ theme })
      notify()
    },

    calculationMethod() {
      const id = settings.calculationMethod ?? defaultMethodFor(settings.savedLocation?.countryCode ?? '')
      return { ...methodById(id), isDefault: settings.calculationMethod === undefined }
    },

    calculationMethods: () => CALCULATION_METHODS,

    defaultCalculationMethod: defaultMethodFor,

    async setCalculationMethod(id) {
      await saveSettings({ calculationMethod: id })
      await refresh()
    },

    async setTimePreferences(changes) {
      const clamp = (minutes: number) => Math.max(-15, Math.min(15, Math.round(minutes)))
      const adjusted = changes.minuteAdjustments && {
        suhoor: clamp(changes.minuteAdjustments.suhoor),
        iftar: clamp(changes.minuteAdjustments.iftar),
      }
      await saveSettings({ ...changes, ...(adjusted ? { minuteAdjustments: adjusted } : {}) })
      notify()
      if ('highLatitudeRule' in changes) await refresh()
    },

    fastTypes: () => FAST_TYPES.map((type) => ({ ...type, followed: settings.followed[type.id] })),

    async setFollowing(id, followed) {
      const changes: Partial<FollowedFastTypes> = { [id]: followed }
      // The Fast of Dawud already covers more than every Monday and Thursday; following both would overlap.
      if (followed && id === 'dawud') changes.mondaysThursdays = false
      if (followed && id === 'mondaysThursdays') changes.dawud = false
      const zone = settings.savedLocation?.timeZone
      const fastOptions =
        followed && id === 'dawud' && !settings.fastOptions.dawudStart && zone
          ? { ...settings.fastOptions, dawudStart: localDate(device.clock.now(), zone) }
          : settings.fastOptions
      await saveSettings({ followed: { ...settings.followed, ...changes }, fastOptions })
      notify()
    },

    async setFastOptions(changes) {
      await saveSettings({ fastOptions: { ...settings.fastOptions, ...changes } })
      notify()
    },

    hijriOffset() {
      const zone = settings.savedLocation?.timeZone
      const hijri = zone ? dayAt(localDate(device.clock.now(), zone))?.hijri : undefined
      return hijri ? offsetFor(hijri.year, hijri.month) : (settings.hijriOffsets.at(-1)?.offset ?? 0)
    },

    async setHijriOffset(offset) {
      const clamped = Math.max(-2, Math.min(2, Math.round(offset)))
      const zone = settings.savedLocation?.timeZone
      const hijri = zone ? dayAt(localDate(device.clock.now(), zone))?.hijri : undefined
      const from = hijri ? monthKey(hijri.year, hijri.month) : '0000-00'
      await saveSettings({ hijriOffsets: offsetFrom(from, clamped) })
      notify()
    },

    async answerMonthEndCheck(answer) {
      const zone = settings.savedLocation?.timeZone
      if (!zone) return
      const check = pendingMonthEndCheck(localDate(device.clock.now(), zone), device.clock.now())
      if (!check) return
      const [year, month] = check.month.split('-').map(Number) as [number, number]
      const next = nextMonth(year, month)
      const { hijri, hijriMonths } = derive()
      const day29 = addDays(hijri.startOf(year, month)!, 28)
      const nextStart = addDays(day29, answer === 'yes' ? 1 : 2)
      const baseStart = hijriMonths.find((m) => m.year === next.year && m.month === next.month)?.start
      if (!baseStart) return
      await saveSettings({
        hijriOffsets: offsetFrom(monthKey(next.year, next.month), daysBetween(baseStart, nextStart)),
        monthEndAnswers: { ...settings.monthEndAnswers, [check.month]: answer },
      })
      notify()
    },

    async setMonthEndChecks(on) {
      await saveSettings({ monthEndChecks: on })
      notify()
    },

    async skip(from, to = from) {
      const [start, end] = from <= to ? [from, to] : [to, from]
      await saveSettings({ skips: [...settings.skips, { from: start, to: end }] })
      notify()
    },

    async unskip(date) {
      await saveSettings({ skips: withoutDate(settings.skips, date, addDays) })
      notify()
    },

    async addOneOff(date) {
      const hijri = dayAt(date)?.hijri
      if (hijri && forbiddenDay(hijri)) return 'forbidden'
      if (isSkipped(date, settings.skips)) {
        await saveSettings({ skips: withoutDate(settings.skips, date, addDays) })
        notify()
        return 'unskipped'
      }
      if (!settings.oneOffs.includes(date)) await saveSettings({ oneOffs: [...settings.oneOffs, date].sort() })
      notify()
      return 'added'
    },

    async removeOneOff(date) {
      await saveSettings({ oneOffs: settings.oneOffs.filter((d) => d !== date) })
      notify()
    },

    async moveShawwalDay(from, to) {
      const days = settings.fastOptions.shawwalDays
      if (!days.includes(from) || days.includes(to) || to < 2 || to > 30) return
      await saveSettings({
        fastOptions: { ...settings.fastOptions, shawwalDays: days.map((day) => (day === from ? to : day)).sort((a, b) => a - b) },
      })
      notify()
    },

    reminderSupport: () => device.push.support(),

    calendarExport() {
      const zone = settings.savedLocation?.timeZone
      const now = device.clock.now()
      return calendarExport(zone ? localDate(now, zone) : localDate(now, 'UTC'), now, dayAt, settings.reminders)
    },

    async enableReminders() {
      const support = device.push.support()
      if (support !== 'supported') return support
      let publicKey: string
      try {
        publicKey = ((await (await device.fetch('/api/reminders/key')).json()) as { publicKey: string }).publicKey
      } catch {
        return 'unavailable'
      }
      const subscription = await device.push.subscribe(publicKey)
      if (subscription === 'denied' || subscription === 'unavailable') return subscription
      await saveSettings({ subscription, reminders: { ...settings.reminders, on: true } })
      notify()
      return 'on'
    },

    async disableReminders() {
      const endpoint = settings.subscription?.endpoint
      await saveSettings({ reminders: { ...settings.reminders, on: false }, subscription: undefined })
      await device.storage.set(LAST_UPLOAD, undefined)
      notify()
      if (endpoint) {
        await device.fetch('/api/reminders', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint }) }).catch(() => undefined)
        await device.push.unsubscribe().catch(() => undefined)
      }
    },

    async setReminder(kind, changes) {
      const minutesBefore = changes.minutesBefore === undefined ? undefined : Math.max(0, Math.min(180, Math.round(changes.minutesBefore)))
      await saveSettings({
        reminders: { ...settings.reminders, [kind]: { ...settings.reminders[kind], ...changes, ...(minutesBefore === undefined ? {} : { minutesBefore }) } },
      })
      notify()
    },

    async setNightBefore(changes) {
      const time = changes.time && /^\d{2}:\d{2}$/.test(changes.time) ? changes.time : undefined
      await saveSettings({
        reminders: { ...settings.reminders, nightBefore: { ...settings.reminders.nightBefore, ...changes, ...(time ? { time } : {}) } },
      })
      notify()
    },

    async testReminder() {
      const subscription = settings.subscription
      if (!settings.reminders.on || !subscription) return false
      try {
        const response = await device.fetch('/api/reminders/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })
        return response.ok
      } catch {
        return false
      }
    },

    async completeSetup(step) {
      await saveSettings({ setup: { ...settings.setup, [step]: true } })
      notify()
    },

    searchPlaces: (text) => searchPlaces(device.fetch, text),

    setSavedLocation,

    async useCurrentLocation() {
      const position = await device.geolocation.current()
      if (position.status !== 'ok') return position.status
      try {
        const place = await placeAt(device.fetch, position.latitude, position.longitude)
        if (!place) return 'unavailable'
        await setSavedLocation(place)
        return 'ok'
      } catch {
        return 'unavailable'
      }
    },

    refresh,

    tick() {
      const before = lastToday?.json
      today()
      if (before !== undefined && lastToday?.json !== before) notify()
    },

    version: () => version,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function roundUpToMinute(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 60_000))
  return { hours: Math.floor(total / 60), minutes: total % 60 }
}
