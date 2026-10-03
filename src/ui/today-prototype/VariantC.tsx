// PROTOTYPE (#38), variant C: "Grid". Number-led, on a strict Swiss grid with monospaced labels.
import { split, type DayModel } from './model'
import s from './VariantC.module.css'
import { useGoogleFonts } from './useGoogleFonts'

export const name = 'Grid'

export function VariantC({ day }: { day: DayModel }) {
  useGoogleFonts('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Schibsted+Grotesk:wght@400;500;600&display=swap')
  const { hours, minutes } = split(day.remaining)
  const remaining = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  const fasting = day.state === 'fasting'
  const status = { 'before-suhoor': 'Before dawn', fasting: `Fasting · ${Math.floor(day.progress * 100)}%`, 'not-fasting': 'No fast today' }[day.state]

  // One cell per hour of the fast, from the hour Suhoor falls in to the hour of Iftar.
  const firstHour = Number(day.suhoor.hhmm.slice(0, 2))
  const lastHour = Number(day.iftar.hhmm.slice(0, 2))
  const cells = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i)
  const startMin = firstHour * 60 + Number(day.suhoor.hhmm.slice(3))
  const nowMin = startMin + day.progress * (lastHour * 60 + Number(day.iftar.hhmm.slice(3)) - startMin)

  return (
    <div className={s.page} data-state={day.state}>
      <header className={s.bar}>
        <span>Sawm</span>
        <span>{day.place}</span>
        <span>
          {day.weekdayShort} {day.gregorianShort}
        </span>
      </header>

      <p className={s.status}>
        <span className={s.dot} />
        {status}
        <span className={s.hijri}>{day.hijri}</span>
      </p>

      <section className={s.times}>
        <div className={s.row} data-dim={day.state === 'fasting' || undefined}>
          <span className={s.label}>Suhoor</span>
          <span className={s.big}>{day.suhoor.hhmm}</span>
        </div>
        <div className={s.row} data-dim={day.state === 'before-suhoor' || undefined}>
          <span className={s.label}>Iftar</span>
          <span className={s.big}>{day.iftar.hhmm}</span>
        </div>
      </section>

      <section className={s.side}>
        {day.state !== 'not-fasting' && (
          <>
            <div className={s.hours} aria-hidden="true">
              {cells.map((hour) => {
                const fill = fasting ? Math.min(1, Math.max(0, (nowMin - hour * 60) / 60)) : 0
                return (
                  <span key={hour} className={s.cell}>
                    <span className={s.fill} style={{ width: `${fill * 100}%` }} />
                    <span className={s.cellLabel}>{String(hour).padStart(2, '0')}</span>
                  </span>
                )
              })}
            </div>
            <div className={s.remaining}>
              <span className={s.label}>{fasting ? 'Until Iftar' : 'Until Suhoor ends'}</span>
              <span className={s.mid}>{remaining}</span>
            </div>
          </>
        )}

        <div className={s.next}>
          <span className={s.label}>Next fast</span>
          <span className={s.nextDate}>
            {day.nextFast.weekday.slice(0, 3)} {day.nextFast.dateShort}
          </span>
          <span className={s.nextMeta}>
            +{day.nextFast.inDays}d · {day.nextFast.label}
          </span>
        </div>

        <ol className={s.week}>
          {day.week.map((d) => (
            <li key={d.day} className={s.weekDay} data-today={d.isToday || undefined} data-fast={d.isFast || undefined}>
              <span>{d.weekdayShort.slice(0, 2)}</span>
              <span>{d.day}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
