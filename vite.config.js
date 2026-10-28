/**
 * Konfigurasi Vite untuk proyek B-DRAIN.
 * Berkas ini mengatur plugin React, perlakuan aset GeoJSON, pemecahan chunk saat build,
 * konfigurasi pengujian Vitest, dan opsi JSON.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Plugin resmi @vitejs/plugin-react untuk transformasi JSX dan Fast Refresh.
  plugins: [react()],
  // Memperlakukan berkas .geojson sebagai aset statis sehingga dapat di-import sebagai URL.
  assetsInclude: ['**/*.geojson'],
  build: {
    rollupOptions: {
      output: {
        // Memecah dependensi node_modules menjadi beberapa chunk vendor agar ukuran bundle utama lebih kecil.
        // Fungsi ini dipanggil Rollup untuk setiap modul. Modul di luar node_modules dibiarkan
        // mengikuti pemecahan default (return undefined).
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // Pustaka inti React dipisah ke chunk "react-vendor".
          if (id.includes('react-dom') || id.includes('/react/')) {
            return 'react-vendor';
          }

          // Pustaka peta (Leaflet, react-leaflet, dan Geoman) dipisah ke chunk "mapping-vendor".
          if (id.includes('leaflet') || id.includes('react-leaflet') || id.includes('@geoman-io')) {
            return 'mapping-vendor';
          }

          // Pustaka grafik Recharts dipisah ke chunk "chart-vendor".
          if (id.includes('recharts')) {
            return 'chart-vendor';
          }

          // Pustaka ikon lucide-react dipisah ke chunk "icon-vendor".
          if (id.includes('lucide-react')) {
            return 'icon-vendor';
          }
        },
      },
    },
  },
  // Blok konfigurasi Vitest. Vitest membaca blok ini saat menjalankan pengujian.
  test: {
    // Lingkungan DOM simulasi (jsdom) agar komponen React dapat diuji di Node.
    environment: 'jsdom',
    // Berkas setup yang dijalankan sebelum setiap berkas pengujian (src/test/setup.js).
    setupFiles: './src/test/setup.js',
  },
  // Opsi perilaku JSON. Nilai stringify: false berarti isi berkas JSON diubah menjadi
  // literal objek JavaScript, bukan dimuat lewat JSON.parse dari string.
  json: {
    stringify: false
  }
})
