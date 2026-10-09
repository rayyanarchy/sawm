import type { Today } from '../core'
import { hijriDayMonth, shortDate } from './format'
import { Link } from './Link'
import s from './PlaceLine.module.css'

type Located = Exclude<Today, { status: 'no-location' }>

/** The Saved Location's name, which leads to changing it, with the day's date under it. */
export function PlaceLine({ today }: { today: Located }) {
  return (
    <>
      <Link to="/settings/location" className={s.place} aria-label={`${today.location.name}, change location`}>
        {today.location.name}
      </Link>
      {today.status === 'ready' && (
        <p className={s.date}>
          {shortDate(today.focus.date)}
          {today.focus.hijri && ` · ${hijriDayMonth(today.focus.hijri)}`}
        </p>
      )}
    </>
  )
}
