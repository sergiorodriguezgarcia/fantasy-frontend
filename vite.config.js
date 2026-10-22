import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // El service worker nuevo se activa en cuanto se descarga y la página se recarga sola
      // (ver src/lib/pwa.js), así los usuarios siempre ven la última versión desplegada.
      registerType: 'autoUpdate',
      injectRegister: false,
      // Usamos nuestro propio public/site.webmanifest, ya enlazado desde index.html.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        // La API nunca pasa por el service worker: los datos del fantasy deben ir siempre a la red.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
