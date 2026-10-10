import { useEffect, useRef, type ReactNode } from 'react'
import type { Phase } from '../core'
import { Link } from './Link'
import { usePath } from './router'
import s from './Shell.module.css'

/** The two places to go from Today, as icons at the top right. Each page leads back the way it came. */
const PAGES = [
  {
    to: '/calendar',
    label: 'Calendar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3" y="4.5" width="14" height="12.5" rx="3" />
        <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        {/* A cog: eight teeth (a dashed ring) round a rim, with a hole in the middle. */}
        <circle cx="10" cy="10" r="6.9" strokeWidth="2" strokeDasharray="2.2 3.22" strokeLinecap="butt" />
        <circle cx="10" cy="10" r="5.2" />
        <circle cx="10" cy="10" r="1.9" />
      </svg>
    ),
  },
]

interface ShellProps {
  /** Which sky to paint: the moment of the Saved Location's day, or neutral before there are times. */
  sky: Phase | 'neutral'
  theme: 'light' | 'dark'
  /** Hidden while there's nowhere to go yet, such as during setup. */
  showNav?: boolean
  /** The start of the header row, level with the navigation: the place on Today, a way back elsewhere. */
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
        <header className={s.bar}>
          {header && <div className={s.header}>{header}</div>}
          <nav className={s.nav} aria-label="Main">
            {PAGES.map(({ to, label, icon }) => (
              <Link key={to} to={to} className={s.link} aria-label={label} aria-current={path.startsWith(to) ? 'page' : undefined}>
                {icon}
              </Link>
            ))}
          </nav>
        </header>
      )}
      <div className={s.page}>{children}</div>
    </div>
  )
}
