import { get, set } from 'idb-keyval'
import type { Device, PositionResult, PushSubscriptionJSON } from '../core'

/** The real device: the network, IndexedDB, the system clock and the browser's geolocation. */
export const browserDevice: Device = {
  fetch: (url, init) => fetch(url, init),
  storage: {
    get: (key) => get(key),
    set: (key, value) => set(key, value),
  },
  clock: { now: () => Date.now() },
  push: {
    support() {
      if ('PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window) return 'supported'
      // iPhone and iPad only offer Web Push to web apps added to the Home Screen.
      const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      return apple ? 'needs-home-screen' : 'unsupported'
    },
    async subscribe(publicKey) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return 'denied'
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (publicKey.length % 4)) % 4)), (c) => c.charCodeAt(0)),
        })
        return subscription.toJSON() as PushSubscriptionJSON
      } catch {
        return 'unavailable'
      }
    },
    async unsubscribe() {
      const registration = await navigator.serviceWorker.getRegistration()
      await (await registration?.pushManager.getSubscription())?.unsubscribe()
    },
    async current() {
      if (!('serviceWorker' in navigator)) return undefined
      const registration = await navigator.serviceWorker.getRegistration()
      return (await registration?.pushManager?.getSubscription())?.toJSON() as PushSubscriptionJSON | undefined
    },
  },
  geolocation: {
    async permission() {
      if (!('geolocation' in navigator)) return 'unsupported'
      try {
        return (await navigator.permissions.query({ name: 'geolocation' })).state
      } catch {
        return 'prompt'
      }
    },
    current: () =>
      new Promise<PositionResult>((resolve) => {
        if (!('geolocation' in navigator)) return resolve({ status: 'unavailable' })
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ status: 'ok', latitude: coords.latitude, longitude: coords.longitude }),
          (error) => resolve({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
        )
      }),
  },
}
