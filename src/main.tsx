import '@fontsource-variable/outfit'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createSawm } from './core'
import { browserDevice } from './device/browser'
import { App } from './ui/App'
import './ui/theme.css'

// Keeps the app opening offline once it has loaded once.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}

// iOS Safari has its own pinch events ('gesturestart', 'gesturechange'); they don't always respect touch-action.
// Whether to cancel them decides the trade-off between app feel and letting someone zoom to read.
const installed = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true)
// Installed, Sawm is an app and doesn't zoom; in a browser tab, visitors keep zoom for reading.
if (installed) {
  for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, (event) => event.preventDefault(), { passive: false })
}

const sawm = await createSawm(browserDevice)

// Crashes go to Sawm's own server (and from there to its logs), with no personal data.
const screen = () => window.location.pathname.split('/')[1] || 'today'
window.addEventListener('error', (event) => void sawm.reportError(event.error ?? event.message, screen(), __SAWM_VERSION__))
window.addEventListener('unhandledrejection', (event) => void sawm.reportError(event.reason, screen(), __SAWM_VERSION__))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App sawm={sawm} />
  </StrictMode>,
)
