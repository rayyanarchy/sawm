import type { Settings, Today } from '../core'
import { dayMonth, hijriDayMonth, shortDate, weekday } from './format'
import { Link } from './Link'
import s from './PlaceLine.module.css'

type Located = Exclude<Today, { status: 'no-location' }>

/** Today's date, written the way the user chose in Settings: Gregorian, Hijri or both. */
function dateLine(today: Extract<Located, { status: 'ready' }>, display: Settings['calendarDisplay']) {
  const { date, hijri } = today.focus
  if (!hijri || display === 'gregorian') return `${weekday(date)}, ${dayMonth(date)}`
  if (display === 'hijri') return `${weekday(date)}, ${hijriDayMonth(hijri)} ${hijri.year}`
  return `${shortDate(date)} · ${hijriDayMonth(hijri)}`
}

/** The day's date, with the Saved Location under it (which leads to changing it). */
export function PlaceLine({ today, display }: { today: Located; display: Settings['calendarDisplay'] }) {
  return (
    <>
      {today.status === 'ready' ? <p className={s.date}>{dateLine(today, display)}</p> : <span />}
      <Link to="/settings/location" className={s.place} aria-label={`${today.location.name}, change location`}>
        {today.location.name}
      </Link>
    </>
  )
}
