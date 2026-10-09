import { useState } from 'react'
import type { Sawm, Settings } from '../core'
import s from './ReminderControls.module.css'
import { Switch } from './Switch'

type Outcome = Awaited<ReturnType<Sawm['enableReminders']>>

const PROBLEMS: Partial<Record<Outcome, string>> = {
  denied: 'Notifications are blocked for Sawm. Allow them in your phone’s or browser’s settings, then try again.',
  unavailable: 'Couldn’t turn Reminders on right now. Check your connection and try again.',
}

/** How to get Reminders on an iPhone, where only Home Screen web apps can receive them. */
export function HomeScreenSteps() {
  return (
    <ol className={s.steps}>
      <li>Tap the Share button in Safari.</li>
      <li>Choose “Add to Home Screen”.</li>
      <li>Open Sawm from your Home Screen and turn Reminders on there.</li>
    </ol>
  )
}

/** Turning Reminders on and off, and their timings. */
export function ReminderControls({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  const [problem, setProblem] = useState<string>()
  const [tested, setTested] = useState<boolean>()
  const support = sawm.reminderSupport()
  const { reminders } = settings

  if (support === 'needs-home-screen') {
    return (
      <div className={s.note}>
        <p>On iPhone, Reminders work once Sawm is on your Home Screen:</p>
        <HomeScreenSteps />
      </div>
    )
  }
  if (support === 'unsupported') return <p className={s.note}>This browser can’t show Reminders.</p>

  return (
    <div className={s.controls}>
      <Switch
        label="Reminders"
        description="Notifications before Suhoor and at Iftar, even when Sawm is closed."
        checked={reminders.on}
        onChange={async (on) => {
          setProblem(undefined)
          if (!on) return void (await sawm.disableReminders())
          const outcome = await sawm.enableReminders()
          if (outcome !== 'on') setProblem(PROBLEMS[outcome] ?? 'Reminders aren’t available here.')
        }}
      />
      {problem && (
        <p role="alert" className={s.note}>
          {problem}
        </p>
      )}
      {reminders.on && (
        <>
          <Switch label="Suhoor Reminder" checked={reminders.suhoor.on} onChange={(on) => void sawm.setReminder('suhoor', { on })} />
          {reminders.suhoor.on && (
            <Lead label="Before Suhoor ends" value={reminders.suhoor.minutesBefore} step={5} max={120} onChange={(minutesBefore) => void sawm.setReminder('suhoor', { minutesBefore })} />
          )}
          <Switch label="Iftar Reminder" checked={reminders.iftar.on} onChange={(on) => void sawm.setReminder('iftar', { on })} />
          {reminders.iftar.on && (
            <Lead label="Before Iftar" value={reminders.iftar.minutesBefore} step={5} max={30} onChange={(minutesBefore) => void sawm.setReminder('iftar', { minutesBefore })} />
          )}
          <Switch
            label="Night-before Reminder"
            description="The evening before a voluntary fast, to make your intention."
            checked={reminders.nightBefore.on}
            onChange={(on) => void sawm.setNightBefore({ on })}
          />
          {reminders.nightBefore.on && (
            <label className={s.lead}>
              <span>At</span>
              <input
                type="time"
                className={s.time}
                value={reminders.nightBefore.time}
                onChange={(event) => event.target.value && void sawm.setNightBefore({ time: event.target.value })}
              />
            </label>
          )}
          <div className={s.lead}>
            <span>{tested === undefined ? 'Check Reminders arrive' : tested ? 'Sent. It should arrive in a moment.' : 'Couldn’t send one. Try again later.'}</span>
            <button
              type="button"
              className={s.test}
              onClick={async () => {
                setTested(undefined)
                setTested(await sawm.testReminder())
              }}
            >
              Send a test
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Lead({ label, value, step, max, onChange }: { label: string; value: number; step: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className={s.lead}>
      <span>{label}</span>
      <span className={s.stepper} role="group" aria-label={label}>
        <button type="button" onClick={() => onChange(value - step)} disabled={value <= 0} aria-label={`${step} minutes less`}>
          −
        </button>
        <output aria-live="polite">{value === 0 ? 'At the time' : `${value} min`}</output>
        <button type="button" onClick={() => onChange(value + step)} disabled={value >= max} aria-label={`${step} minutes more`}>
          +
        </button>
      </span>
    </div>
  )
}
