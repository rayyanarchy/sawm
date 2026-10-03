/** The device's edges: everything the app core needs from the outside world. */
export interface Device {
  /** Makes a GET request, with the same contract as the platform's fetch. */
  fetch(url: string): Promise<Response>
  storage: KeyValueStore
  clock: Clock
  geolocation: Geolocation
}

export type PositionResult =
  | { status: 'ok'; latitude: number; longitude: number }
  /** The user, or the browser, said no. */
  | { status: 'denied' }
  /** No position could be found, or the device can't tell. */
  | { status: 'unavailable' }

export interface Geolocation {
  /** Asks for the device's current position, prompting the user if needed. */
  current(): Promise<PositionResult>
}

/** Durable on-device storage for small JSON values. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
}

export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number
}
