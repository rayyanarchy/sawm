import { useState } from 'react'
import type { Sawm } from '../core'

export type LocateState = 'idle' | 'locating' | 'denied' | 'no-position' | 'done'

/** Finding where the user is from the device's location, and saving it as the Saved Location. */
export function useLocate(sawm: Sawm) {
  const [state, setState] = useState<LocateState>('idle')
  async function locate() {
    setState('locating')
    const result = await sawm.useCurrentLocation()
    setState(result === 'ok' ? 'done' : result === 'denied' ? 'denied' : 'no-position')
    return result === 'ok'
  }
  return { state, locate }
}
