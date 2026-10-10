import { Link } from './Link'
import s from './BackLink.module.css'

/** The way back to the page this one was reached from. */
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className={s.back}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3 5 8l5 5" />
      </svg>
      {children}
    </Link>
  )
}
