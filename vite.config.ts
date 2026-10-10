import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }
import { serviceWorker } from './build/serviceWorker.ts'

export default defineConfig({
  define: {
    // The commit in CI, otherwise the build date: enough to match a crash report to a release.
    __SAWM_VERSION__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? new Date().toISOString().slice(0, 10)),
    // The release people see, in Settings.
    __SAWM_RELEASE__: JSON.stringify(pkg.version),
  },
  plugins: [react(), cloudflare(), serviceWorker()],
})
