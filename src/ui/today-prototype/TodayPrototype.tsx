// PROTOTYPE (#38): mounts the variants on the real Today route, fed by the real app core.
import { useEffect, useState } from 'react'
import type { Today } from '../../core'
import { buildDay, STATES, type PrototypeState } from './model'
import { PrototypeSwitcher } from './PrototypeSwitcher'
import { name as nameA, VariantA } from './VariantA'
import { name as nameB, VariantB } from './VariantB'
import { name as nameC, VariantC } from './VariantC'

const VARIANTS = [
  { key: 'A', name: nameA, Component: VariantA },
  { key: 'B', name: nameB, Component: VariantB },
  { key: 'C', name: nameC, Component: VariantC },
]

type Theme = 'light' | 'dark'

function readParams() {
  const params = new URLSearchParams(window.location.search)
  const state = params.get('state') as PrototypeState | null
  const theme = params.get('theme') as Theme | null
  return {
    variant: params.get('variant') ?? 'A',
    state: state && STATES.some((s) => s.key === state) ? state : 'fasting',
    theme: theme === 'light' || theme === 'dark' ? theme : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  } as const
}

export function TodayPrototype({ today }: { today: Extract<Today, { status: 'ready' }> }) {
  const [settings, setSettings] = useState(readParams)
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const change = (next: Partial<typeof settings>) => {
    const merged = { ...settings, ...next }
    setSettings(merged)
    const params = new URLSearchParams(window.location.search)
    params.set('variant', merged.variant)
    params.set('state', merged.state)
    params.set('theme', merged.theme)
    window.history.replaceState(null, '', `?${params}`)
  }

  const variant = VARIANTS.find((v) => v.key === settings.variant) ?? VARIANTS[0]!
  const day = buildDay(today, settings.state, now, now - startedAt)

  return (
    <div data-theme={settings.theme} style={{ position: 'fixed', inset: 0, overflowY: 'auto' }}>
      <variant.Component day={day} />
      <PrototypeSwitcher variants={VARIANTS} variant={variant.key} state={settings.state} theme={settings.theme} onChange={change} />
    </div>
  )
}
