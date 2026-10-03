import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Plugin } from 'vite'

/** Every file under a directory, as paths relative to it. */
function filesIn(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? filesIn(path).map((file) => `${name}/${file}`) : [name]
  })
}

/**
 * Builds the service worker: the hand-written one in src/service-worker.js, with the list of files to precache
 * (every built asset and every public file) and a version that changes whenever any of them does.
 */
export function serviceWorker(): Plugin {
  let publicDir = ''
  let root = ''
  return {
    name: 'sawm:service-worker',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir
      root = config.root
    },
    generateBundle(_, bundle) {
      if (this.environment.name !== 'client') return
      const built = Object.keys(bundle).filter((file) => !file.startsWith('.') && !file.endsWith('.map') && file !== 'index.html')
      const publicFiles = publicDir ? filesIn(publicDir).filter((file) => !file.startsWith('.')) : []
      const precache = ['/', ...[...built, ...publicFiles].map((file) => `/${file}`)].sort()
      const template = readFileSync(join(root, 'src/service-worker.js'), 'utf8')
      const version = createHash('sha256')
        .update(template)
        .update(precache.join('\n'))
        .update(Object.values(bundle).map((chunk) => ('code' in chunk ? chunk.code : String(chunk.source))).join(''))
        .digest('hex')
        .slice(0, 12)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const SAWM_VERSION = ${JSON.stringify(version)}\nconst SAWM_PRECACHE = ${JSON.stringify(precache)}\n\n${template}`,
      })
      this.info(`service worker ${version} precaches ${precache.length} files (${relative(root, publicDir)} included)`)
    },
  }
}
