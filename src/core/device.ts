/** The device's edges: everything the app core needs from the outside world. */
export interface Device {
  /** Makes a request, with the same contract as the platform's fetch. Relative URLs go to Sawm's own server. */
  fetch(url: string, init?: RequestInit): Promise<Response>
  storage: KeyValueStore
  clock: Clock
  geolocation: Geolocation
  push: Push
}

export interface PushSubscriptionJSON {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface Push {
  /** Whether this browser can receive Web Push; on iPhone only once Sawm is on the Home Screen. */
  support(): 'supported' | 'needs-home-screen' | 'unsupported'
  /** Asks permission if needed, then subscribes with the server's VAPID public key. */
  subscribe(publicKey: string): Promise<PushSubscriptionJSON | 'denied' | 'unavailable'>
  unsubscribe(): Promise<void>
  /** The subscription the browser holds now, which it may have replaced since Sawm last asked. */
  current(): Promise<PushSubscriptionJSON | undefined>
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
