// PROTOTYPE (#38): the floating bar for flipping between variants, moments of the day and themes.
import { useEffect } from 'react'
import { STATES, type PrototypeState } from './model'

interface Props {
  variants: { key: string; name: string }[]
  variant: string
  state: PrototypeState
  theme: 'light' | 'dark'
  onChange: (change: Partial<{ variant: string; state: PrototypeState; theme: 'light' | 'dark' }>) => void
}

const bar: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 'max(env(safe-area-inset-bottom), 14px)',
  translate: '-50% 0',
  zIndex: 1000,
  display: 'grid',
  gap: 6,
  padding: 8,
  width: 'max-content',
  maxWidth: 'calc(100vw - 20px)',
  borderRadius: 16,
  background: 'rgb(20 20 22 / 0.92)',
  color: '#fff',
  font: '500 13px/1.2 system-ui, sans-serif',
  boxShadow: '0 10px 30px rgb(0 0 0 / 0.3)',
  backdropFilter: 'blur(8px)',
}
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }
const button = (active = false): React.CSSProperties => ({
  border: 0,
  borderRadius: 10,
  padding: '7px 10px',
  background: active ? '#fff' : 'transparent',
  color: active ? '#111' : '#fff',
  font: 'inherit',
  cursor: 'pointer',
})

export function PrototypeSwitcher({ variants, variant, state, theme, onChange }: Props) {
  const index = Math.max(0, variants.findIndex((v) => v.key === variant))
  const current = variants[index]!
  const step = (by: number) => onChange({ variant: variants[(index + by + variants.length) % variants.length]!.key })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable]')) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <nav style={bar} aria-label="Prototype controls">
      <div style={row}>
        <button type="button" style={button()} onClick={() => step(-1)} aria-label="Previous variant">
          ←
        </button>
        <span style={{ minWidth: 150, textAlign: 'center' }}>
          {current.key} · {current.name}
        </span>
        <button type="button" style={button()} onClick={() => step(1)} aria-label="Next variant">
          →
        </button>
      </div>
      <div style={row}>
        {STATES.map(({ key, label }) => (
          <button key={key} type="button" style={button(state === key)} onClick={() => onChange({ state: key })}>
            {label}
          </button>
        ))}
        <button
          type="button"
          style={button()}
          onClick={() => onChange({ theme: theme === 'dark' ? 'light' : 'dark' })}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☀︎' : '☾'}
        </button>
      </div>
    </nav>
  )
}
