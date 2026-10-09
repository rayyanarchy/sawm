import { useState } from 'react'
import type { Sawm } from '../core'
import s from './FastsSetup.module.css'
import { HomeScreenSteps } from './ReminderControls'

/** Setup step 3: Reminders, with Home Screen instructions first on iPhone. */
export function RemindersSetup({ sawm }: { sawm: Sawm }) {
  const [problem, setProblem] = useState<string>()
  const support = sawm.reminderSupport()
  const done = () => void sawm.completeSetup('reminders')

  return (
    <section className={s.setup}>
      <p className={s.brand}>Sawm</p>
      <h1 className={s.question}>Want a nudge before Suhoor?</h1>
      <p className={s.lead}>Sawm can remind you 45 minutes before Suhoor ends and at Iftar on each fast, even when it’s closed. Change the timings any time in Settings.</p>

      {support === 'needs-home-screen' ? (
        <>
          <p className={s.lead}>On iPhone, Reminders work once Sawm is on your Home Screen:</p>
          <HomeScreenSteps />
          <button type="button" className={s.primary} onClick={done}>
            Continue
          </button>
        </>
      ) : support === 'unsupported' ? (
        <>
          <p className={s.lead}>This browser can’t show Reminders.</p>
          <button type="button" className={s.primary} onClick={done}>
            Continue
          </button>
        </>
      ) : (
        <div className={s.actions}>
          <button
            type="button"
            className={s.primary}
            onClick={async () => {
              const outcome = await sawm.enableReminders()
              if (outcome === 'on') done()
              else setProblem(outcome === 'denied' ? 'Notifications are blocked. You can allow them later in your settings.' : 'Couldn’t turn Reminders on right now.')
            }}
          >
            Turn on Reminders
          </button>
          <button type="button" className={s.secondary} onClick={done}>
            Not now
          </button>
        </div>
      )}
      {problem && (
        <p role="alert" className={s.lead}>
          {problem}
        </p>
      )}
    </section>
  )
}
