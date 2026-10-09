import { describe, expect, it, vi } from 'vitest'
import { createSawm } from '.'
import { createFakeDevice } from './testing/fakeDevice'

describe('Saved Location', () => {
  it('searching for a city lists matching places, best match first', async () => {
    const { device } = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(device)

    const places = await sawm.searchPlaces('Karachi')

    expect(places[0]).toEqual({
      name: 'Karachi',
      region: 'Sindh',
      country: 'Pakistan',
      countryCode: 'PK',
      latitude: 24.85,
      longitude: 67.02,
    })
    expect(places.map((place) => `${place.name}, ${place.country}`)).toEqual([
      'Karachi, Pakistan',
      'Karachi, Pakistan',
      'Karachiya, India',
      'Karachiivtsi, Ukraine',
      'Karachital, Uzbekistan',
    ])
  })

  it('keeps the place chosen last when an earlier choice is still loading', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    const places = await sawm.searchPlaces('Karachi')
    const karachi = places.find((place) => place.country === 'Pakistan')!
    const karachiya = places.find((place) => place.country === 'India')!
    const timesRequests = () => fake.requests.filter((url) => url.includes('aladhan'))
    fake.holdResponses()

    const first = sawm.setSavedLocation(karachi)
    await vi.waitFor(() => expect(timesRequests()).toHaveLength(1))
    const second = sawm.setSavedLocation(karachiya)
    await vi.waitFor(() => expect(timesRequests()).toHaveLength(2))
    fake.releaseResponses('newest-first')
    await Promise.all([first, second])

    expect(sawm.today()).toMatchObject({
      location: { name: 'Karachiya', timeZone: 'Asia/Kolkata' },
      focus: { suhoor: { local: '05:15' }, iftar: { local: '18:22' } },
    })
  })

  it("uses the device's position, named after its town and rounded before it leaves the device", async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z', position: { latitude: 24.8607, longitude: 67.0011 } })
    const sawm = await createSawm(fake.device)

    expect(await sawm.useCurrentLocation()).toBe('ok')

    expect(sawm.today()).toMatchObject({
      status: 'ready',
      location: { name: 'Karachi', region: 'Sindh', country: 'Pakistan', countryCode: 'PK', latitude: 24.86, longitude: 67 },
      focus: { suhoor: { local: '05:09' }, iftar: { local: '18:16' } },
    })
    expect(fake.requests).toContain('https://photon.komoot.io/reverse?lat=24.86&lon=67&lang=en')
  })

  it('says so when location access is denied, so the user can search instead', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z', position: 'denied' })
    const sawm = await createSawm(fake.device)

    expect(await sawm.useCurrentLocation()).toBe('denied')
    expect(sawm.today()).toEqual({ status: 'no-location' })
  })
})

describe('Calculation Method', () => {
  it("defaults to the Saved Location's country, and to Muslim World League elsewhere", async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    fake.goOffline()
    const sawm = await createSawm(fake.device)
    const defaults: Record<string, string> = {}

    for (const countryCode of ['PK', 'IN', 'SA', 'US', 'CA', 'GB', 'EG', 'TR', 'MY', 'ID', 'SG', 'AE', 'FR', 'NG']) {
      await sawm.setSavedLocation({ name: 'Somewhere', country: 'Somewhere', countryCode, latitude: 1, longitude: 1 })
      defaults[countryCode] = sawm.calculationMethod().name
    }

    expect(defaults).toEqual({
      PK: 'Karachi',
      IN: 'Karachi',
      SA: 'Umm al-Qura',
      US: 'ISNA',
      CA: 'ISNA',
      GB: 'Muslim World League',
      EG: 'Egypt',
      TR: 'Turkey',
      MY: 'Malaysia',
      ID: 'Indonesia',
      SG: 'Singapore',
      AE: 'Gulf Region',
      FR: 'France',
      NG: 'Muslim World League',
    })
    expect(sawm.calculationMethod().isDefault).toBe(true)
  })

  it('loads times again when the user picks another Calculation Method', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    const [karachi] = await sawm.searchPlaces('Karachi')
    await sawm.setSavedLocation(karachi!)

    await sawm.setCalculationMethod(3)

    expect(sawm.calculationMethod()).toMatchObject({ id: 3, name: 'Muslim World League', isDefault: false })
    expect(fake.requests).toContain(
      'https://api.aladhan.com/v1/calendar/2026/10?latitude=24.85&longitude=67.02&method=3&iso8601=true',
    )
    expect(sawm.today()).toMatchObject({ status: 'ready', focus: { suhoor: { local: '05:09' } } })
  })
})

describe('Today', () => {
  it('asks for a Saved Location when there is none', async () => {
    const { device } = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(device)

    expect(sawm.today()).toEqual({ status: 'no-location' })
  })

  it("shows today's Suhoor and Iftar at the Saved Location, with its Hijri Date", async () => {
    const { device } = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(device)
    const [karachi] = await sawm.searchPlaces('Karachi')

    await sawm.setSavedLocation(karachi!)

    expect(sawm.today()).toMatchObject({
      status: 'ready',
      location: { ...karachi, timeZone: 'Asia/Karachi' },
      phase: 'day',
      focus: {
        date: '2026-10-04',
        isTomorrow: false,
        hijri: { day: 23, month: 4, monthName: 'Rabi’ al-Thani', year: 1448 },
        suhoor: { at: '2026-10-04T05:09:00+05:00', local: '05:09' },
        iftar: { at: '2026-10-04T18:16:00+05:00', local: '18:16' },
      },
    })
  })

  it('knows whether it is before Suhoor, between Suhoor and Iftar, or after Iftar', async () => {
    const fake = createFakeDevice({ now: '2026-10-03T22:00:00Z' }) // 03:00 on 4 October in Karachi
    const sawm = await createSawm(fake.device)
    const [karachi] = await sawm.searchPlaces('Karachi')
    await sawm.setSavedLocation(karachi!)
    expect(sawm.today()).toMatchObject({ focus: { date: '2026-10-04' }, phase: 'predawn' })

    fake.setNow('2026-10-04T07:00:00Z') // noon
    expect(sawm.today()).toMatchObject({ phase: 'day' })

    fake.setNow('2026-10-04T15:00:00Z') // 20:00, after Iftar at 18:16
    expect(sawm.today()).toMatchObject({ phase: 'night' })
  })

  it("judges what day it is by the Saved Location's clock, not the device's", async () => {
    // 20:30 on 3 October in UTC is already 01:30 on 4 October in Karachi.
    const { device } = createFakeDevice({ now: '2026-10-03T20:30:00Z' })
    const sawm = await createSawm(device)
    const [karachi] = await sawm.searchPlaces('Karachi')

    await sawm.setSavedLocation(karachi!)

    expect(sawm.today()).toMatchObject({
      focus: { date: '2026-10-04', suhoor: { local: '05:09' }, iftar: { local: '18:16' } },
    })
  })

  it("loads the next month when the Saved Location's day has already crossed into it", async () => {
    // 20:00 on 31 October in UTC is 01:00 on 1 November in Karachi.
    const { device } = createFakeDevice({ now: '2026-10-31T20:00:00Z' })
    const sawm = await createSawm(device)
    const [karachi] = await sawm.searchPlaces('Karachi')

    await sawm.setSavedLocation(karachi!)

    expect(sawm.today()).toMatchObject({
      focus: { date: '2026-11-01', suhoor: { local: '05:22' }, iftar: { local: '17:52' } },
    })
  })

  it("says today's times are unavailable when there's no connection and nothing saved", async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    const [karachi] = await sawm.searchPlaces('Karachi')
    fake.goOffline()

    await sawm.setSavedLocation(karachi!)

    expect(sawm.today()).toEqual({ status: 'unavailable', location: karachi })
  })

  it('loads the times once the connection is back', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    const [karachi] = await sawm.searchPlaces('Karachi')
    fake.goOffline()
    await sawm.setSavedLocation(karachi!)
    fake.goOnline()

    await sawm.refresh()

    expect(sawm.today()).toMatchObject({ status: 'ready', focus: { suhoor: { local: '05:09' }, iftar: { local: '18:16' } } })
  })

  it('remembers the Saved Location and its times after a restart, without going online', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const before = await createSawm(fake.device)
    const [karachi] = await before.searchPlaces('Karachi')
    await before.setSavedLocation(karachi!)
    fake.goOffline()
    const requestsBeforeRestart = fake.requests.length

    const after = await createSawm(fake.device)

    expect(after.today()).toMatchObject({
      status: 'ready',
      location: { name: 'Karachi' },
      focus: { date: '2026-10-04', suhoor: { local: '05:09' }, iftar: { local: '18:16' } },
    })
    expect(fake.requests).toHaveLength(requestsBeforeRestart)
  })

  it("starts from what's saved on the device, and leaves the network to refresh", async () => {
    const fake = createFakeDevice({ now: '2026-10-31T06:00:00Z' })
    const before = await createSawm(fake.device)
    const [karachi] = await before.searchPlaces('Karachi')
    await before.setSavedLocation(karachi!)
    fake.setNow('2026-11-01T06:00:00Z')
    const requestsBeforeRestart = fake.requests.length

    const after = await createSawm(fake.device)

    expect(fake.requests).toHaveLength(requestsBeforeRestart)
    expect(after.today()).toMatchObject({ status: 'ready', focus: { date: '2026-11-01', suhoor: { local: '05:22' } } })
    await after.refresh()
    expect(fake.requests.slice(requestsBeforeRestart)).toEqual([
      'https://api.aladhan.com/v1/calendar/2027/11?latitude=24.85&longitude=67.02&method=1&iso8601=true',
    ])
  })

  it('loads the current month and the next 12', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    const [karachi] = await sawm.searchPlaces('Karachi')

    await sawm.setSavedLocation(karachi!)

    const months = fake.requests.filter((url) => url.includes('aladhan')).map((url) => url.match(/calendar\/(\d+\/\d+)/)![1])
    expect(months.sort()).toEqual(
      ['2026/10', '2026/11', '2026/12', '2027/1', '2027/2', '2027/3', '2027/4', '2027/5', '2027/6', '2027/7', '2027/8', '2027/9', '2027/10'].sort(),
    )
  })

  it('moves on to a new month after midnight at the Saved Location, once refreshed', async () => {
    const fake = createFakeDevice({ now: '2026-10-31T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    const [karachi] = await sawm.searchPlaces('Karachi')
    await sawm.setSavedLocation(karachi!)
    expect(sawm.today()).toMatchObject({ focus: { date: '2026-10-31', suhoor: { local: '05:21' } } })

    fake.setNow('2026-10-31T19:30:00Z') // 00:30 on 1 November in Karachi
    await sawm.refresh()

    expect(sawm.today()).toMatchObject({ focus: { date: '2026-11-01', suhoor: { local: '05:22' }, iftar: { local: '17:52' } } })
  })

  it('asks the data source once when refreshed several times at once', async () => {
    const fake = createFakeDevice({ now: '2026-10-31T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    const [karachi] = await sawm.searchPlaces('Karachi')
    await sawm.setSavedLocation(karachi!)
    fake.setNow('2026-10-31T19:30:00Z') // 00:30 on 1 November in Karachi

    await Promise.all([sawm.refresh(), sawm.refresh(), sawm.refresh()])

    expect(fake.requests.filter((url) => url.includes('/calendar/2026/11'))).toHaveLength(1)
  })

  it('tells subscribers when what Today shows may have changed', async () => {
    const { device } = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(device)
    const [karachi] = await sawm.searchPlaces('Karachi')
    const seen: string[] = []
    sawm.subscribe(() => seen.push(sawm.today().status))

    await sawm.setSavedLocation(karachi!)

    expect(seen.at(-1)).toBe('ready')
  })

  it('gives the same Today until something on it changes, so screens can tell when to redraw', async () => {
    const { device } = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(device)
    const [karachi] = await sawm.searchPlaces('Karachi')
    await sawm.setSavedLocation(karachi!)

    expect(sawm.today()).toBe(sawm.today())
  })
})

describe('Privacy', () => {
  it('rounds a precise position to about 1 km before it leaves the device', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    const [karachi] = await sawm.searchPlaces('Karachi')

    await sawm.setSavedLocation({ ...karachi!, latitude: 24.8546842, longitude: 67.0207055 })

    const coordinates = fake.requests.flatMap((url) => {
      const params = new URL(url).searchParams
      return ['latitude', 'longitude', 'lat', 'lon'].flatMap((name) => params.get(name) ?? [])
    })
    expect(coordinates).not.toHaveLength(0)
    for (const coordinate of coordinates) expect(coordinate).toMatch(/^-?\d+(\.\d{1,2})?$/)
    expect(sawm.today()).toMatchObject({ location: { latitude: 24.85, longitude: 67.02 } })
  })
})

describe('Settings', () => {
  it('follows the system theme until the user picks one, and remembers the pick', async () => {
    const fake = createFakeDevice({ now: '2026-10-04T06:00:00Z' })
    const sawm = await createSawm(fake.device)
    expect(sawm.settings().theme).toBe('system')

    await sawm.setTheme('dark')
    const restarted = await createSawm(fake.device)

    expect(restarted.settings().theme).toBe('dark')
  })
})

/** A Sawm with Karachi as its Saved Location, at a given instant. */
async function karachiAt(now: string) {
  const fake = createFakeDevice({ now })
  const sawm = await createSawm(fake.device)
  const [karachi] = await sawm.searchPlaces('Karachi')
  await sawm.setSavedLocation(karachi!)
  return { sawm, fake }
}

describe('Planned Fasts', () => {
  it('plans every day of Ramadan, and shows the Next Fast while it is still months away', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    expect(sawm.today()).toMatchObject({
      state: 'not-fasting',
      nextFast: { date: '2027-02-08', inDays: 127, label: 'Ramadan' },
    })
    expect(sawm.day('2027-02-08')).toMatchObject({ hijri: { day: 1, month: 9, monthName: 'Ramadan' }, plan: { status: 'planned', label: 'Ramadan' } })
    expect(sawm.day('2027-03-08')).toMatchObject({ hijri: { day: 29, month: 9 }, plan: { status: 'planned' } })
  })

  it('never plans a fast on Eid al-Fitr', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    expect(sawm.day('2027-03-09')).toMatchObject({ hijri: { day: 1, month: 10, monthName: 'Shawwal' }, plan: { status: 'forbidden', reason: 'Eid al-Fitr' } })
  })

  it('has no Next Fast when the user follows no fasts', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    await sawm.setFollowing('ramadan', false)

    expect(sawm.today()).toMatchObject({ state: 'not-fasting', nextFast: null })
    expect(sawm.fastTypes().filter((type) => type.followed)).toEqual([])
  })
})

describe('Countdown', () => {
  it('counts down to the end of Suhoor before dawn on a Planned Fast', async () => {
    const { sawm } = await karachiAt('2027-02-07T22:00:00Z') // 03:00 on 1 Ramadan, Suhoor ends at 05:53

    expect(sawm.today()).toMatchObject({
      state: 'before-suhoor',
      phase: 'predawn',
      focus: { date: '2027-02-08', isTomorrow: false, plan: { label: 'Ramadan' } },
      countdown: { hours: 2, minutes: 53 },
    })
  })

  it('counts down to Iftar, with progress through the fast', async () => {
    const { sawm } = await karachiAt('2027-02-08T07:00:00Z') // noon; the fast runs 05:53 to 18:21

    expect(sawm.today()).toMatchObject({
      state: 'fasting',
      countdown: { hours: 6, minutes: 21 },
      progress: 0.491,
    })
  })

  it('moves on to tomorrow at Iftar, and marks the fast complete until midnight', async () => {
    const { sawm, fake } = await karachiAt('2027-02-08T13:30:00Z') // 18:30, just after Iftar at 18:21

    expect(sawm.today()).toMatchObject({
      state: 'before-suhoor',
      phase: 'night',
      focus: { date: '2027-02-09', isTomorrow: true },
      fastComplete: { label: 'Ramadan' },
    })

    fake.setNow('2027-02-08T19:30:00Z') // 00:30 the next day
    expect(sawm.today()).not.toHaveProperty('fastComplete')
    expect(sawm.today()).toMatchObject({ focus: { date: '2027-02-09', isTomorrow: false } })
  })

  it('after the last Iftar of Ramadan, shows Eid as a day without a fast', async () => {
    const { sawm } = await karachiAt('2027-03-08T14:00:00Z') // 19:00 on 29 Ramadan

    expect(sawm.today()).toMatchObject({
      state: 'not-fasting',
      focus: { date: '2027-03-09', plan: { status: 'forbidden', reason: 'Eid al-Fitr' } },
      fastComplete: { label: 'Ramadan' },
    })
  })

  it('tells subscribers when the countdown moves on a minute', async () => {
    const { sawm, fake } = await karachiAt('2027-02-08T07:00:00Z')
    let calls = 0
    sawm.subscribe(() => calls++)

    sawm.tick()
    expect(calls).toBe(0)
    fake.setNow('2027-02-08T07:01:00Z')
    sawm.tick()
    expect(calls).toBe(1)
  })
})

describe('Setup', () => {
  it('starts with Ramadan followed, and remembers when the fasts step is done', async () => {
    const { sawm, fake } = await karachiAt('2026-10-04T06:00:00Z')
    expect(sawm.settings()).toMatchObject({ followed: { ramadan: true }, setup: { fasts: false } })

    await sawm.completeSetup('fasts')

    expect((await createSawm(fake.device)).settings().setup.fasts).toBe(true)
  })
})

describe('Calendar', () => {
  it('shows this month and the next 12', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    const months = sawm.calendarMonths()

    expect(months).toHaveLength(13)
    expect(months[0]).toEqual({ year: 2026, month: 10 })
    expect(months.at(-1)).toEqual({ year: 2027, month: 10 })
  })

  it('shows each date with its Hijri Date and what is planned', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    const february = sawm.calendarMonth(2027, 2)!

    expect(february.days).toHaveLength(28)
    expect(february.hijriMonths).toEqual([
      { name: 'Sha’ban', year: 1448 },
      { name: 'Ramadan', year: 1448 },
    ])
    expect(february.days.filter((day) => day.plan.status === 'planned').map((day) => day.date)).toEqual(
      Array.from({ length: 21 }, (_, i) => `2027-02-${String(8 + i).padStart(2, '0')}`),
    )
  })

  it('marks today and the Forbidden Days', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    expect(sawm.calendarMonth(2026, 10)!.days.find((day) => day.isToday)?.date).toBe('2026-10-04')
    expect(sawm.calendarMonth(2027, 3)!.days.find((day) => day.plan.status === 'forbidden')).toMatchObject({
      date: '2027-03-09',
      plan: { reason: 'Eid al-Fitr' },
    })
  })
})

describe('Fast Types', () => {
  /** The labels of the Planned Fasts between two dates. */
  function planned(sawm: Awaited<ReturnType<typeof karachiAt>>['sawm'], from: string, to: string) {
    const result: Record<string, string> = {}
    for (let date = from; date <= to; date = new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) {
      const plan = sawm.day(date)?.plan
      if (plan?.status === 'planned') result[date] = plan.label
    }
    return result
  }

  it('plans the White Days on the 13th to 15th of each Hijri month', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('ramadan', false)
    await sawm.setFollowing('whiteDays', true)

    expect(planned(sawm, '2026-10-20', '2026-10-30')).toEqual({
      '2026-10-24': 'White Days',
      '2026-10-25': 'White Days',
      '2026-10-26': 'White Days',
    })
  })

  it('plans only the 14th and 15th of Dhul Hijjah, because the 13th is a Day of Tashreeq', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('ramadan', false)
    await sawm.setFollowing('whiteDays', true)

    expect(planned(sawm, '2027-05-18', '2027-05-22')).toEqual({ '2027-05-20': 'White Days', '2027-05-21': 'White Days' })
    expect(sawm.day('2027-05-19')?.plan).toEqual({ status: 'forbidden', reason: 'Day of Tashreeq' })
  })

  it('plans every Monday and Thursday', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z') // a Sunday
    await sawm.setFollowing('mondaysThursdays', true)

    expect(sawm.today()).toMatchObject({ nextFast: { date: '2026-10-05', inDays: 1, label: 'Mondays & Thursdays' } })
    expect(Object.keys(planned(sawm, '2026-10-05', '2026-10-11'))).toEqual(['2026-10-05', '2026-10-08'])
  })

  it('names a date matching several Fast Types after the rarer one', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    for (const id of ['whiteDays', 'mondaysThursdays', 'arafah', 'firstNine'] as const) await sawm.setFollowing(id, true)

    expect(sawm.day('2026-10-26')?.plan).toEqual({ status: 'planned', label: 'White Days', types: ['whiteDays', 'mondaysThursdays'] })
    expect(sawm.day('2027-05-15')?.plan).toMatchObject({ status: 'planned', label: 'Day of Arafah', types: ['arafah', 'firstNine'] })
  })

  it('plans the Fast of Dawud every other day from its start, dropping Forbidden Days without shifting', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('ramadan', false)
    await sawm.setFollowing('dawud', true)

    expect(sawm.settings().fastOptions.dawudStart).toBe('2026-10-04')
    expect(Object.keys(planned(sawm, '2026-10-04', '2026-10-09'))).toEqual(['2026-10-04', '2026-10-06', '2026-10-08'])
    expect(sawm.day('2027-05-16')?.plan).toEqual({ status: 'forbidden', reason: 'Eid al-Adha' })
    expect(sawm.day('2027-05-18')?.plan).toEqual({ status: 'forbidden', reason: 'Day of Tashreeq' })
    expect(Object.keys(planned(sawm, '2027-05-19', '2027-05-23'))).toEqual(['2027-05-20', '2027-05-22'])
  })

  it('switches Mondays & Thursdays off when the user follows the Fast of Dawud, and back', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('mondaysThursdays', true)

    await sawm.setFollowing('dawud', true)
    expect(sawm.settings().followed).toMatchObject({ dawud: true, mondaysThursdays: false })

    await sawm.setFollowing('mondaysThursdays', true)
    expect(sawm.settings().followed).toMatchObject({ dawud: false, mondaysThursdays: true })
  })

  it('plans the Six of Shawwal on 2–7 Shawwal, and lets the user move them', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('sixOfShawwal', true)

    expect(Object.keys(planned(sawm, '2027-03-09', '2027-03-20'))).toEqual([
      '2027-03-10', '2027-03-11', '2027-03-12', '2027-03-13', '2027-03-14', '2027-03-15',
    ])

    await sawm.moveShawwalDay(2, 10)
    expect(Object.keys(planned(sawm, '2027-03-09', '2027-03-20'))).toEqual([
      '2027-03-11', '2027-03-12', '2027-03-13', '2027-03-14', '2027-03-15', '2027-03-18',
    ])
  })

  it('plans the Day of Arafah, the First Nine of Dhul Hijjah and Ashura', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('ramadan', false)
    for (const id of ['arafah', 'firstNine', 'ashura'] as const) await sawm.setFollowing(id, true)

    expect(planned(sawm, '2027-05-06', '2027-05-17')).toEqual({
      '2027-05-07': 'First Nine of Dhul Hijjah',
      '2027-05-08': 'First Nine of Dhul Hijjah',
      '2027-05-09': 'First Nine of Dhul Hijjah',
      '2027-05-10': 'First Nine of Dhul Hijjah',
      '2027-05-11': 'First Nine of Dhul Hijjah',
      '2027-05-12': 'First Nine of Dhul Hijjah',
      '2027-05-13': 'First Nine of Dhul Hijjah',
      '2027-05-14': 'First Nine of Dhul Hijjah',
      '2027-05-15': 'Day of Arafah',
    })
    expect(planned(sawm, '2027-06-13', '2027-06-17')).toEqual({ '2027-06-14': 'Ashura', '2027-06-15': 'Ashura' })

    await sawm.setFastOptions({ ashuraPairing: '10-11' })
    expect(planned(sawm, '2027-06-13', '2027-06-17')).toEqual({ '2027-06-15': 'Ashura', '2027-06-16': 'Ashura' })
  })
})

describe('Skips and One-off Fasts', () => {
  it('skips a single Planned Fast, so Today and the Next Fast move past it', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('mondaysThursdays', true)

    await sawm.skip('2026-10-05')

    expect(sawm.day('2026-10-05')?.plan).toEqual({ status: 'skipped', label: 'Mondays & Thursdays' })
    expect(sawm.today()).toMatchObject({ nextFast: { date: '2026-10-08' } })
  })

  it('skips a run of days, Ramadan included, and undoes one day of it', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    await sawm.skip('2027-02-10', '2027-02-14')
    await sawm.unskip('2027-02-12')

    const statuses = ['10', '11', '12', '13', '14', '15'].map((d) => sawm.day(`2027-02-${d}`)?.plan.status)
    expect(statuses).toEqual(['skipped', 'skipped', 'planned', 'skipped', 'skipped', 'planned'])
  })

  it('makes today a fasting day with a One-off Fast added the night before', async () => {
    const { sawm } = await karachiAt('2026-10-03T18:00:00Z') // 23:00 in Karachi

    expect(await sawm.addOneOff('2026-10-04')).toBe('added')

    expect(sawm.today()).toMatchObject({
      state: 'before-suhoor',
      focus: { date: '2026-10-04', plan: { status: 'planned', label: 'One-off Fast', oneOff: true } },
    })
    await sawm.removeOneOff('2026-10-04')
    expect(sawm.day('2026-10-04')?.plan.status).toBe('none')
  })

  it('refuses a One-off Fast on a Forbidden Day', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    expect(await sawm.addOneOff('2027-03-09')).toBe('forbidden')
    expect(sawm.day('2027-03-09')?.plan).toEqual({ status: 'forbidden', reason: 'Eid al-Fitr' })
  })

  it('undoes the Skip when a One-off Fast is added on a Skipped Planned Fast', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.skip('2027-02-10')

    expect(await sawm.addOneOff('2027-02-10')).toBe('unskipped')
    expect(sawm.day('2027-02-10')?.plan).toMatchObject({ status: 'planned', label: 'Ramadan' })
    expect(sawm.settings().oneOffs).toEqual([])
  })
})

describe('Hijri Offset and Month-end Check', () => {
  it('shifts every Hijri Date by the Hijri Offset, up to 2 days either way', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')

    await sawm.setHijriOffset(1)

    expect(sawm.hijriOffset()).toBe(1)
    expect(sawm.day('2027-02-08')?.hijri).toMatchObject({ day: 30, monthName: 'Sha’ban' })
    expect(sawm.day('2027-02-09')).toMatchObject({ hijri: { day: 1, monthName: 'Ramadan' }, plan: { status: 'planned' } })
    await sawm.setHijriOffset(5)
    expect(sawm.hijriOffset()).toBe(2)
  })

  it('asks on the evening of 29 Ramadan whether Eid has been announced, but not before Iftar', async () => {
    const { sawm, fake } = await karachiAt('2027-03-08T07:00:00Z') // noon on 29 Ramadan
    expect(sawm.today()).not.toHaveProperty('monthEndCheck')

    fake.setNow('2027-03-08T14:00:00Z') // 19:00, after Iftar at 18:37
    expect(sawm.today()).toMatchObject({ monthEndCheck: { month: '1448-09', question: 'Has Eid been announced for tomorrow?' } })
  })

  it('gives Ramadan a 30th day when Eid has not been announced, without moving days already passed', async () => {
    const { sawm } = await karachiAt('2027-03-08T14:00:00Z')

    await sawm.answerMonthEndCheck('no')

    expect(sawm.day('2027-03-08')?.hijri).toMatchObject({ day: 29, monthName: 'Ramadan' })
    expect(sawm.day('2027-03-09')).toMatchObject({ hijri: { day: 30, monthName: 'Ramadan' }, plan: { status: 'planned', label: 'Ramadan' } })
    expect(sawm.day('2027-03-10')?.plan).toEqual({ status: 'forbidden', reason: 'Eid al-Fitr' })
    expect(sawm.today()).toMatchObject({ state: 'before-suhoor', focus: { date: '2027-03-09' } })
    expect(sawm.today()).not.toHaveProperty('monthEndCheck')
  })

  it('keeps Eid tomorrow when it has been announced', async () => {
    const { sawm } = await karachiAt('2027-03-08T14:00:00Z')

    await sawm.answerMonthEndCheck('yes')

    expect(sawm.day('2027-03-09')?.plan).toEqual({ status: 'forbidden', reason: 'Eid al-Fitr' })
    expect(sawm.today()).not.toHaveProperty('monthEndCheck')
  })

  it('starts Ramadan a day early when it is announced on 29 Sha’ban, against a 30-day prediction', async () => {
    const { sawm } = await karachiAt('2027-02-06T14:00:00Z') // 19:00 on 29 Sha'ban
    expect(sawm.today()).toMatchObject({ monthEndCheck: { question: 'Has Ramadan been announced for tomorrow?' } })

    await sawm.answerMonthEndCheck('yes')

    expect(sawm.day('2027-02-07')).toMatchObject({ hijri: { day: 1, monthName: 'Ramadan' }, plan: { status: 'planned' } })
    expect(sawm.today()).toMatchObject({ state: 'before-suhoor', focus: { date: '2027-02-07', plan: { label: 'Ramadan' } } })
  })

  it('leaves the prediction alone if unanswered, asking until the following day ends', async () => {
    const { sawm, fake } = await karachiAt('2027-03-09T05:00:00Z') // 10:00 on 1 Shawwal

    expect(sawm.today()).toMatchObject({ monthEndCheck: { question: 'Did Eid begin today?' } })
    expect(sawm.day('2027-03-09')?.plan).toEqual({ status: 'forbidden', reason: 'Eid al-Fitr' })

    fake.setNow('2027-03-09T20:00:00Z') // 01:00 the day after
    expect(sawm.today()).not.toHaveProperty('monthEndCheck')
  })

  it('asks nothing when Month-end Checks are off', async () => {
    const { sawm } = await karachiAt('2027-03-08T14:00:00Z')

    await sawm.setMonthEndChecks(false)

    expect(sawm.today()).not.toHaveProperty('monthEndCheck')
  })

  it('asks about Muharram only for those following Ashura', async () => {
    const { sawm } = await karachiAt('2027-06-04T15:00:00Z') // 20:00 on 29 Dhul Hijjah
    expect(sawm.today()).not.toHaveProperty('monthEndCheck')

    await sawm.setFollowing('ashura', true)
    expect(sawm.today()).toMatchObject({ monthEndCheck: { question: 'Has Muharram been announced for tomorrow?' } })
  })

  it('keeps the Makkah Date for the Day of Arafah whatever the Hijri Offset', async () => {
    const { sawm } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('arafah', true)
    await sawm.setHijriOffset(1)

    expect(sawm.day('2027-05-16')?.plan).toMatchObject({ status: 'planned', label: 'Day of Arafah' })

    await sawm.setFastOptions({ arafahReference: 'makkah' })
    expect(sawm.day('2027-05-15')?.plan).toMatchObject({ status: 'planned', label: 'Day of Arafah' })
    expect(sawm.day('2027-05-16')?.plan.status).toBe('none')
  })
})

describe('Time preferences', () => {
  it('nudges Suhoor and Iftar by Minute Adjustments, without loading anything again', async () => {
    const { sawm, fake } = await karachiAt('2026-10-04T06:00:00Z')
    const requests = fake.requests.length

    await sawm.setTimePreferences({ minuteAdjustments: { suhoor: -5, iftar: 3 } })

    expect(sawm.today()).toMatchObject({
      focus: { suhoor: { local: '05:04', at: '2026-10-04T05:04:00+05:00' }, iftar: { local: '18:19' }, imsak: { local: '04:54' } },
    })
    expect(fake.requests).toHaveLength(requests)
    await sawm.setTimePreferences({ minuteAdjustments: { suhoor: -40, iftar: 0 } })
    expect(sawm.settings().minuteAdjustments).toEqual({ suhoor: -15, iftar: 0 })
  })

  it('loads times again under another High-Latitude Rule, far north in summer', async () => {
    const fake = createFakeDevice({ now: '2027-06-20T12:00:00Z' }) // 13:00 in London
    const sawm = await createSawm(fake.device)
    await sawm.setSavedLocation({ name: 'London', country: 'United Kingdom', countryCode: 'GB', latitude: 51.51, longitude: -0.13 })
    expect(sawm.today()).toMatchObject({ location: { timeZone: 'Europe/London' }, focus: { suhoor: { local: '02:30' }, iftar: { local: '21:21' } } })

    await sawm.setTimePreferences({ highLatitudeRule: 1 })

    expect(fake.requests.at(-1)).toContain('latitudeAdjustmentMethod=1')
    expect(sawm.today()).toMatchObject({ focus: { suhoor: { local: '01:02' }, iftar: { local: '21:21' } } })
  })

  it('remembers whether to show Imsak', async () => {
    const { sawm, fake } = await karachiAt('2026-10-04T06:00:00Z')
    expect(sawm.settings().showImsak).toBe(false)

    await sawm.setTimePreferences({ showImsak: true })

    expect((await createSawm(fake.device)).settings().showImsak).toBe(true)
  })
})

describe('Reminders', () => {
  type Upload = { subscription: { endpoint: string }; entries: { id: string; at: number; expiresAt: number; title: string; body: string }[] }
  const uploads = (fake: ReturnType<typeof createFakeDevice>) =>
    fake.server.filter((call) => call.method === 'PUT' && call.url === '/api/reminders').map((call) => call.body as Upload)

  it('subscribes and uploads Suhoor and Iftar Reminders for the next 60 days', async () => {
    const { sawm, fake } = await karachiAt('2027-02-07T12:00:00Z') // the day before Ramadan

    expect(await sawm.enableReminders()).toBe('on')

    const [upload] = uploads(fake)
    expect(upload!.subscription.endpoint).toBe('https://push.example.com/send/device-1')
    expect(upload!.entries.slice(0, 2)).toEqual([
      {
        id: '2027-02-08:suhoor',
        at: Date.parse('2027-02-08T05:08:00+05:00'),
        expiresAt: Date.parse('2027-02-08T05:53:00+05:00'),
        title: 'Suhoor ends in 45 minutes',
        body: 'Ramadan · Suhoor ends at 05:53',
        url: '/',
      },
      {
        id: '2027-02-08:iftar',
        at: Date.parse('2027-02-08T18:21:00+05:00'),
        expiresAt: Date.parse('2027-02-08T18:51:00+05:00'),
        title: 'It’s time for Iftar',
        body: 'Ramadan · Iftar at 18:21',
        url: '/',
      },
    ])
    expect(upload!.entries).toHaveLength(58) // two for each of Ramadan's 29 days
  })

  it('uploads again only when the schedule changes, and leaves Skipped days out', async () => {
    const { sawm, fake } = await karachiAt('2027-02-07T12:00:00Z')
    await sawm.enableReminders()
    await sawm.refresh()
    expect(uploads(fake)).toHaveLength(1)

    await sawm.skip('2027-02-10')

    expect(uploads(fake)).toHaveLength(2)
    expect(uploads(fake)[1]!.entries.map((e) => e.id)).not.toContain('2027-02-10:suhoor')
  })

  it('follows the Reminder timings the user sets', async () => {
    const { sawm, fake } = await karachiAt('2027-02-07T12:00:00Z')
    await sawm.enableReminders()

    await sawm.setReminder('suhoor', { minutesBefore: 30 })
    await sawm.setReminder('iftar', { on: false })

    const entries = uploads(fake).at(-1)!.entries
    expect(entries[0]).toMatchObject({ id: '2027-02-08:suhoor', at: Date.parse('2027-02-08T05:23:00+05:00'), title: 'Suhoor ends in 30 minutes' })
    expect(entries.every((e) => e.id.endsWith(':suhoor'))).toBe(true)
  })

  it('never schedules past the next 60 days', async () => {
    const { sawm, fake } = await karachiAt('2026-10-04T06:00:00Z')
    await sawm.setFollowing('mondaysThursdays', true)

    await sawm.enableReminders()

    const last = uploads(fake)[0]!.entries.at(-1)!
    expect(last.at).toBeLessThanOrEqual(Date.parse('2026-12-04T00:00:00+05:00'))
  })

  it('forgets the device on the server when Reminders are turned off', async () => {
    const { sawm, fake } = await karachiAt('2027-02-07T12:00:00Z')
    await sawm.enableReminders()

    await sawm.disableReminders()

    expect(fake.server.at(-1)).toEqual({ method: 'DELETE', url: '/api/reminders', body: { endpoint: 'https://push.example.com/send/device-1' } })
    expect(fake.isSubscribed()).toBe(false)
    await sawm.skip('2027-02-10')
    expect(uploads(fake)).toHaveLength(1)
  })

  it('says why when Reminders can’t be turned on', async () => {
    const denied = createFakeDevice({ now: '2027-02-07T12:00:00Z', push: { answer: 'denied' } })
    expect(await (await createSawm(denied.device)).enableReminders()).toBe('denied')

    const iPhone = createFakeDevice({ now: '2027-02-07T12:00:00Z', push: { support: 'needs-home-screen' } })
    expect(await (await createSawm(iPhone.device)).enableReminders()).toBe('needs-home-screen')
  })
})
