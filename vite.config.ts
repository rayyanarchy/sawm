import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { serviceWorker } from './build/serviceWorker'

export default defineConfig({
  plugins: [react(), cloudflare(), serviceWorker()],
})
