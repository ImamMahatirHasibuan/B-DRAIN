/**
 * Konfigurasi ESLint (flat config) untuk proyek B-DRAIN.
 * Berkas ini menentukan path yang diabaikan, konfigurasi untuk kode frontend di src/,
 * dan konfigurasi untuk skrip Node.js di root proyek.
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Path yang tidak diperiksa ESLint: hasil build (dist), lingkungan virtual Python (.venv),
  // folder ml (kode Python dan data model), dan data publik (public/data).
  globalIgnores(['dist', '.venv', 'ml', 'public/data']),
  {
    // Konfigurasi untuk kode frontend React pada berkas .js dan .jsx di dalam src/.
    files: ['src/**/*.{js,jsx}'],
    extends: [
      // Aturan rekomendasi dasar dari ESLint untuk JavaScript.
      js.configs.recommended,
      // Aturan rekomendasi untuk penggunaan Hooks React (aturan urutan dan dependensi).
      reactHooks.configs.flat.recommended,
      // Konfigurasi Vite untuk eslint-plugin-react-refresh (memeriksa ekspor komponen agar Fast Refresh berfungsi).
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // Versi ECMAScript dasar untuk parsing.
      ecmaVersion: 2020,
      // Variabel global lingkungan browser (window, document, dan sebagainya).
      globals: globals.browser,
      parserOptions: {
        // Parser memakai sintaks ECMAScript terbaru, termasuk JSX.
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        // Berkas dibaca sebagai modul ES.
        sourceType: 'module',
      },
    },
    rules: {
      // Peringatan untuk variabel tak terpakai. Variabel yang diawali huruf kapital atau garis bawah diabaikan.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      // Peringatan untuk blok kosong.
      'no-empty': 'warn',
    },
  },
  {
    // Konfigurasi untuk skrip Node.js di root proyek (vite.config.js, generate-*.js) dan folder scripts/.
    files: ['*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      // Variabel global lingkungan Node.js (process, __dirname bawaan Node, dan sebagainya).
      globals: globals.node,
      sourceType: 'module',
    },
  },
])
