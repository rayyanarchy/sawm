/** The device's edges: everything the app core needs from the outside world. */
export interface Device {
  /** Makes a GET request, with the same contract as the platform's fetch. */
  fetch(url: string): Promise<Response>
  storage: KeyValueStore
  clock: Clock
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
