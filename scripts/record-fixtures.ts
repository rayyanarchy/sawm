// Records the real responses the app core's tests are served, so tests never touch the network.
// When a test needs a response that isn't recorded yet, add its URL here and run `pnpm fixtures:record`.
import { mkdir, writeFile } from 'node:fs/promises'
import { fixtureName } from '../src/core/testing/fixtureName.ts'

const urls = [
  'https://photon.komoot.io/api/?q=Karachi&lang=en&limit=5&layer=city',
  'https://photon.komoot.io/reverse?lat=24.86&lon=67&lang=en',
  // Karachi, Pakistan: the Karachi method (1) by default, Muslim World League (3) when chosen.
  'https://api.aladhan.com/v1/calendar/2026/10?latitude=24.85&longitude=67.02&method=1&iso8601=true',
  'https://api.aladhan.com/v1/calendar/2026/11?latitude=24.85&longitude=67.02&method=1&iso8601=true',
  'https://api.aladhan.com/v1/calendar/2026/10?latitude=24.85&longitude=67.02&method=3&iso8601=true',
  'https://api.aladhan.com/v1/calendar/2026/10?latitude=24.86&longitude=67&method=1&iso8601=true',
  // Karachiya, India: another time zone.
  'https://api.aladhan.com/v1/calendar/2026/10?latitude=22.38&longitude=73.13&method=1&iso8601=true',
]

const directory = new URL('../src/core/testing/fixtures/', import.meta.url)
await mkdir(directory, { recursive: true })

for (const url of urls) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Sawm test fixture recorder (https://github.com/rayyanarchy/sawm)' },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  await writeFile(new URL(fixtureName(url), directory), `${JSON.stringify(await response.json(), null, 2)}\n`)
  console.log(`recorded ${url}`)
}
