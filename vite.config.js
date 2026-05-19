/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
// Use CAPACITOR=true env variable for mobile builds: CAPACITOR=true npm run build
const isCapacitor = process.env.CAPACITOR === 'true';
console.log(`[Vite] Building for: ${isCapacitor ? 'CAPACITOR (Mobile)' : 'WEB (GitHub Pages)'}`);

export default defineConfig({
  base: isCapacitor ? './' : '/tawal-academy/',
  // Prefer .jsx over .js so updated JSX files are always resolved first
  resolve: {
    extensions: ['.mjs', '.jsx', '.js', '.mts', '.ts', '.tsx', '.json'],
  },
  // Allow JSX syntax inside .js files (needed for Rolldown in Vite 8)
  esbuild: {
    loader: 'jsx',
    include: /\.js$/,
  },
  plugins: [
    react(),
    // CRITICAL: PWA must be disabled for Capacitor builds — Service Workers
    // intercept all fetch requests inside the Android WebView, causing a white screen.
    ...(!isCapacitor ? [VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png', 'robots.txt', 'manifest.webmanifest'],
      manifest: {
        name: 'Tawal Academy',
        short_name: 'Tawal',
        description: 'Tawal Academy - Educational Platform',
        theme_color: '#2c3e50',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/tawal-academy/',
        start_url: '/tawal-academy/',
        icons: [
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/tawal-academy/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // 1. Cloudinary Assets (Images, etc.)
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-assets-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: { statuses: [0, 200] },
              fetchOptions: { mode: 'no-cors' }
            }
          },
          // 2. Direct PDF Files
          {
            urlPattern: /.*\.pdf($|\?)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'direct-pdf-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // 3. API PDF Download Endpoint
          {
            urlPattern: /.*\/api\/subjects\/.*\/pdfs\/.*\/download/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pdf-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 5
            }
          },
          // 4. All Other GET API Requests (Subjects, Terms, Exams, Profile, etc.)
          {
            urlPattern: /.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-data-cache',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 Days offline memory
              },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 5
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })] : []),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // When PWA plugin is disabled (Capacitor), externalize its virtual module
      // so Rolldown doesn't fail trying to resolve it
      ...(isCapacitor ? { external: ['virtual:pwa-register'] } : {}),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.jsx',
  },
})
