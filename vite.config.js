import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const joinPhoto = ['jpg', 'jpeg', 'webp', 'png'].map(extension => `images/join-aao.${extension}`)
  .find(path => existsSync(new URL(`public/${path}`, import.meta.url)))

// Set base to your repo name when deploying to github.io/<repo-name>
// Leave as '/' when deploying to a custom subdomain (e.g. tool.lab.allaboardohio.org)
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: mode === 'test' ? [{ find: /^\.\/data\/resources\.json$/, replacement: fileURLToPath(new URL('./scripts/test-snapshot.mjs', import.meta.url)) }] : [],
  },
  define: {
    'import.meta.env.AAO_JOIN_PHOTO': JSON.stringify(joinPhoto ? `/${joinPhoto}` : null),
  },
}))
