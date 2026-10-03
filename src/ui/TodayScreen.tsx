import type { Today } from '../core'
import { longDate, shortDate, weekday } from './format'
import { Link } from './Link'
import s from './TodayScreen.module.css'

type Located = Exclude<Today, { status: 'no-location' }>

export function TodayScreen({ today }: { today: Located }) {
  return (
    <section className={s.today}>
      <header className={s.top}>
        <Link to="/settings/location" className={s.place} aria-label={`${today.location.name}, change location`}>
          {today.location.name}
        </Link>
        {today.status === 'ready' && <p>{shortDate(today.date)}</p>}
      </header>

      {today.status === 'ready' ? (
        <>
          <div className={s.center}>
            <p className={s.word}>{weekday(today.date)}</p>
            <p className={s.caption}>{longDate(today.date)}</p>
          </div>

          <figure className={s.horizon}>
            <div className={s.arcBox}>{today.phase === 'predawn' && <span className={s.dawn} />}</div>
            <div className={s.line} />
            <dl className={s.ends}>
              <div>
                <dt>Suhoor</dt>
                <dd>
                  <time dateTime={today.suhoor.at}>{today.suhoor.local}</time>
                </dd>
              </div>
              <div>
                <dt>Iftar</dt>
                <dd>
                  <time dateTime={today.iftar.at}>{today.iftar.local}</time>
                </dd>
              </div>
            </dl>
          </figure>
        </>
      ) : (
        <div className={s.center} role="status">
          <p className={s.message}>Today’s times aren’t available.</p>
          <p className={s.caption}>Check your connection. Sawm will try again.</p>
        </div>
      )}
    </section>
  )
}
