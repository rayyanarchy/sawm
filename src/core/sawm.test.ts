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
    expect(sawm.fastTypes()).toEqual([expect.objectContaining({ id: 'ramadan', followed: false })])
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
