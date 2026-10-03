// Records the real responses the app core's tests are served, so tests never touch the network.
// When a test needs a response that isn't recorded yet, add its URL here and run `pnpm fixtures:record`.
// AlAdhan calendars are trimmed to the fields Sawm reads, to keep the repository small.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { fixtureName } from '../src/core/testing/fixtureName.ts'

/** The 13 months starting at year-month: what Sawm loads for a Saved Location. */
function calendar(latitude: number, longitude: number, method: number, year: number, month: number, count = 13) {
  return Array.from({ length: count }, (_, i) => {
    const y = year + Math.floor((month - 1 + i) / 12)
    const m = ((month - 1 + i) % 12) + 1
    return `https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${latitude}&longitude=${longitude}&method=${method}&iso8601=true`
  })
}

const urls = [
  'https://photon.komoot.io/api/?q=Karachi&lang=en&limit=5&layer=city',
  'https://photon.komoot.io/reverse?lat=24.86&lon=67&lang=en',
  // Karachi, Pakistan: the Karachi method (1) by default, from October 2026 through Shawwal 1448 and beyond.
  ...calendar(24.85, 67.02, 1, 2026, 10, 14),
  // ...and the months tests starting in February or March 2027 (Ramadan 1448) load.
  ...calendar(24.85, 67.02, 1, 2027, 12, 4),
  // Muslim World League (3), when chosen.
  ...calendar(24.85, 67.02, 3, 2026, 10),
  // The same city found by GPS.
  ...calendar(24.86, 67, 1, 2026, 10),
  // Karachiya, India: another time zone.
  ...calendar(22.38, 73.13, 1, 2026, 10),
  // London in June: far enough north that the sky never gets fully dark, by the default and another High-Latitude Rule.
  ...calendar(51.51, -0.13, 3, 2027, 6),
  ...calendar(51.51, -0.13, 3, 2027, 6).map((url) => url.replace('&iso8601', '&latitudeAdjustmentMethod=1&iso8601')),
]

interface AlAdhanCalendar {
  code: number
  data: {
    timings: Record<string, string>
    date: { gregorian: { date: string }; hijri: { day: string; year: string; month: { number: number; days: number } } }
    meta: { timezone: string }
  }[]
}

function trim(body: AlAdhanCalendar) {
  return {
    code: body.code,
    data: body.data.map(({ timings, date, meta }) => ({
      timings: { Imsak: timings.Imsak, Fajr: timings.Fajr, Maghrib: timings.Maghrib },
      date: {
        gregorian: { date: date.gregorian.date },
        hijri: { day: date.hijri.day, year: date.hijri.year, month: { number: date.hijri.month.number, days: date.hijri.month.days } },
      },
      meta: { timezone: meta.timezone },
    })),
  }
}

const directory = new URL('../src/core/testing/fixtures/', import.meta.url)
await mkdir(directory, { recursive: true })
const wanted = new Set(urls.map(fixtureName))
for (const file of await readdir(directory)) {
  if (!wanted.has(file)) await rm(new URL(file, directory))
}

for (const url of urls) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Sawm test fixture recorder (https://github.com/rayyanarchy/sawm)' },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  const body = (await response.json()) as AlAdhanCalendar
  await writeFile(new URL(fixtureName(url), directory), `${JSON.stringify(url.includes('aladhan') ? trim(body) : body)}\n`)
  console.log(`recorded ${url}`)
}
