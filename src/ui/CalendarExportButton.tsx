import type { Sawm } from '../core'
import { exportCalendar } from './exportCalendar'

export function CalendarExportButton({ sawm, className, children = 'Add to my calendar' }: { sawm: Sawm; className?: string; children?: string }) {
  return (
    <button type="button" className={className} onClick={() => exportCalendar(sawm)}>
      {children}
    </button>
  )
}
