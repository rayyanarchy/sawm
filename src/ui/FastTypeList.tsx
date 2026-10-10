import type { Sawm, Settings } from '../core'
import s from './FastTypeList.module.css'
import { longDate } from './format'
import { Switch } from './Switch'

/** Every Fast Type with its switch, and the choices that shape a followed one. */
export function FastTypeList({ sawm, settings }: { sawm: Sawm; settings: Settings }) {
  const options = settings.fastOptions

  /** The choices that shape a followed Fast Type, if it has any. */
  function optionsFor(id: string) {
    if (id === 'arafah') {
      return (
        <Choice
          label="Follow"
          value={options.arafahReference}
          choices={[
            { value: 'local', label: 'My calendar' },
            { value: 'makkah', label: 'Makkah' },
          ]}
          onChange={(arafahReference) => void sawm.setFastOptions({ arafahReference })}
        />
      )
    }
    if (id === 'ashura') {
      return (
        <Choice
          label="Fast"
          value={options.ashuraPairing}
          choices={[
            { value: '9-10', label: '9th & 10th' },
            { value: '10-11', label: '10th & 11th' },
          ]}
          onChange={(ashuraPairing) => void sawm.setFastOptions({ ashuraPairing })}
        />
      )
    }
    if (id === 'sixOfShawwal') return <p className={s.note}>{options.shawwalDays.join(', ')} Shawwal. Move a day from the Calendar.</p>
    if (id === 'dawud') {
      return (
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
      )
    }
    return undefined
  }

  return (
    <div className={s.list}>
      {sawm.fastTypes().map((type) => (
        <Switch
          key={type.id}
          label={type.label}
          description={type.description}
          checked={type.followed}
          onChange={(on) => void sawm.setFollowing(type.id, on)}
          details={type.followed ? optionsFor(type.id) : undefined}
        />
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
