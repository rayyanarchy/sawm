import type { Sawm, Today } from '../core'
import { clockTime, dayMonth, inDays, weekday, zoneOffsetIfDifferent } from './format'
import { Link } from './Link'
import { PlaceLine } from './PlaceLine'
import s from './TodayScreen.module.css'

type Located = Exclude<Today, { status: 'no-location' }>
type Ready = Extract<Today, { status: 'ready' }>

export function TodayScreen({ today, sawm }: { today: Located; sawm: Sawm }) {
  return (
    <section className={s.today}>
      {/* On a wide screen this sits in the header beside the navigation instead. */}
      <header className={s.top}>
        <PlaceLine today={today} />
      </header>

      {today.status === 'ready' ? (
        <ReadyToday today={today} sawm={sawm} />
      ) : (
        <div className={s.center} role="status">
          <p className={s.message}>Today’s times aren’t available.</p>
          <p className={s.caption}>Check your connection. Sawm will try again.</p>
        </div>
      )}
    </section>
  )
}

/** "Monday" within the week, "Tomorrow" for tomorrow, "8 February" further out. */
const whenLabel = (date: string, days: number) => (days === 1 ? 'Tomorrow' : days <= 6 ? weekday(date) : dayMonth(date))

/** What a screen reader hears: changes on each hour, then each minute of the last ten, so it's never chatty. */
function announcement(today: Ready): string {
  const { state, countdown, focus, nextFast } = today
  if (state === 'not-fasting' || !countdown) {
    return nextFast ? `No fast today. Next fast ${whenLabel(nextFast.date, nextFast.inDays)}, ${inDays(nextFast.inDays)}.` : 'No fasts planned.'
  }
  const event = state === 'fasting' ? 'Iftar' : 'Suhoor ends'
  const total = countdown.hours * 60 + countdown.minutes
  const when =
    total <= 10 ? `in ${total} minute${total === 1 ? '' : 's'}` : countdown.hours > 0 ? `in over ${countdown.hours} hour${countdown.hours === 1 ? '' : 's'}` : 'in under an hour'
  return `${focus.plan.status === 'planned' ? `${focus.plan.label}. ` : ''}${event} ${when}.`
}

function Time({ local, at }: { local: string; at: string }) {
  const { time, meridiem } = clockTime(local)
  return (
    <time dateTime={at}>
      {time}
      {meridiem && <span className={s.meridiem}>{meridiem}</span>}
    </time>
  )
}

function ReadyToday({ today, sawm }: { today: Ready; sawm: Sawm }) {
  const showImsak = sawm.settings().showImsak
  const zone = zoneOffsetIfDifferent(today.location.timeZone)
  const { focus, state, countdown, progress = 0, nextFast, fastComplete, phase } = today
  const fastingDay = state !== 'not-fasting'
  const angle = Math.PI * progress
  const sun = { left: `${((1 - Math.cos(angle)) / 2) * 100}%`, bottom: `${Math.sin(angle) * 100}%` }

  return (
    <>
      <div className={s.center}>
        {today.travelPrompt && (
          <section className={s.check} aria-labelledby="travel-prompt">
            <p id="travel-prompt" className={s.checkQuestion}>
              You’re in {today.travelPrompt.place.name}. Use {today.travelPrompt.place.name} times?
            </p>
            <div className={s.checkAnswers}>
              <button type="button" className={s.checkAnswer} onClick={() => void sawm.acceptTravel()}>
                Use {today.travelPrompt.place.name}
              </button>
              <button type="button" className={s.checkAnswer} onClick={() => void sawm.declineTravel()}>
                Keep {today.location.name}
              </button>
            </div>
          </section>
        )}

        {today.monthEndCheck && (
          <section className={s.check} aria-labelledby="month-end-check">
            <p id="month-end-check" className={s.checkQuestion}>
              {today.monthEndCheck.question}
            </p>
            <div className={s.checkAnswers}>
              <button type="button" className={s.checkAnswer} onClick={() => void sawm.answerMonthEndCheck('yes')}>
                Yes
              </button>
              <button type="button" className={s.checkAnswer} onClick={() => void sawm.answerMonthEndCheck('no')}>
                No
              </button>
            </div>
            <p className={s.checkNote}>Until you answer, Sawm follows the calculated calendar.</p>
          </section>
        )}

        {fastComplete && (
          <p className={s.complete}>
            <span className={s.completeDot} aria-hidden="true" />
            Fast complete · {fastComplete.label}
          </p>
        )}

        {focus.plan.status === 'skipped' && (
          <p className={s.complete}>
            Not fasting {focus.isTomorrow ? 'tomorrow' : 'today'} · {focus.plan.label}
            <button type="button" className={s.undo} onClick={() => void sawm.unskip(focus.date)}>
              Undo
            </button>
          </p>
        )}

        {fastingDay && countdown ? (
          <>
            <p className={s.count} aria-hidden="true">
              {countdown.hours > 0 && (
                <>
                  {countdown.hours}
                  <span className={s.unit}>h</span>
                </>
              )}
              {countdown.minutes}
              <span className={s.unit}>m</span>
            </p>
            <p className={s.caption}>
              {state === 'fasting' ? 'until Iftar' : 'until Suhoor ends'}
              {focus.plan.status === 'planned' && ` · ${focus.plan.label}`}
            </p>
            <button type="button" className={s.quiet} onClick={() => void sawm.skip(focus.date)}>
              Not fasting {focus.isTomorrow ? 'tomorrow' : 'today'}?
            </button>
          </>
        ) : nextFast ? (
          <>
            <p className={s.caption}>Next fast</p>
            <p className={s.word}>{whenLabel(nextFast.date, nextFast.inDays)}</p>
            <p className={s.caption}>{nextFast.inDays === 1 ? nextFast.label : `${inDays(nextFast.inDays)} · ${nextFast.label}`}</p>
          </>
        ) : (
          <>
            <p className={s.message}>No fasts planned</p>
            <Link to="/settings" className={s.choose}>
              Choose fasts to follow
            </Link>
          </>
        )}

        <p className="visually-hidden" aria-live="polite">
          {announcement(today)}
        </p>
      </div>

      <figure className={s.horizon}>
        <div className={s.arcBox}>
          {fastingDay && (
            <svg className={s.arc} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 0 100 A 50 100 0 0 1 100 100" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {state === 'fasting' && <span className={s.sun} style={sun} />}
          {phase === 'predawn' && <span className={s.dawn} />}
        </div>
        <div className={s.line} />
        <dl className={s.ends}>
          <div>
            <dt>{focus.isTomorrow ? 'Suhoor · tomorrow' : 'Suhoor'}</dt>
            <dd>
              <Time {...focus.suhoor} />
            </dd>
            {showImsak && (
              <dd className={s.imsak}>
                Imsak <Time {...focus.imsak} />
              </dd>
            )}
          </div>
          <div>
            <dt>Iftar</dt>
            <dd>
              <Time {...focus.iftar} />
            </dd>
          </div>
        </dl>
        {zone && <figcaption className={s.zone}>Times in {zone}, not your device’s time zone</figcaption>}
      </figure>

      {fastingDay && nextFast && (
        <p className={s.next}>
          Next fast · {whenLabel(nextFast.date, nextFast.inDays)}
          {nextFast.inDays > 1 && ` · ${inDays(nextFast.inDays)}`}
        </p>
      )}
    </>
  )
}
