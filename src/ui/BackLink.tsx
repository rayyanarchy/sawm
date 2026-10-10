import type { ReactNode } from 'react'
import { Icon } from './icons'
import { Link } from './Link'
import s from './BackLink.module.css'

/** A page's title with a chevron before it that leads back to where the page was reached from. */
export function TitleWithBack({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <div className={s.row}>
      <Link to={to} className={s.back} aria-label={`Back to ${label}`}>
        <Icon name="chevronLeft" size={30} />
      </Link>
      {children}
    </div>
  )
}
