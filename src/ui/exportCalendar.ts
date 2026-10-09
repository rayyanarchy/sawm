import type { Sawm } from '../core'

/** Hands the user the Calendar Export: Safari on iPhone opens its "Add to Calendar" sheet, others download it. */
export function exportCalendar(sawm: Sawm) {
  const url = URL.createObjectURL(new Blob([sawm.calendarExport()], { type: 'text/calendar' }))
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (apple) window.location.assign(url)
  else {
    const link = Object.assign(document.createElement('a'), { href: url, download: 'sawm.ics' })
    document.body.append(link)
    link.click()
    link.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
