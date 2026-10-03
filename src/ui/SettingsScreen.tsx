import type { Sawm, Settings, ThemePreference } from '../core'
import { placeName } from './placeName'
import { Link } from './Link'
import s from './SettingsScreen.module.css'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function SettingsScreen({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
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
