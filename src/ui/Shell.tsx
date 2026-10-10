import { useEffect, useRef, type ReactNode } from 'react'
import type { Phase } from '../core'
import { Link } from './Link'
import { usePath } from './router'
import s from './Shell.module.css'

const PAGES = [
  { to: '/', label: 'Today' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/settings', label: 'Settings' },
]

interface ShellProps {
  /** Which sky to paint: the moment of the Saved Location's day, or neutral before there are times. */
  sky: Phase | 'neutral'
  theme: 'light' | 'dark'
  /** Hidden while there's nowhere to go yet, such as during setup. */
  showNav?: boolean
  /** On a wide screen, shown at the start of the header row, level with the navigation. */
  header?: ReactNode
  children: ReactNode
}

export function Shell({ sky, theme, showNav = true, header, children }: ShellProps) {
  const path = usePath()
  const frame = useRef<HTMLDivElement>(null)

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
        <div className={s.bar}>
          {header && <div className={s.header}>{header}</div>}
          <nav className={s.nav} aria-label="Main">
            {PAGES.map(({ to, label }) => {
              const current = to === '/' ? path === '/' : path.startsWith(to)
              return (
                <Link key={to} to={to} className={s.link} aria-current={current ? 'page' : undefined}>
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
      <div className={s.page}>{children}</div>
    </div>
  )
}
