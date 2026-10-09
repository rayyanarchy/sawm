import type { Sawm, Settings, ThemePreference } from '../core'
import { placeName } from './placeName'
import { Link } from './Link'
import s from './SettingsScreen.module.css'
import { FastTypeList } from './FastTypeList'
import { ReminderControls } from './ReminderControls'
import { Switch } from './Switch'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function SettingsScreen({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  const offset = sawm.hijriOffset()
  // What "Default" means for the Saved Location's country, whichever method is picked right now.
  const countryDefault = sawm.defaultCalculationMethod(settings.savedLocation?.countryCode ?? '')
  const defaultMethodName = sawm.calculationMethods().find((method) => method.id === countryDefault)?.name
  return (
    <section className={s.settings}>
      <h1 className={s.title}>Settings</h1>

      <section className={s.group} aria-labelledby="settings-location">
        <h2 id="settings-location" className={s.heading}>
          Location
        </h2>
        <Link to="/settings/location" className={s.row}>
          <span>{settings.savedLocation ? placeName(settings.savedLocation) : 'Not set'}</span>
          <span className={s.action}>Change</span>
        </Link>
      </section>

      <section className={s.group} aria-labelledby="settings-reminders">
        <h2 id="settings-reminders" className={s.heading}>
          Reminders
        </h2>
        <ReminderControls sawm={sawm} settings={settings} />
      </section>

      <section className={s.group} aria-labelledby="settings-fasts">
        <h2 id="settings-fasts" className={s.heading}>
          Fasts
        </h2>
        <FastTypeList sawm={sawm} settings={settings} />
      </section>

      <section className={s.group} aria-labelledby="settings-times">
        <h2 id="settings-times" className={s.heading}>
          Times
        </h2>
        <label className={s.row}>
          <span>Calculation method</span>
          <select
            className={s.select}
            value={settings.calculationMethod ?? 'default'}
            onChange={(event) => void sawm.setCalculationMethod(event.target.value === 'default' ? undefined : Number(event.target.value))}
          >
            <option value="default">Default · {defaultMethodName}</option>
            {sawm.calculationMethods().map((method) => (
              <option key={method.id} value={method.id}>
                {method.authority ? `${method.name} · ${method.authority}` : method.name}
              </option>
            ))}
          </select>
        </label>
        {Math.abs(settings.savedLocation?.latitude ?? 0) >= 48 && (
          <label className={s.row}>
            <span className={s.rowText}>
              <span>High-latitude rule</span>
              <span className={s.rowNote}>How Suhoor is set where the sky never gets fully dark in summer.</span>
            </span>
            <select
              className={s.select}
              value={settings.highLatitudeRule ?? 'default'}
              onChange={(event) =>
                void sawm.setTimePreferences({
                  highLatitudeRule: event.target.value === 'default' ? undefined : (Number(event.target.value) as 1 | 2 | 3),
                })
              }
            >
              <option value="default">Default · Angle-based</option>
              <option value="3">Angle-based</option>
              <option value="1">Middle of the night</option>
              <option value="2">One seventh of the night</option>
            </select>
          </label>
        )}
        <MinuteStepper
          label="Suhoor adjustment"
          value={settings.minuteAdjustments.suhoor}
          onChange={(suhoor) => void sawm.setTimePreferences({ minuteAdjustments: { ...settings.minuteAdjustments, suhoor } })}
        />
        <MinuteStepper
          label="Iftar adjustment"
          value={settings.minuteAdjustments.iftar}
          onChange={(iftar) => void sawm.setTimePreferences({ minuteAdjustments: { ...settings.minuteAdjustments, iftar } })}
        />
        <div className={s.row}>
          <span className={s.rowText}>
            <span>Hijri Offset</span>
            <span className={s.rowNote}>Shift Hijri dates to match your community’s moon sighting.</span>
          </span>
          <span className={s.stepper} role="group" aria-label="Hijri Offset">
            <button type="button" onClick={() => void sawm.setHijriOffset(offset - 1)} disabled={offset <= -2} aria-label="One day earlier">
              −
            </button>
            <output aria-live="polite">{offset === 0 ? '0 days' : `${offset > 0 ? '+' : '−'}${Math.abs(offset)} day${Math.abs(offset) === 1 ? '' : 's'}`}</output>
            <button type="button" onClick={() => void sawm.setHijriOffset(offset + 1)} disabled={offset >= 2} aria-label="One day later">
              +
            </button>
          </span>
        </div>
        <div className={s.switches}>
          <Switch
            label="Show Imsak"
            description="A precautionary time a few minutes before Suhoor."
            checked={settings.showImsak}
            onChange={(showImsak) => void sawm.setTimePreferences({ showImsak })}
          />
          <Switch
            label="Month-end Check"
            description="On the evening of the 29th, ask whether the new month has been announced."
            checked={settings.monthEndChecks}
            onChange={(on) => void sawm.setMonthEndChecks(on)}
          />
        </div>
      </section>

      <section className={s.group} aria-labelledby="settings-appearance">
        <h2 id="settings-appearance" className={s.heading}>
          Appearance
        </h2>
        <div className={s.segmented} role="radiogroup" aria-label="Theme">
          {THEMES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.theme === value}
              className={s.segment}
              onClick={() => void sawm.setTheme(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <p className={s.about}>
        Times and Hijri dates from <a href="https://aladhan.com">AlAdhan</a>. Places from{' '}
        <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.
      </p>
    </section>
  )
}

/** Nudges a time by a minute at a time, to match a local mosque's timetable. */
function MinuteStepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className={s.row}>
      <span>{label}</span>
      <span className={s.stepper} role="group" aria-label={label}>
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= -15} aria-label="One minute earlier">
          −
        </button>
        <output aria-live="polite">{value === 0 ? 'None' : `${value > 0 ? '+' : '−'}${Math.abs(value)} min`}</output>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= 15} aria-label="One minute later">
          +
        </button>
      </span>
    </div>
  )
}
