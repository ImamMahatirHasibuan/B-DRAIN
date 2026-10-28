// Titik masuk (entry point) aplikasi React: memasang komponen App ke elemen #root di index.html.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Stylesheet global (reset dan gaya dasar halaman), dimuat sebelum komponen App.
import './index.css'
import App from './App.jsx'

// Membuat root React pada elemen #root, lalu merender App di dalam StrictMode (pemeriksaan tambahan saat development).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
