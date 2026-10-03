// PROTOTYPE (#38), variant A: "Broadsheet". Text-led, like the front page of a quiet newspaper.
import { daysAway, daysInWords, inWords, type DayModel } from './model'
import s from './VariantA.module.css'
import { useGoogleFonts } from './useGoogleFonts'

export const name = 'Broadsheet'

export function VariantA({ day }: { day: DayModel }) {
  useGoogleFonts('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&display=swap')
  const { suhoor, iftar } = day

  const kicker = { 'before-suhoor': 'Before dawn', fasting: 'Fasting today', 'not-fasting': 'No fast today' }[day.state]
  const headline = {
    'before-suhoor': `Suhoor ends in ${inWords(day.remaining)}.`,
    fasting: `Iftar in ${inWords(day.remaining)}.`,
    'not-fasting': `Your next fast is ${day.nextFast.weekday}.`,
  }[day.state]
  const standfirst = {
    'before-suhoor': `Eat and drink until ${suhoor.h12}. Today’s fast ends at ${iftar.h12} this evening.`,
    fasting: `Your fast began at ${suhoor.h12} this morning and ends at ${iftar.h12} this evening.`,
    'not-fasting': `Nothing is planned for today. ${day.nextFast.weekday} ${day.nextFast.date} is ${daysAway(day.nextFast.inDays)}.`,
  }[day.state]

  return (
    <article className={s.page}>
      <header className={s.masthead}>
        <p className={s.title}>Sawm</p>
        <p className={s.dateline}>
          <span>{day.weekday} {day.gregorian}</span>
          <span>{day.hijri}</span>
          <span>{day.place}</span>
        </p>
      </header>

      <section className={s.lead}>
        <p className={s.kicker}>{kicker}</p>
        <h1 className={s.headline}>{headline}</h1>
        <p className={s.standfirst}>{standfirst}</p>
      </section>

      {day.state !== 'not-fasting' && (
        <figure className={s.scale} aria-label={`${Math.round(day.progress * 100)}% of the fast`}>
          <div className={s.track}>
            <div className={s.elapsed} style={{ width: `${day.progress * 100}%` }} />
            {day.hours.map(({ hour, at }) => (
              <span key={hour} className={s.tick} style={{ left: `${at * 100}%` }}>
                <span className={s.tickLabel}>{((hour + 11) % 12) + 1}</span>
              </span>
            ))}
            {day.state === 'fasting' && (
              <span className={s.now} style={{ left: `${day.progress * 100}%` }}>
                <span className={s.nowLabel}>now</span>
              </span>
            )}
          </div>
          <figcaption className={s.ends}>
            <span>Suhoor {suhoor.h12}</span>
            <span>Iftar {iftar.h12}</span>
          </figcaption>
        </figure>
      )}

      <section className={s.timetable}>
        <div>
          <h2 className={s.label}>Suhoor</h2>
          <p className={s.time}>
            {suhoor.h12}
            <span className={s.meridiem}>{suhoor.meridiem}</span>
          </p>
          <p className={s.note}>Stop eating and drinking</p>
        </div>
        <div>
          <h2 className={s.label}>Iftar</h2>
          <p className={s.time}>
            {iftar.h12}
            <span className={s.meridiem}>{iftar.meridiem}</span>
          </p>
          <p className={s.note}>Break the fast</p>
        </div>
      </section>

      <aside className={s.notice}>
        <h2 className={s.label}>Next fast</h2>
        <p className={s.noticeBody}>
          {day.nextFast.weekday} {day.nextFast.date}, {daysInWords(day.nextFast.inDays)}.
        </p>
        <p className={s.note}>{day.nextFast.label}</p>
      </aside>
    </article>
  )
}
