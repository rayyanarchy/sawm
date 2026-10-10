import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Phase } from '../core'
import { Icon } from './icons'
import { Link } from './Link'
import { usePath } from './router'
import s from './Shell.module.css'

/** The two places to go from Today, as icons at the top right. Each page leads back the way it came. */
const PAGES = [
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/settings', label: 'Settings', icon: 'cog' },
] as const

interface ShellProps {
  /** Which sky to paint: the moment of the Saved Location's day, or neutral before there are times. */
  sky: Phase | 'neutral'
  theme: 'light' | 'dark'
  /** Hidden while there's nowhere to go yet, such as during setup. */
  showNav?: boolean
  /** The start of the header row, level with the navigation: the date and place, on Today. */
  header?: ReactNode
  children: ReactNode
}

/** Where a page's title goes: the start of the header row, level with the navigation. */
const HeaderSlot = createContext<HTMLElement | null>(null)

/** Puts a page's title in the header row, or where it stands when there's no header row (as during setup). */
export function InHeader({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlot)
  return slot ? createPortal(children, slot) : children
}

export function Shell({ sky, theme, showNav = true, header, children }: ShellProps) {
  const path = usePath()
  const frame = useRef<HTMLDivElement>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  // Match the browser's own chrome (status bar, address bar) to the top of the sky.
  useEffect(() => {
    if (!frame.current) return
    const color = getComputedStyle(frame.current).getPropertyValue('--sky-top').trim()
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.append(meta)
    }
    meta.content = color
    // What shows behind the status bar and when scrolling past the top: the top of the sky, so nothing seams.
    document.documentElement.style.background = color
  }, [sky, theme])

  return (
    <div ref={frame} className={s.frame} data-sky={sky}>
      {showNav && (
        <header className={s.bar}>
          <div ref={setSlot} className={s.header}>
            {header}
          </div>
          <nav className={s.nav} aria-label="Main">
            {PAGES.map(({ to, label, icon }) => (
              <Link key={to} to={to} className={s.link} aria-label={label} aria-current={path.startsWith(to) ? 'page' : undefined}>
                <Icon name={icon} size={21} />
              </Link>
            ))}
          </nav>
        </header>
      )}
      <HeaderSlot.Provider value={showNav ? slot : null}>
        <div className={s.page}>{children}</div>
      </HeaderSlot.Provider>
      <p className={s.turn} aria-hidden="true">
        Sawm works upright. Turn your phone back.
      </p>
    </div>
  )
}
