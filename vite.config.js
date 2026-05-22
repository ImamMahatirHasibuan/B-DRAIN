import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.geojson'],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react-dom') || id.includes('/react/')) {
            return 'react-vendor';
          }

          if (id.includes('leaflet') || id.includes('react-leaflet') || id.includes('@geoman-io')) {
            return 'mapping-vendor';
          }

          if (id.includes('recharts')) {
            return 'chart-vendor';
          }

          if (id.includes('lucide-react')) {
            return 'icon-vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  json: {
    stringify: false
  }
})
