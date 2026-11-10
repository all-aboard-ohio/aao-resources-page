import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to your repo name when deploying to github.io/<repo-name>
// Leave as '/' when deploying to a custom subdomain (e.g. tool.lab.allaboardohio.org)
export default defineConfig({
  base: '/',
  plugins: [react()],
})
