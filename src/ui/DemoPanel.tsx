import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Sawm } from '../core'
import { localDate } from '../core/dates'
import type { DemoClock } from '../device/demo'
import s from './DemoPanel.module.css'

const HOUR = 3_600_000
const EARLIEST = -24 * HOUR
const LATEST = 8 * 24 * HOUR

/** Turns the demo off and reloads as the real Sawm. */
function exitDemo() {
  sessionStorage.removeItem('sawm-demo')
  const url = new URL(window.location.href)
  url.searchParams.delete('demo')
  window.location.replace(url)
}

/** The demo's controls: move Sawm's clock and see each moment of the day, without changing anything for real. */
export function DemoPanel({ sawm, clock }: { sawm: Sawm; clock: DemoClock }) {
  const today = useSyncExternalStore(sawm.subscribe, sawm.today)
  const [offset, setOffset] = useState(clock.offset())
  // The real time, read outside rendering and refreshed as it passes.
  const [realNow, setRealNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setRealNow(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [])
  const zone = sawm.settings().savedLocation?.timeZone
  const now = realNow + offset

  function move(to: number) {
    const clamped = Math.max(EARLIEST, Math.min(LATEST, to))
    clock.setOffset(clamped)
    setOffset(clamped)
    setRealNow(Date.now())
    sawm.tick()
    void sawm.refresh()
  }

  // Jumps to moments of a fast day, so the horizon shows: the fast in progress, else the next one.
  const fastDate =
    today.status !== 'ready' ? undefined : today.state !== 'not-fasting' ? today.focus.date : (today.nextFast?.date ?? (zone && localDate(now, zone)))
  const day = fastDate ? sawm.day(fastDate) : undefined
  const suhoor = day && Date.parse(day.suhoor.at)
  const iftar = day && Date.parse(day.iftar.at)
  const jumps =
    suhoor && iftar
      ? [
          { label: 'Before Suhoor', at: suhoor - HOUR },
          { label: 'Midday', at: (suhoor + iftar) / 2 },
          { label: 'Before Iftar', at: iftar - 20 * 60_000 },
          { label: 'Night', at: iftar + 2 * HOUR },
        ]
      : []

  const label = new Intl.DateTimeFormat('en', { timeZone: zone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(now)

  return (
    <aside className={s.panel} aria-label="Demo">
      <div className={s.top}>
        <span className={s.badge}>Demo</span>
        <output className={s.time}>{label}</output>
        <button type="button" className={s.link} onClick={() => move(0)} disabled={offset === 0}>
          Now
        </button>
        <button type="button" className={s.link} onClick={exitDemo}>
          Exit
        </button>
      </div>
      <input
        type="range"
        className={s.slider}
        aria-label="Move the clock"
        min={EARLIEST}
        max={LATEST}
        step={5 * 60_000}
        value={offset}
        onChange={(event) => move(Number(event.target.value))}
      />
      {day && (
        <p className={s.day}>
          {day.plan.status === 'planned' ? day.plan.label : 'No fast'} ·{' '}
          {new Intl.DateTimeFormat('en', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(Date.parse(`${day.date}T12:00:00Z`))}
        </p>
      )}
      <div className={s.jumps}>
        {jumps.map(({ label, at }) => (
          <button key={label} type="button" className={s.jump} onClick={() => move(at - Date.now())}>
            {label}
          </button>
        ))}
      </div>
    </aside>
  )
}
