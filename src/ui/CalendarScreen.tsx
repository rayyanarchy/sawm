import { useMemo, useState, useSyncExternalStore } from 'react'
import type { CalendarMonth, Day, Sawm } from '../core'
import s from './CalendarScreen.module.css'
import { firstDayOfWeek, fullDate, monthYear, weekdayNames } from './format'

const WEEK_START = firstDayOfWeek()
const WEEKDAYS = weekdayNames(WEEK_START)

function planText(day: Day) {
  switch (day.plan.status) {
    case 'planned':
      return day.plan.label
    case 'forbidden':
      return `${day.plan.reason}: no fasting`
    default:
      return 'No fast planned'
  }
}

export function CalendarScreen({ sawm }: { sawm: Sawm }) {
  const version = useSyncExternalStore(sawm.subscribe, sawm.version)
  const months = useMemo(() => sawm.calendarMonths(), [sawm, version]) // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string>()
  const current = months[Math.min(index, months.length - 1)]
  const month: CalendarMonth | undefined = useMemo(
    () => (current ? sawm.calendarMonth(current.year, current.month) : undefined),
    [sawm, current, version], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const selectedDay = month?.days.find((day) => day.date === selected) ?? month?.days.find((day) => day.isToday) ?? month?.days[0]
  const leading = month ? (new Date(`${month.days[0]!.date}T12:00:00Z`).getUTCDay() - WEEK_START + 7) % 7 : 0

  return (
    <section className={s.calendar}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>{current ? monthYear(current.year, current.month) : 'Calendar'}</h1>
          {month && <p className={s.hijri}>{month.hijriMonths.map((m) => `${m.name} ${m.year}`).join(' – ')}</p>}
        </div>
        <div className={s.arrows}>
          <button type="button" className={s.arrow} onClick={() => setIndex(index - 1)} disabled={index === 0} aria-label="Previous month">
            ‹
          </button>
          <button type="button" className={s.arrow} onClick={() => setIndex(index + 1)} disabled={index >= months.length - 1} aria-label="Next month">
            ›
          </button>
        </div>
      </header>

      {month ? (
        <div className={s.body}>
          <div className={s.grid} role="grid" aria-label={monthYear(month.year, month.month)}>
            <div className={s.week} role="row">
              {WEEKDAYS.map((name) => (
                <span key={name} className={s.weekday} role="columnheader">
                  {name.slice(0, 2)}
                </span>
              ))}
            </div>
            <div className={s.days} role="row">
              {Array.from({ length: leading }, (_, i) => (
                <span key={`blank-${i}`} aria-hidden="true" />
              ))}
              {month.days.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  role="gridcell"
                  className={s.day}
                  data-plan={day.plan.status}
                  aria-current={day.isToday ? 'date' : undefined}
                  aria-selected={day.date === selectedDay?.date}
                  aria-label={`${fullDate(day.date)}${day.hijri ? `, ${day.hijri.day} ${day.hijri.monthName}` : ''}. ${planText(day)}`}
                  onClick={() => setSelected(day.date)}
                >
                  <span className={s.number}>{Number(day.date.slice(8))}</span>
                  <span className={s.hijriDay}>{day.hijri?.day}</span>
                  <span className={s.mark} aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className={s.legend}>
              <span className={s.legendItem} data-plan="planned">
                Planned fast
              </span>
              <span className={s.legendItem} data-plan="forbidden">
                No fasting
              </span>
            </p>
          </div>

          {selectedDay && <DayDetails day={selectedDay} />}
        </div>
      ) : (
        <p className={s.loading} role="status">
          Loading this month’s times…
        </p>
      )}
    </section>
  )
}

function DayDetails({ day }: { day: Day }) {
  return (
    <article className={s.details} aria-live="polite">
      <h2 className={s.detailsDate}>{fullDate(day.date)}</h2>
      {day.hijri && (
        <p className={s.detailsHijri}>
          {day.hijri.day} {day.hijri.monthName} {day.hijri.year}
        </p>
      )}
      <p className={s.detailsPlan} data-plan={day.plan.status}>
        {planText(day)}
      </p>
      <dl className={s.times}>
        <div>
          <dt>Suhoor</dt>
          <dd>{day.suhoor.local}</dd>
        </div>
        <div>
          <dt>Iftar</dt>
          <dd>{day.iftar.local}</dd>
        </div>
      </dl>
    </article>
  )
}
