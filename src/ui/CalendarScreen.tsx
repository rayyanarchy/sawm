import { useMemo, useState, useSyncExternalStore } from 'react'
import type { CalendarMonth, Day, Sawm, Settings } from '../core'
import s from './CalendarScreen.module.css'
import { clockText, firstDayOfWeek, fullDate, monthYear, weekdayNames } from './format'

const WEEK_START = firstDayOfWeek()
const WEEKDAYS = weekdayNames(WEEK_START)

const DISPLAYS: { value: Settings['calendarDisplay']; label: string }[] = [
  { value: 'gregorian', label: 'Gregorian' },
  { value: 'hijri', label: 'Hijri' },
  { value: 'both', label: 'Both' },
]

function planText(day: Day) {
  switch (day.plan.status) {
    case 'planned':
      return day.plan.label
    case 'skipped':
      return `Skipped · ${day.plan.label}`
    case 'forbidden':
      return `${day.plan.reason}: no fasting`
    default:
      return 'No fast planned'
  }
}

/** A short word under a Forbidden Day's number. */
const forbiddenWord = (day: Day) => (day.plan.status !== 'forbidden' ? undefined : day.plan.reason === 'Day of Tashreeq' ? 'Tashreeq' : 'Eid')

/** "Rabi’ al-Thani – Jumada al-Ula 1448", naming the year once when both months share it. */
function hijriSpan(months: { name: string; year: number }[]) {
  const sameYear = months.every((m) => m.year === months[0]!.year)
  return sameYear ? `${months.map((m) => m.name).join(' – ')} ${months[0]!.year}` : months.map((m) => `${m.name} ${m.year}`).join(' – ')
}

/** "February – March 2027" for a Hijri month's Gregorian span. */
function gregorianSpan(month: CalendarMonth) {
  const first = month.days[0]!.date
  const last = month.days.at(-1)!.date
  const [fy, fm] = first.split('-').map(Number) as [number, number]
  const [ly, lm] = last.split('-').map(Number) as [number, number]
  if (fy === ly && fm === lm) return monthYear(fy, fm)
  const name = (y: number, m: number) => monthYear(y, m).replace(/\s*\d{4}$/, '')
  return fy === ly ? `${name(fy, fm)} – ${monthYear(ly, lm)}` : `${monthYear(fy, fm)} – ${monthYear(ly, lm)}`
}

export function CalendarScreen({ sawm }: { sawm: Sawm }) {
  const version = useSyncExternalStore(sawm.subscribe, sawm.version)
  const display = sawm.settings().calendarDisplay
  const byHijri = display === 'hijri'
  const months = useMemo(() => (byHijri ? sawm.hijriCalendarMonths() : sawm.calendarMonths()), [sawm, byHijri, version]) // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string>()
  const current = months[Math.min(index, months.length - 1)]
  const month: CalendarMonth | undefined = useMemo(
    () => (current ? (byHijri ? sawm.hijriCalendarMonth(current.year, current.month) : sawm.calendarMonth(current.year, current.month)) : undefined),
    [sawm, current, byHijri, version], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const selectedDay = month?.days.find((day) => day.date === selected) ?? month?.days.find((day) => day.isToday) ?? month?.days[0]
  const leading = month ? (new Date(`${month.days[0]!.date}T12:00:00Z`).getUTCDay() - WEEK_START + 7) % 7 : 0

  const title = !month || !current ? 'Calendar' : byHijri ? `${month.hijriMonths[0]!.name} ${month.hijriMonths[0]!.year}` : monthYear(current.year, current.month)
  const subtitle = !month ? undefined : byHijri ? gregorianSpan(month) : hijriSpan(month.hijriMonths)

  // A planned fast joins the planned days beside it, in the same week row, into one band.
  const fasting = (i: number) => {
    const plan = month?.days[i]?.plan.status
    return plan === 'planned' || plan === 'skipped'
  }
  const column = (i: number) => (leading + i) % 7

  return (
    <section className={s.calendar}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>{title}</h1>
          {subtitle && <p className={s.subtitle}>{subtitle}</p>}
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

      <div className={s.display} role="radiogroup" aria-label="Show dates as">
        {DISPLAYS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={display === value}
            className={s.displayOption}
            onClick={() => {
              setIndex(0)
              void sawm.setCalendarDisplay(value)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {month ? (
        <div className={s.body}>
          <div className={s.grid} role="grid" aria-label={title}>
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
              {month.days.map((day, i) => {
                const primary = byHijri ? day.hijri?.day : Number(day.date.slice(8))
                const joinsLeft = fasting(i) && i > 0 && fasting(i - 1) && column(i) !== 0
                const joinsRight = fasting(i) && i < month.days.length - 1 && fasting(i + 1) && column(i) !== 6
                const word = forbiddenWord(day)
                return (
                  <button
                    key={day.date}
                    type="button"
                    role="gridcell"
                    className={s.day}
                    data-plan={day.plan.status}
                    data-joins-left={joinsLeft || undefined}
                    data-joins-right={joinsRight || undefined}
                    data-past={day.isPast || undefined}
                    aria-current={day.isToday ? 'date' : undefined}
                    aria-selected={day.date === selectedDay?.date}
                    aria-label={`${fullDate(day.date)}${day.hijri ? `, ${day.hijri.day} ${day.hijri.monthName}` : ''}. ${planText(day)}${day.isToday ? '. Today' : ''}`}
                    onClick={() => setSelected(day.date)}
                  >
                    <span className={s.band} aria-hidden="true" />
                    <span className={s.face}>
                      <span className={s.number}>{primary}</span>
                      {display === 'both' && <span className={s.secondary}>{day.hijri?.day}</span>}
                      {word && <span className={s.word}>{word}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className={s.legend}>
              <span className={s.legendItem} data-kind="planned">
                Fast
              </span>
              <span className={s.legendItem} data-kind="skipped">
                Skipped
              </span>
              <span className={s.legendItem} data-kind="today">
                Today
              </span>
            </p>
          </div>

          {selectedDay && <DayDetails day={selectedDay} sawm={sawm} />}
        </div>
      ) : (
        <p className={s.loading} role="status">
          Loading this month’s times…
        </p>
      )}
    </section>
  )
}

function DayDetails({ day, sawm }: { day: Day & { isPast: boolean }; sawm: Sawm }) {
  const settings = sawm.settings()
  const shawwalDays = settings.fastOptions.shawwalDays
  const canMoveShawwalHere =
    settings.followed.sixOfShawwal && day.hijri?.month === 10 && day.hijri.day >= 2 && !shawwalDays.includes(day.hijri.day)
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
      {canMoveShawwalHere && (
        <div className={s.move}>
          <p>Fast one of your Six of Shawwal here instead of:</p>
          <div className={s.moveChoices}>
            {shawwalDays.map((from) => (
              <button key={from} type="button" className={s.moveChoice} onClick={() => void sawm.moveShawwalDay(from, day.hijri!.day)}>
                {from} Shawwal
              </button>
            ))}
          </div>
        </div>
      )}
      {!day.isPast && <PlanActions day={day} sawm={sawm} />}
      <dl className={s.times}>
        <div>
          <dt>Suhoor</dt>
          <dd>{clockText(day.suhoor.local)}</dd>
        </div>
        <div>
          <dt>Iftar</dt>
          <dd>{clockText(day.iftar.local)}</dd>
        </div>
      </dl>
    </article>
  )
}

/** What the user can change about a date: Skip it (or a run of days), undo a Skip, or add or remove a One-off Fast. */
function PlanActions({ day, sawm }: { day: Day; sawm: Sawm }) {
  const [until, setUntil] = useState<string>()
  const [refused, setRefused] = useState(false)
  const plan = day.plan

  if (plan.status === 'forbidden') return null
  if (plan.status === 'skipped') {
    return (
      <div className={s.actions}>
        <button type="button" className={s.action} onClick={() => void sawm.unskip(day.date)}>
          Undo skip
        </button>
      </div>
    )
  }
  if (plan.status === 'planned' && plan.oneOff && plan.types.length === 0) {
    return (
      <div className={s.actions}>
        <button type="button" className={s.action} onClick={() => void sawm.removeOneOff(day.date)}>
          Remove one-off fast
        </button>
      </div>
    )
  }
  if (plan.status === 'planned') {
    return (
      <div className={s.actions}>
        <button type="button" className={s.action} onClick={() => void sawm.skip(day.date)}>
          Skip this day
        </button>
        {until === undefined ? (
          <button type="button" className={s.action} onClick={() => setUntil(day.date)}>
            Not fasting for a while…
          </button>
        ) : (
          <form
            className={s.until}
            onSubmit={(event) => {
              event.preventDefault()
              void sawm.skip(day.date, until)
              setUntil(undefined)
            }}
          >
            <label>
              Not fasting until
              <input type="date" className={s.date} min={day.date} value={until} onChange={(event) => setUntil(event.target.value)} required />
            </label>
            <button type="submit" className={s.action}>
              Skip
            </button>
          </form>
        )}
      </div>
    )
  }
  return (
    <div className={s.actions}>
      <button
        type="button"
        className={s.action}
        onClick={async () => setRefused((await sawm.addOneOff(day.date)) === 'forbidden')}
      >
        Add a one-off fast
      </button>
      {refused && <p role="alert">Fasting isn’t allowed on this day.</p>}
    </div>
  )
}
