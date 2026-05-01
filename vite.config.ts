import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    cssMinify: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7001',
        changeOrigin: true,
      },
    },
  },
})
