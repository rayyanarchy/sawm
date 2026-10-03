import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from './router'

/** An in-app link: navigates without reloading, but still opens in a new tab when asked to. */
export function Link({ to, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  function follow(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={follow} {...props} />
}
