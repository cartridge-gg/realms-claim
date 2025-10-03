import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vercel from 'vite-plugin-vercel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercel()],
  vercel: {
    // Enable ISR (Incremental Static Regeneration) if needed
    expiration: false,
  },
})
