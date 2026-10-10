import type { Sawm, Settings, ThemePreference } from '../core'
import { placeName } from './placeName'
import { TitleWithBack } from './BackLink'
import { Icon } from './icons'
import { Link } from './Link'
import s from './SettingsScreen.module.css'
import { CalendarExportButton } from './CalendarExportButton'
import { FastTypeList } from './FastTypeList'
import { LocateProblem, PlaceSearch } from './LocationSearch'
import { useLocate } from './useLocate'
import { ReminderControls } from './ReminderControls'
import { Switch } from './Switch'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

type Section = 'reminders' | 'fasts' | 'times' | 'appearance'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'reminders', label: 'Reminders' },
  { id: 'fasts', label: 'Fasts' },
  { id: 'times', label: 'Times' },
  { id: 'appearance', label: 'Appearance' },
]

const DISPLAY_NAMES = { both: 'Gregorian & Hijri', gregorian: 'Gregorian', hijri: 'Hijri' } as const

/** Settings: a short list of sections, each on its own page. */
export function SettingsScreen({ sawm, settings, path }: { sawm: Sawm; settings: Settings; path: string }) {
  if (path === '/settings/location') return <LocationPage sawm={sawm} settings={settings} />
  const section = SECTIONS.find(({ id }) => path === `/settings/${id}`)
  return section ? <SectionPage sawm={sawm} settings={settings} section={section} /> : <SettingsIndex sawm={sawm} settings={settings} />
}

function SettingsIndex({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  const followed = sawm.fastTypes().filter((type) => type.followed)
  const { reminders } = settings
  const summaries: Record<Section, string> = {
    reminders: reminders.on ? `On · ${reminders.suhoor.on ? `${reminders.suhoor.minutesBefore} min before Suhoor` : 'Iftar only'}` : 'Off',
    fasts: followed.length === 0 ? 'None' : followed.length <= 2 ? followed.map((t) => t.label).join(', ') : `${followed[0]!.label} and ${followed.length - 1} more`,
    times: `${sawm.calculationMethod().name} method`,
    appearance: `${settings.theme === 'system' ? 'System' : settings.theme === 'light' ? 'Light' : 'Dark'} · ${DISPLAY_NAMES[settings.calendarDisplay]}`,
  }
  return (
    <section className={s.settings}>
      <TitleWithBack to="/" label="Today">
        <h1 className={s.title}>Settings</h1>
      </TitleWithBack>
      <nav className={s.list} aria-label="Settings">
        <Link to="/settings/location" className={s.entry}>
          <span className={s.entryText}>
            <span>Location</span>
            <span className={s.entrySummary}>{settings.savedLocation ? placeName(settings.savedLocation) : 'Not set'}</span>
          </span>
          <Icon name="chevronRight" className={s.chevron} />
        </Link>
        {SECTIONS.map(({ id, label }) => (
          <Link key={id} to={`/settings/${id}`} className={s.entry}>
            <span className={s.entryText}>
              <span>{label}</span>
              <span className={s.entrySummary}>{summaries[id]}</span>
            </span>
            <Icon name="chevronRight" className={s.chevron} />
          </Link>
        ))}
      </nav>
      <section className={s.note} aria-labelledby="note-heading">
        <h2 id="note-heading" className={s.heading}>
          A note from the developer
        </h2>
        <p>
          Sawm was made with love and care for everyone who observes fasting and loves it: a quiet companion for Suhoor,
          Iftar and the days in between. May it make your fasts a little easier.
        </p>
        <p>
          Special thanks to <a href="https://github.com/Saad-SYEDK">Saad Syed Kaleemulla</a>, who helped shape Sawm at
          the very beginning.
        </p>
        <p className={s.signed}>
          <span className={s.signature} role="img" aria-label="Signed" />
          Syed Rayyan Ahmed
        </p>
      </section>
      <footer className={s.about}>
        <a href="https://github.com/rayyanarchy/sawm" className={s.repo} aria-label="Sawm on GitHub">
          <Icon name="github" size={22} />
        </a>
        <p>
          Times and Hijri dates from <a href="https://aladhan.com">AlAdhan</a>. Places from{' '}
          <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>. Icons from{' '}
          <a href="https://boxicons.com">Boxicons</a>.
        </p>
      </footer>
    </section>
  )
}

/** Where Sawm's times are for: the place in use, finding it again from the device, or searching for another. */
function LocationPage({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  const { state, locate } = useLocate(sawm)
  const saved = settings.savedLocation
  return (
    <section className={s.settings}>
      <TitleWithBack to="/settings" label="Settings">
        <h1 className={s.title}>Location</h1>
      </TitleWithBack>
      <div className={s.list}>
        <div className={s.row}>
          <span className={s.rowText}>
            <span>{saved?.name ?? 'Not set'}</span>
            {saved && <span className={s.rowNote}>{placeName({ ...saved, name: '' }).replace(/^, /, '')}</span>}
          </span>
          <button type="button" className={s.exportButton} onClick={() => void locate()} disabled={state === 'locating'}>
            {state === 'locating' ? 'Finding you…' : 'Use my location'}
          </button>
        </div>
      </div>
      <p className={s.status} role="status">
        {state === 'done' && `Updated to where you are now: ${saved?.name}.`}
      </p>
      <LocateProblem state={state}>Search for your city below.</LocateProblem>
      <div className={s.group}>
        <h2 className={s.heading}>
          <label htmlFor="place">Choose another place</label>
        </h2>
        <PlaceSearch sawm={sawm} onChosen={(place) => sawm.setSavedLocation(place)} />
      </div>
    </section>
  )
}

function SectionPage({ sawm, settings, section }: { sawm: Sawm; settings: Settings; section: { id: Section; label: string } }) {
  return (
    <section className={s.settings}>
      <TitleWithBack to="/settings" label="Settings">
        <h1 className={s.title}>{section.label}</h1>
      </TitleWithBack>
      {section.id === 'reminders' && <RemindersSection sawm={sawm} settings={settings} />}
      {section.id === 'fasts' && (
        <div className={s.list}>
          <FastTypeList sawm={sawm} settings={settings} />
        </div>
      )}
      {section.id === 'times' && <TimesSection sawm={sawm} settings={settings} />}
      {section.id === 'appearance' && <AppearanceSection sawm={sawm} settings={settings} />}
    </section>
  )
}

function RemindersSection({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  return (
    <>
      <div className={s.list}>
        <ReminderControls sawm={sawm} settings={settings} />
        <div className={s.row}>
          <span className={s.rowText}>
            <span>Calendar Export</span>
            <span className={s.rowNote}>Your fasts for the next 60 days, with alerts, in your phone’s own calendar.</span>
          </span>
          <CalendarExportButton sawm={sawm} className={s.exportButton}>
            Export
          </CalendarExportButton>
        </div>
      </div>
    </>
  )
}

function TimesSection({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  const offset = sawm.hijriOffset()
  // What "Default" means for the Saved Location's country, whichever method is picked right now.
  const countryDefault = sawm.defaultCalculationMethod(settings.savedLocation?.countryCode ?? '')
  const defaultMethodName = sawm.calculationMethods().find((method) => method.id === countryDefault)?.name
  return (
    <div className={s.list}>
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
  )
}

function AppearanceSection({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  return (
    <>
      <div className={s.group}>
        <h2 className={s.heading}>Theme</h2>
        <Segmented
          label="Theme"
          value={settings.theme}
          choices={THEMES}
          onChange={(theme) => void sawm.setTheme(theme)}
        />
      </div>
      <div className={s.group}>
        <h2 className={s.heading}>Dates, on Today and in the Calendar</h2>
        <Segmented
          label="Dates"
          value={settings.calendarDisplay}
          choices={[
            { value: 'gregorian', label: 'Gregorian' },
            { value: 'hijri', label: 'Hijri' },
            { value: 'both', label: 'Both' },
          ]}
          onChange={(display) => void sawm.setCalendarDisplay(display)}
        />
      </div>
    </>
  )
}

function Segmented<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className={s.segmented} role="radiogroup" aria-label={label}>
      {choices.map((choice) => (
        <button key={choice.value} type="button" role="radio" aria-checked={value === choice.value} className={s.segment} onClick={() => onChange(choice.value)}>
          {choice.label}
        </button>
      ))}
    </div>
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
