import { useId, useState, type ReactNode } from 'react'
import { Icon } from './icons'
import s from './Switch.module.css'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  /** More choices for this setting while it's on, folded away under the row until opened. */
  details?: ReactNode
}

/** A labelled on/off row. With details, the label opens and closes them and the switch stands on its own. */
export function Switch({ checked, onChange, label, description, details }: SwitchProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const text = (
    <span className={s.text}>
      <span className={s.label}>
        {label}
        {details && <Icon name="chevronDown" size={18} className={s.chevron} />}
      </span>
      {description && <span className={s.description}>{description}</span>}
    </span>
  )
  const track = (
    <span className={s.track} aria-hidden="true">
      <span className={s.thumb} />
    </span>
  )

  if (!details) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={s.row}
        onClick={() => {
          // Turning on a setting that has choices shows them.
          setOpen(!checked)
          onChange(!checked)
        }}
      >
        {text}
        {track}
      </button>
    )
  }

  return (
    <div className={s.group} data-open={open || undefined}>
      <div className={s.row}>
        <button type="button" className={s.disclose} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {text}
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          className={s.toggle}
          onClick={() => {
            // Turning a setting on shows its choices; turning it off folds them away.
            setOpen(!checked)
            onChange(!checked)
          }}
        >
          {track}
        </button>
      </div>
      {open && <div id={id}>{details}</div>}
    </div>
  )
}
