import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En desarrollo el frontend llama a /api y Vite lo reenvia al backend FastAPI.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
