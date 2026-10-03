import type { Sawm, Settings } from '../core'
import s from './FastTypeList.module.css'
import { longDate } from './format'
import { Switch } from './Switch'

/** Every Fast Type with its switch, and the choices that shape a followed one. */
export function FastTypeList({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  const options = settings.fastOptions
  return (
    <div className={s.list}>
      {sawm.fastTypes().map((type) => (
        <div key={type.id}>
          <Switch label={type.label} description={type.description} checked={type.followed} onChange={(on) => void sawm.setFollowing(type.id, on)} />
          {type.followed && type.id === 'arafah' && (
            <Choice
              label="Follow"
              value={options.arafahReference}
              choices={[
                { value: 'local', label: 'My calendar' },
                { value: 'makkah', label: 'Makkah' },
              ]}
              onChange={(arafahReference) => void sawm.setFastOptions({ arafahReference })}
            />
          )}
          {type.followed && type.id === 'ashura' && (
            <Choice
              label="Fast"
              value={options.ashuraPairing}
              choices={[
                { value: '9-10', label: '9th & 10th' },
                { value: '10-11', label: '10th & 11th' },
              ]}
              onChange={(ashuraPairing) => void sawm.setFastOptions({ ashuraPairing })}
            />
          )}
          {type.followed && type.id === 'sixOfShawwal' && (
            <p className={s.note}>
              {options.shawwalDays.join(', ')} Shawwal. Move a day from the Calendar.
            </p>
          )}
          {type.followed && type.id === 'dawud' && (
            <label className={s.option}>
              <span>Starting</span>
              <input
                type="date"
                className={s.date}
                value={options.dawudStart ?? ''}
                onChange={(event) => event.target.value && void sawm.setFastOptions({ dawudStart: event.target.value })}
                aria-description={options.dawudStart ? longDate(options.dawudStart) : undefined}
              />
            </label>
          )}
        </div>
      ))}
    </div>
  )
}

function Choice<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className={s.option} role="radiogroup" aria-label={label}>
      <span>{label}</span>
      <span className={s.segmented}>
        {choices.map((choice) => (
          <button key={choice.value} type="button" role="radio" aria-checked={value === choice.value} className={s.segment} onClick={() => onChange(choice.value)}>
            {choice.label}
          </button>
        ))}
      </span>
    </div>
  )
}
