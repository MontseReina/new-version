import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

/** Publica version.json con APP_VERSION, para que la app avise cuando hay una versión nueva. */
function versionJson() {
  return {
    name: 'version-json',
    generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
      const src = readFileSync(fileURLToPath(new URL('./src/lib/version.ts', import.meta.url)), 'utf8')
      const version = /APP_VERSION = '([^']+)'/.exec(src)?.[1] ?? '0'
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) })
    },
  }
}

const base = process.env.VITE_BASE || '/'

export default defineConfig({
  plugins: [
    react(),
    versionJson(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'New Version',
        short_name: 'New Version',
        description: 'Registro personal de salud y hábitos',
        lang: 'es',
        start_url: base,
        display: 'standalone',
        background_color: '#EDF3F1',
        theme_color: '#EDF3F1',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: base + 'index.html',
      },
    }),
  ],
  base,
  build: { target: 'es2020' },
})
