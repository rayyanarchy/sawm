// PROTOTYPE (#38), variant B: "Horizon". Ambient: the sky carries the time of day, the numbers carry the rest.
import { daysInWords, split, type DayModel } from './model'
import s from './VariantB.module.css'
import { useGoogleFonts } from './useGoogleFonts'

export const name = 'Horizon'

export function VariantB({ day }: { day: DayModel }) {
  useGoogleFonts('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500&display=swap')
  const { hours, minutes } = split(day.remaining)
  const angle = Math.PI * day.progress
  const sun = { left: `${((1 - Math.cos(angle)) / 2) * 100}%`, bottom: `${Math.sin(angle) * 100}%` }

  return (
    <div className={s.sky} data-state={day.state}>
      <header className={s.top}>
        <span className={s.place}>{day.place}</span>
        <span>
          {day.weekdayShort} {day.gregorian.replace(/ \d{4}$/, '')} · {day.hijri.replace(/ \d{4}$/, '')}
        </span>
      </header>

      <main className={s.center}>
        {day.state === 'not-fasting' ? (
          <>
            <p className={s.caption}>Next fast</p>
            <p className={s.word}>{day.nextFast.weekday}</p>
            <p className={s.sub}>
              {daysInWords(day.nextFast.inDays)} · {day.nextFast.label}
            </p>
          </>
        ) : (
          <>
            <p className={s.count} aria-label={`${hours} hours ${minutes} minutes`}>
              {hours > 0 && (
                <>
                  {hours}
                  <span className={s.unit}>h</span>
                </>
              )}
              {minutes}
              <span className={s.unit}>m</span>
            </p>
            <p className={s.caption}>{day.state === 'fasting' ? 'until Iftar' : 'until Suhoor ends'}</p>
          </>
        )}
      </main>

      <figure className={s.horizon}>
        <div className={s.arcBox}>
          {day.state !== 'not-fasting' && (
            <svg className={s.arc} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 0 100 A 50 100 0 0 1 100 100" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {day.state === 'fasting' && <span className={s.sun} style={sun} />}
          {day.state === 'before-suhoor' && <span className={s.dawn} />}
        </div>
        <div className={s.line} />
        <figcaption className={s.ends}>
          <span>
            <span className={s.endLabel}>Suhoor</span>
            {day.suhoor.hhmm}
          </span>
          <span>
            <span className={s.endLabel}>Iftar</span>
            {day.iftar.hhmm}
          </span>
        </figcaption>
      </figure>

      {day.state !== 'not-fasting' && (
        <footer className={s.next}>
          Next fast · {day.nextFast.weekday} · {daysInWords(day.nextFast.inDays)}
        </footer>
      )}
    </div>
  )
}
