import s from './Switch.module.css'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

/** A labelled on/off row. */
export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={s.row} onClick={() => onChange(!checked)}>
      <span className={s.text}>
        <span className={s.label}>{label}</span>
        {description && <span className={s.description}>{description}</span>}
      </span>
      <span className={s.track} aria-hidden="true">
        <span className={s.thumb} />
      </span>
    </button>
  )
}
