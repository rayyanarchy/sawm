import '@fontsource-variable/outfit'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createSawm } from './core'
import { browserDevice } from './device/browser'
import { App } from './ui/App'
import './ui/theme.css'

const sawm = await createSawm(browserDevice)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App sawm={sawm} />
  </StrictMode>,
)
