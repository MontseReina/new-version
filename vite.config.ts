import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'
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

// Demostración en un solo fichero (npm run build:demo): sin cuenta ni base de datos.
// Los ajustes y los días de ejemplo se pasan en DEMO_SETTINGS y DEMO_DAILY (JSON) al construir;
// no se guardan en el código. DEMO_START es la página en la que arranca (por ejemplo, /preguntas).
const demo = !!process.env.DEMO_SINGLEFILE
const base = demo ? './' : (process.env.VITE_BASE || '/')

export default defineConfig({
  plugins: demo
    ? [react(), viteSingleFile()]
    : [
        react(),
        versionJson(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg', 'apple-touch-icon.png'],
          manifest: {
            name: 'New Version',
            short_name: 'New Version',
            description: 'Registro personal de salud y hábitos',
            lang: 'es',
            start_url: base,
            display: 'standalone',
            background_color: '#FFFAF2',
            theme_color: '#CCDEDF',
            icons: [
              { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
              { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
              { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
              { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
            navigateFallback: base + 'index.html',
          },
        }),
      ],
  define: {
    'import.meta.env.VITE_DEMO': JSON.stringify(demo ? '1' : ''),
    'import.meta.env.VITE_DEMO_SETTINGS': JSON.stringify(demo ? (process.env.DEMO_SETTINGS || '') : ''),
    'import.meta.env.VITE_DEMO_DAILY': JSON.stringify(demo ? (process.env.DEMO_DAILY || '') : ''),
    'import.meta.env.VITE_DEMO_START': JSON.stringify(demo ? (process.env.DEMO_START || '') : ''),
    ...(demo ? { 'import.meta.env.VITE_SUPABASE_URL': '""', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '""' } : {}),
  },
  resolve: demo ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa/register-stub.ts', import.meta.url)) } } : undefined,
  base,
  build: { target: 'es2022' },
})
