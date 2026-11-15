import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Lets imports use the "@/..." alias declared in tsconfig.app.json.
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    // The browser only ever talks to this dev server (same origin). Requests to /api are
    // forwarded to the ASP.NET Core API, so there is no CORS and the refresh cookie just works.
    proxy: {
      '/api': 'http://localhost:5080',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
