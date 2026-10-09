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

const sawm = await createSawm(browserDevice)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App sawm={sawm} />
  </StrictMode>,
)
