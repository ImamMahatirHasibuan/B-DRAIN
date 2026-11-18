/**
 * App.jsx: komponen landing page Geodashboard Bekasi (B-DRAIN).
 *
 * Landing page ini menampilkan hero dengan animasi, galeri foto interaktif + lightbox,
 * bagian Tentang Project, Fitur Unggulan dengan animasi bar chart, bagian Dataset & Teknologi,
 * footer lengkap dengan integrasi GitHub, Email, dan LinkedIn, serta modal unduh dataset.
 * Perpindahan tampilan dilakukan lewat state showMap: jika true, MapDashboard dirender.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Database,
  ArrowRight,
  Github,
  Mail,
  Linkedin,
  Check,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import MapDashboard from './MapDashboard';
import './App.css';

// Ikon dan gambar dari src/assets
import mapIcon from './assets/map.png';
import analysisIcon from './assets/analysis.png';
import emergencyIcon from './assets/emergency.png';
import barChartIcon from './assets/bar-chart.png';
import databaseIcon from './assets/database.png';
import clipboardIcon from './assets/clipboard.png';
import photoPng from './assets/photo.png';

// Foto dokumentasi lapangan (foto1 sampai foto7)
import foto1 from './assets/foto1.jpg';
import foto2 from './assets/foto2.jpg';
import foto3 from './assets/foto3.jpg';
import foto4 from './assets/foto4.jpg';
import foto5 from './assets/foto5.jpg';
import foto6 from './assets/foto6.jpg';
import foto7 from './assets/foto7.jpg';

// Metadata 7 foto dokumentasi lapangan
const PHOTOS_DATA = [
  { src: foto1, title: 'Saluran Drainase Primer & Sekunder', desc: 'Pemantauan saluran drainase terbuka perkotaan Bekasi' },
  { src: foto2, title: 'Tanggul & Sempadan Sungai', desc: 'Evaluasi elevasi tanggul penahan luapan air sungai utama' },
  { src: foto3, title: 'Pintu Air & Pompa Pengendali', desc: 'Infrastruktur pengendali debit air dan pintu pengatur aliran' },
  { src: foto4, title: 'Sedimentasi Saluran Air', desc: 'Identifikasi endapan lumpur yang menurunkan kapasitas tampung' },
  { src: foto5, title: 'Wilayah Rawan Genangan Permukiman', desc: 'Zona permukiman padat penduduk yang rentan genangan' },
  { src: foto6, title: 'Pertemuan Aliran & Muara Saluran', desc: 'Titik konfluensi anak sungai dan saluran primer' },
  { src: foto7, title: 'Survei Titik Genangan Lapangan', desc: 'Verifikasi koordinat lapangan untuk validasi spasial model' },
];

/**
 * Komponen utama landing page B-DRAIN.
 */
function App() {
  const [showMap, setShowMap] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [dataPreview, setDataPreview] = useState({ status: 'loading', features: [], kecamatan: 0, totalTitik: 0 });
  const [lightbox, setLightbox] = useState({ isOpen: false, index: 0 });
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [chartInView, setChartInView] = useState(() => (
    typeof window !== 'undefined' ? !('IntersectionObserver' in window) : false
  ));

  const carouselRef = useRef(null);

  // Mengambil data_banjir.geojson saat landing dimuat
  useEffect(() => {
    let aktif = true;
    fetch('/data/data_banjir.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((geojson) => {
        if (!aktif) return;
        const features = Array.isArray(geojson.features) ? geojson.features : [];
        const kecamatanUnik = new Set(features.map((f) => f.properties?.kecamatan)).size;
        const totalTitik = features.reduce((sum, f) => sum + (Number(f.properties?.jumlah_titik_banjir) || 0), 0);
        setDataPreview({ status: 'ready', features, kecamatan: kecamatanUnik, totalTitik });
      })
      .catch(() => {
        if (aktif) setDataPreview((prev) => ({ ...prev, status: 'error' }));
      });
    return () => { aktif = false; };
  }, []);

  // Keyboard navigation untuk Lightbox, Modal, dan Mobile Menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightbox.isOpen) {
          setLightbox((prev) => ({ ...prev, isOpen: false }));
        } else if (showDatasetModal) {
          setShowDatasetModal(false);
        } else if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      } else if (lightbox.isOpen) {
        if (e.key === 'ArrowLeft') {
          setLightbox((prev) => ({
            ...prev,
            index: (prev.index - 1 + PHOTOS_DATA.length) % PHOTOS_DATA.length,
          }));
        } else if (e.key === 'ArrowRight') {
          setLightbox((prev) => ({
            ...prev,
            index: (prev.index + 1) % PHOTOS_DATA.length,
          }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox.isOpen, showDatasetModal, mobileMenuOpen]);

  // Lock body scroll saat Lightbox, Modal, atau Mobile Menu terbuka
  useEffect(() => {
    if (lightbox.isOpen || showDatasetModal || mobileMenuOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [lightbox.isOpen, showDatasetModal, mobileMenuOpen]);

  // Scroll animations via Native IntersectionObserver
  useEffect(() => {
    if (showMap) return;

    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            if (entry.target.id === 'features' || entry.target.querySelector('.chart-mockup')) {
              setChartInView(true);
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach((el) => observer.observe(el));

    // Observer untuk mendeteksi seksi aktif pada navbar
    const sectionElements = document.querySelectorAll('section[id], header[id]');
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    sectionElements.forEach((sec) => sectionObserver.observe(sec));

    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
    };
  }, [showMap]);

  // Deteksi scroll pada horizontal carousel mobile
  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      if (idx >= 0 && idx < PHOTOS_DATA.length && idx !== activeCarouselIndex) {
        setActiveCarouselIndex(idx);
      }
    }
  }, [activeCarouselIndex]);

  // Navigasi ke slide carousel mobile lewat dot
  const scrollToCarouselSlide = (idx) => {
    if (!carouselRef.current) return;
    const slideWidth = carouselRef.current.clientWidth;
    carouselRef.current.scrollTo({
      left: idx * slideWidth,
      behavior: 'smooth',
    });
    setActiveCarouselIndex(idx);
  };

  // Navigasi foto di Lightbox
  const handleNextPhoto = (e) => {
    e.stopPropagation();
    setLightbox((prev) => ({
      ...prev,
      index: (prev.index + 1) % PHOTOS_DATA.length,
    }));
  };

  const handlePrevPhoto = (e) => {
    e.stopPropagation();
    setLightbox((prev) => ({
      ...prev,
      index: (prev.index - 1 + PHOTOS_DATA.length) % PHOTOS_DATA.length,
    }));
  };

  // Buka Lightbox pada foto tertentu
  const openLightbox = (index) => {
    setLightbox({ isOpen: true, index });
  };

  // Tutup Lightbox
  const closeLightbox = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
  };

  // Dataset utama yang dapat diunduh dari modal
  const datasets = [
    { name: 'data_banjir.geojson',                                type: 'GeoJSON', desc: '70 titik rawan banjir di 12 kecamatan Kota Bekasi', path: '/data/data_banjir.geojson' },
    { name: 'kelurahan_kota_bekasi_48.geojson',                   type: 'GeoJSON', desc: '48 kelurahan wilayah administratif Kota Bekasi beserta 9 fitur spasial', path: '/data/kelurahan_kota_bekasi_48.geojson' },
    { name: 'export.geojson',                                     type: 'GeoJSON', desc: 'Sungai Utama / jaringan sungai Kota Bekasi (BIG 1:25.000 / SUNGAI_LN_25K)',   path: '/data/export.geojson' },
    { name: 'sebaran-rumah-sakit-jawa-barat.geojson',             type: 'GeoJSON', desc: 'Sebaran fasilitas kesehatan Jawa Barat',            path: '/data/sebaran-rumah-sakit-jawa-barat.geojson' },
  ];

  // Layer Topografi BIG 1:25.000 (8 kategori, 24 file)
  const topoDatasets = [
    { group: 'Topografi', color: '#b45309', items: [
      { name: 'KONTUR_LN_25K.geojson',     desc: 'Garis kontur elevasi',        path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/KONTUR_LN_25K.geojson' },
      { name: 'SPOTHEIGHT_PT_25K.geojson', desc: 'Titik ketinggian (spot height)', path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/SPOTHEIGHT_PT_25K.geojson' },
    ]},
    { group: 'Perairan', color: '#0ea5e9', items: [
      { name: 'SUNGAI_LN_25K.geojson',  desc: 'Jaringan sungai (garis)',  path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/SUNGAI_LN_25K.geojson' },
      { name: 'SUNGAI_AR_25K.geojson',  desc: 'Area sungai (poligon)',    path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/SUNGAI_AR_25K.geojson' },
      { name: 'DANAU_AR_25K.geojson',   desc: 'Area danau / waduk',       path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/DANAU_AR_25K.geojson' },
      { name: 'TAMBANGAN_LN_25K.geojson', desc: 'Jalur tambangan/penyeberangan', path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/TAMBANGAN_LN_25K.geojson' },
    ]},
    { group: 'Vegetasi', color: '#78350f', items: [
      { name: 'NONAGRIALANG_AR_25K.geojson',        desc: 'Area alang-alang',   path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/NONAGRIALANG_AR_25K.geojson' },
      { name: 'NONAGRISEMAKBELUKAR_AR_25K.geojson', desc: 'Area semak belukar', path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/NONAGRISEMAKBELUKAR_AR_25K.geojson' },
    ]},
    { group: 'Permukiman', color: '#be123c', items: [
      { name: 'PEMUKIMAN_AR_25K.geojson',  desc: 'Area permukiman',        path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/PEMUKIMAN_AR_25K.geojson' },
      { name: 'BANGUNAN_AR_25K.geojson',   desc: 'Bangunan (poligon)',     path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/BANGUNAN_AR_25K.geojson' },
      { name: 'BANGUNAN_PT_25K.geojson',   desc: 'Bangunan (titik)',       path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/BANGUNAN_PT_25K.geojson' },
    ]},
    { group: 'Transportasi', color: '#d97706', items: [
      { name: 'JALAN_LN_25K.geojson',      desc: 'Jaringan jalan',         path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/JALAN_LN_25K.geojson' },
      { name: 'RELKA_LN_25K.geojson',      desc: 'Rel kereta api',         path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/RELKA_LN_25K.geojson' },
      { name: 'JEMBATAN_LN_25K.geojson',   desc: 'Jembatan (garis)',       path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/JEMBATAN_LN_25K.geojson' },
      { name: 'JEMBATAN_PT_25K.geojson',   desc: 'Jembatan (titik)',       path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/JEMBATAN_PT_25K.geojson' },
      { name: 'STASIUNKA_PT_25K.geojson',  desc: 'Stasiun kereta api',     path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/STASIUNKA_PT_25K.geojson' },
    ]},
    { group: 'Administrasi', color: '#7c3aed', items: [
      { name: 'ADMINISTRASI_LN_25K.geojson',     desc: 'Batas administrasi',     path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/ADMINISTRASI_LN_25K.geojson' },
      { name: 'ADMINISTRASIDESA_AR_25K.geojson', desc: 'Batas desa/kelurahan',   path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson' },
      { name: 'TOPONIMI_PT_25K.geojson',         desc: 'Nama tempat (toponimi)', path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/TOPONIMI_PT_25K.geojson' },
      { name: 'TONGGAKKM_PT_25K.geojson',        desc: 'Tonggak kilometer',      path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/TONGGAKKM_PT_25K.geojson' },
    ]},
    { group: 'Fasilitas Umum', color: '#059669', items: [
      { name: 'KESEHATAN_PT_25K.geojson',    desc: 'Fasilitas kesehatan',    path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/KESEHATAN_PT_25K.geojson' },
      { name: 'PENDIDIKAN_PT_25K.geojson',   desc: 'Fasilitas pendidikan',   path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/PENDIDIKAN_PT_25K.geojson' },
      { name: 'PEMERINTAHAN_PT_25K.geojson', desc: 'Kantor pemerintahan',    path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/PEMERINTAHAN_PT_25K.geojson' },
      { name: 'SARANAIBADAH_PT_25K.geojson', desc: 'Sarana ibadah',          path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/SARANAIBADAH_PT_25K.geojson' },
      { name: 'KANTORPOS_PT_25K.geojson',    desc: 'Kantor pos',             path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/KANTORPOS_PT_25K.geojson' },
      { name: 'NIAGA_PT_25K.geojson',        desc: 'Niaga / komersial',      path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/NIAGA_PT_25K.geojson' },
      { name: 'CAGARBUDAYA_PT_25K.geojson',  desc: 'Cagar budaya',           path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/CAGARBUDAYA_PT_25K.geojson' },
    ]},
    { group: 'Utilitas', color: '#ca8a04', items: [
      { name: 'KABELLISTRIK_LN_25K.geojson', desc: 'Jaringan kabel listrik', path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/KABELLISTRIK_LN_25K.geojson' },
      { name: 'GENLISTRIK_PT_25K.geojson',   desc: 'Generator listrik',      path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/GENLISTRIK_PT_25K.geojson' },
      { name: 'DEPOMINYAK_PT_25K.geojson',   desc: 'Depo minyak',            path: '/data/geojson_kota_bekasi/geojson_kota_bekasi/DEPOMINYAK_PT_25K.geojson' },
    ]},
  ];

  // Memicu unduhan file
  const handleDownload = (filePath, fileName) => {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Jika showMap bernilai true, buka tampilan MapDashboard
  if (showMap) {
    return <MapDashboard onBack={() => setShowMap(false)} />;
  }

  return (
    <div className="landing-page">
      {/* ===================== NAVBAR ===================== */}
      <nav className="navbar" role="navigation" aria-label="Navigasi Utama">
        <div className="nav-container">
          <a href="#hero" className="nav-brand" aria-label="B-DRAIN Beranda">
            <img src="/logo.png" alt="Logo B-DRAIN" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-title">B-DRAIN</span>
              <span className="brand-sub">Kota Bekasi</span>
            </div>
          </a>

          {/* Navigasi Desktop */}
          <div className="nav-desktop">
            <div className="nav-links">
              <a
                href="#about"
                className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
              >
                About
              </a>
              <a
                href="#features"
                className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}
              >
                Features
              </a>
              <a
                href="#data"
                className={`nav-link ${activeSection === 'data' ? 'active' : ''}`}
              >
                Data
              </a>
            </div>

            <div className="nav-actions">
              <a
                href="https://github.com/ImamMahatirHasibuan/B-DRAIN"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-btn-github"
                aria-label="Repository GitHub B-DRAIN"
                title="Buka Repository GitHub B-DRAIN"
              >
                <Github size={18} />
              </a>

              <button
                className="btn-map"
                onClick={() => setShowMap(true)}
                aria-label="Visit Dashboard"
              >
                Visit Dashboard <ArrowRight size={17} />
              </button>
            </div>
          </div>

          {/* Toggle Menu Mobile */}
          <button
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-header">
              <div className="mobile-nav-brand">
                <img src="/logo.png" alt="B-DRAIN" className="brand-logo-small" />
                <span className="brand-title">B-DRAIN</span>
              </div>
              <button
                className="mobile-nav-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup navigasi mobile"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-nav-links">
              <a
                href="#about"
                className={`mobile-nav-link ${activeSection === 'about' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </a>
              <a
                href="#features"
                className={`mobile-nav-link ${activeSection === 'features' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#data"
                className={`mobile-nav-link ${activeSection === 'data' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Data
              </a>
              <a
                href="https://github.com/ImamMahatirHasibuan/B-DRAIN"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-nav-link github-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Github size={18} /> GitHub Repository
              </a>
            </div>

            <div className="mobile-nav-cta">
              <button
                className="btn-map-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowMap(true);
                }}
              >
                Visit Dashboard <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== HERO SECTION ===================== */}
      <section id="hero" className="hero-section">
        <div className="hero-content">
          <div className="hero-text reveal-on-scroll hero-reveal">
            <div className="badge">Geodashboard Berbasis Web GIS</div>
            <h1>
              Visualisasi & Analisis<br />
              <span className="gradient-text">Titik Rawan Banjir</span><br />
              Kota Bekasi
            </h1>
            <p className="hero-description">
              Platform Geodashboard interaktif untuk visualisasi data spasial titik rawan banjir 
              dan Sungai Utama Kota Bekasi. Dilengkapi fitur analisis spasial untuk 
              identifikasi area prioritas perbaikan infrastruktur.
            </p>

            <div className="hero-actions">
              <button
                className="btn-primary"
                onClick={() => setShowMap(true)}
                aria-label="Explore Geodashboard"
              >
                <img src={analysisIcon} alt="Explore" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                Explore Geodashboard
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowDatasetModal(true)}
                aria-label="View Dataset"
              >
                <Database size={19} />
                View Dataset
              </button>
            </div>

            {/* Statistik Cepat */}
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">
                  {dataPreview.status === 'ready' ? dataPreview.kecamatan : (
                    <span className="stat-loading-dash">-</span>
                  )}
                </div>
                <div className="stat-label">Kecamatan</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {dataPreview.status === 'ready' ? dataPreview.features.length : (
                    <span className="stat-loading-dash">-</span>
                  )}
                </div>
                <div className="stat-label">Titik Data</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">
                  {dataPreview.status === 'ready' ? dataPreview.totalTitik : (
                    <span className="stat-loading-dash">-</span>
                  )}
                </div>
                <div className="stat-label">Total Titik Banjir</div>
              </div>
            </div>
          </div>

          {/* Card Dokumentasi Galeri Foto (Desktop Asimetris + Mobile Carousel) */}
          <div className="hero-visual reveal-on-scroll hero-card-reveal">
            <div className="visual-card">
              <div className="card-header">
                <div className="card-header-left">
                  <img src={photoPng} alt="Dokumentasi" className="header-icon" />
                  <span>Dokumentasi Lapangan</span>
                </div>
                <span className="photo-count-badge">{PHOTOS_DATA.length} Foto</span>
              </div>

              {/* TAMPILAN DESKTOP & TABLET: Layout Asimetris (1 Utama + 6 Thumbnail) */}
              <div className="desktop-gallery">
                <div
                  className="photo-featured"
                  onClick={() => openLightbox(0)}
                  role="button"
                  tabIndex={0}
                  aria-label="Buka foto utama di lightbox"
                  onKeyDown={(e) => { if (e.key === 'Enter') openLightbox(0); }}
                >
                  <img src={PHOTOS_DATA[0].src} alt={PHOTOS_DATA[0].title} className="gallery-img" />
                  <div className="photo-overlay">
                    <span className="photo-overlay-tag">Foto Utama</span>
                    <p className="photo-overlay-title">{PHOTOS_DATA[0].title}</p>
                    <span className="photo-zoom-hint"><Maximize2 size={14} /> Perbesar</span>
                  </div>
                </div>

                <div className="photo-thumbs-grid">
                  {PHOTOS_DATA.slice(1).map((photo, idx) => {
                    const actualIdx = idx + 1;
                    return (
                      <div
                        key={actualIdx}
                        className="photo-thumb-item"
                        onClick={() => openLightbox(actualIdx)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Buka foto ${actualIdx + 1} di lightbox`}
                        onKeyDown={(e) => { if (e.key === 'Enter') openLightbox(actualIdx); }}
                      >
                        <img src={photo.src} alt={photo.title} className="gallery-thumb-img" />
                        <div className="thumb-hover-overlay">
                          <Maximize2 size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TAMPILAN MOBILE: Horizontal Swipe Carousel */}
              <div className="mobile-carousel-wrap">
                <div
                  className="mobile-carousel"
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                >
                  {PHOTOS_DATA.map((photo, idx) => (
                    <div
                      key={idx}
                      className="carousel-slide"
                      onClick={() => openLightbox(idx)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Buka foto ${idx + 1}: ${photo.title}`}
                      onKeyDown={(e) => { if (e.key === 'Enter') openLightbox(idx); }}
                    >
                      <div className="carousel-img-container">
                        <img src={photo.src} alt={photo.title} className="carousel-img" />
                        <div className="carousel-caption">
                          <span className="carousel-index">Foto {idx + 1} dari {PHOTOS_DATA.length}</span>
                          <span className="carousel-title">{photo.title}</span>
                        </div>
                        <span className="carousel-zoom-pill">
                          <Maximize2 size={13} /> Ketuk untuk Perbesar
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dot Indicators untuk Mobile Carousel */}
                <div className="carousel-dots" aria-label="Indikator slide foto">
                  {PHOTOS_DATA.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      className={`carousel-dot ${activeCarouselIndex === dotIdx ? 'active' : ''}`}
                      onClick={() => scrollToCarouselSlide(dotIdx)}
                      aria-label={`Menuju foto ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Footer Ringkas Card Dokumentasi */}
              <div className="visual-card-footer">
                <span className="visual-footer-note">
                  Dokumentasi survei kondisi drainase & titik banjir Kota Bekasi
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== ABOUT SECTION ===================== */}
      <section id="about" className="about-section reveal-on-scroll">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Tentang Project</span>
            <h2>Geodashboard Berbasis Web untuk Analisis Spasial</h2>
            <p>Platform SIG (Sistem Informasi Geografis) untuk visualisasi dan analisis titik rawan banjir serta Sungai Utama</p>
          </div>
          <div className="about-grid">
            <div className="about-card stagger-item">
              <div className="about-icon">
                <img src={mapIcon} alt="Map" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              </div>
              <h3>Visualisasi Spasial Interaktif</h3>
              <p>Peta interaktif dengan Leaflet.js menampilkan data Shapefile (.shp) dan GeoJSON untuk visualisasi area Sungai Utama dan titik banjir di 12 kecamatan Bekasi.</p>
            </div>
            <div className="about-card stagger-item">
              <div className="about-icon">
                <img src={analysisIcon} alt="Analysis" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              </div>
              <h3>Analisis Spasial</h3>
              <p>Fitur Buffer Analysis dan Proximity Analysis untuk mengidentifikasi korelasi antara titik genangan dengan Sungai Utama terdekat.</p>
            </div>
            <div className="about-card stagger-item">
              <div className="about-icon">
                <img src={emergencyIcon} alt="Priority" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              </div>
              <h3>Identifikasi Area Prioritas</h3>
              <p>Sistem scoring otomatis untuk menentukan area yang memerlukan perbaikan infrastruktur sungai secara mendesak.</p>
            </div>
            <div className="about-card stagger-item">
              <div className="about-icon">
                <img src={barChartIcon} alt="Analytics" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              </div>
              <h3>Dashboard Analitik</h3>
              <p>Visualisasi data dengan berbagai chart dan grafik untuk mendukung pengambilan keputusan berbasis data spasial.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FEATURES SECTION ===================== */}
      <section id="features" className="features-section reveal-on-scroll">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Key Features</span>
            <h2>Fitur Unggulan</h2>
          </div>
          <div className="features-grid">
            <div className="feature-large">
              <div className="feature-visual">
                <div className={`chart-mockup ${chartInView ? 'animate-bars' : ''}`} aria-hidden="true">
                  <div className="bar bar-1" style={{ '--target-height': '70%' }}></div>
                  <div className="bar bar-2" style={{ '--target-height': '45%' }}></div>
                  <div className="bar bar-3" style={{ '--target-height': '85%' }}></div>
                  <div className="bar bar-4" style={{ '--target-height': '60%' }}></div>
                  <div className="bar bar-5" style={{ '--target-height': '90%' }}></div>
                </div>
              </div>
              <div className="feature-content">
                <img src={analysisIcon} alt="Spatial Analysis" className="feature-icon" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                <h3>Spatial Analysis Tools</h3>
                <p>Fitur analisis spasial untuk identifikasi korelasi titik banjir dengan Sungai Utama</p>
                <ul className="feature-checklist">
                  <li><Check size={16} className="check-icon" /> Buffer Analysis</li>
                  <li><Check size={16} className="check-icon" /> Proximity Analysis</li>
                  <li><Check size={16} className="check-icon" /> Priority Area Identification</li>
                </ul>
              </div>
            </div>
            <div className="feature-card stagger-item">
              <img src={mapIcon} alt="Interactive GIS" className="card-icon" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              <h3>Interactive GIS Layers</h3>
              <p>Multiple layers: Sungai Utama, Flood points, dan Buffer zones visualization</p>
            </div>
            <div className="feature-card stagger-item">
              <img src={databaseIcon} alt="Shapefile Support" className="card-icon" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              <h3>Shapefile Support</h3>
              <p>Import data spasial format .shp dan GeoJSON untuk visualisasi infrastruktur</p>
            </div>
            <div className="feature-card stagger-item">
              <img src={clipboardIcon} alt="Dynamic Filtering" className="card-icon" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              <h3>Dynamic Filtering</h3>
              <p>Filter real-time berdasarkan kecamatan, severity, dan hasil analisis spasial</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== DATA SECTION ===================== */}
      <section id="data" className="data-section reveal-on-scroll">
        <div className="section-container">
          <div className="data-content">
            <div className="data-text">
              <span className="section-tag">Open Data</span>
              <h2>Dataset & Technology</h2>
              <p>Project ini menggunakan dataset terbuka dari pemerintah Kota Bekasi dan dibangun dengan modern tech stack:</p>
              <div className="tech-stack">
                <span className="tech-badge">React.js</span>
                <span className="tech-badge">Leaflet.js</span>
                <span className="tech-badge">Recharts</span>
                <span className="tech-badge">GeoJSON</span>
              </div>
              <button
                className="btn-data"
                onClick={() => setShowMap(true)}
                aria-label="Start Exploring Geodashboard"
              >
                Start Exploring →
              </button>
            </div>

            <div className="data-visual">
              <div className="data-box">
                <div className="data-header">
                  <span>
                    <img src={databaseIcon} alt="" style={{ width: '18px', height: '18px', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    data_banjir.geojson
                  </span>
                </div>
                <div className="data-rows">
                  {dataPreview.status === 'loading' && <p className="data-note">Memuat data...</p>}
                  {dataPreview.status === 'error' && (
                    <p className="data-note">Data tidak dapat dimuat. Pastikan file public/data/data_banjir.geojson tersedia.</p>
                  )}
                  {dataPreview.status === 'ready' && (
                    <>
                      <p className="data-note">
                        {dataPreview.features.length} fitur, {dataPreview.kecamatan} kecamatan. Menampilkan 6 baris pertama.
                      </p>
                      <div className="data-table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Kecamatan</th>
                              <th>Titik</th>
                              <th>Severity</th>
                              <th>Tahun</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dataPreview.features.slice(0, 6).map((f, idx) => (
                              <tr key={idx}>
                                <td>{f.properties?.nama_kecamatan ?? f.properties?.kecamatan ?? '-'}</td>
                                <td>{f.properties?.jumlah_titik_banjir ?? '-'}</td>
                                <td>{f.properties?.severity ?? '-'}</td>
                                <td>{f.properties?.tahun ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="footer reveal-on-scroll">
        <div className="footer-content">
          {/* Kolom 1: Brand & Keterangan Proyek */}
          <div className="footer-brand">
            <div className="footer-logo-wrap">
              <img src="/logo.png" alt="Logo Geodashboard Bekasi" className="footer-logo" />
              <div className="footer-brand-title">
                <h4>Geodashboard Bekasi</h4>
                <span className="footer-brand-badge">B-DRAIN</span>
              </div>
            </div>
            <p className="footer-brand-desc">
              Visualisasi & Analisis Spasial Titik Rawan Banjir Kota Bekasi berbasis Web GIS.
            </p>
          </div>

          {/* Kolom 2: Informasi Akademik & Pengembang */}
          <div className="footer-info">
            <h5 className="footer-heading">Informasi Project</h5>
            <p className="footer-text">
              <strong>Mahasiswa:</strong> Imam Mahatir Hasibuan
            </p>
            <p className="footer-text">
              <strong>NIM:</strong> 2702278386
            </p>
            <p className="footer-text">
              <strong>Program:</strong> Computer Science - Software Engineering
            </p>
            <p className="footer-text">
              <strong>Universitas:</strong> Bina Nusantara
            </p>
            <p className="footer-text footer-email-row">
              <strong>Email:</strong>{' '}
              <a href="mailto:imamahatir@gmail.com" className="footer-email-link">
                <Mail size={13} /> imamahatir@gmail.com
              </a>
            </p>
          </div>

          {/* Kolom 3: Tautan Sosial & Repositori Resmi */}
          <div className="footer-social-column">
            <h5 className="footer-heading">Tautan & Kontak</h5>
            <div className="footer-social-links">
              <a
                href="https://github.com/ImamMahatirHasibuan/B-DRAIN"
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill-btn github-pill"
                aria-label="GitHub Repository B-DRAIN"
              >
                <Github size={17} />
                <span>GitHub</span>
                <ExternalLink size={12} className="pill-ext-icon" />
              </a>

              <a
                href="mailto:imamahatir@gmail.com"
                className="social-pill-btn email-pill"
                aria-label="Kirim Email ke Imam Mahatir Hasibuan"
              >
                <Mail size={17} />
                <span>Email</span>
              </a>

              <a
                href="https://www.linkedin.com/in/imam-mahatir-hasibuan-75169a2a8"
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill-btn linkedin-pill"
                aria-label="Profil LinkedIn Imam Mahatir Hasibuan"
              >
                <Linkedin size={17} />
                <span>LinkedIn</span>
                <ExternalLink size={12} className="pill-ext-icon" />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Geodashboard Bekasi - Pre-Thesis Project. Built with React, Leaflet.js & GeoJSON.</p>
        </div>
      </footer>

      {/* ===================== LIGHTBOX MODAL ===================== */}
      {lightbox.isOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox} role="dialog" aria-modal="true" aria-label="Lightbox Foto Dokumentasi">
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <div className="lightbox-title-wrap">
                <span className="lightbox-count">
                  Foto {lightbox.index + 1} dari {PHOTOS_DATA.length}
                </span>
                <h3 className="lightbox-caption">{PHOTOS_DATA[lightbox.index].title}</h3>
              </div>
              <button
                className="lightbox-close-btn"
                onClick={closeLightbox}
                aria-label="Tutup preview foto"
              >
                <X size={22} />
              </button>
            </div>

            <div className="lightbox-body">
              <button
                className="lightbox-nav-btn prev"
                onClick={handlePrevPhoto}
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft size={28} />
              </button>

              <div className="lightbox-image-wrap">
                <img
                  src={PHOTOS_DATA[lightbox.index].src}
                  alt={PHOTOS_DATA[lightbox.index].title}
                  className="lightbox-img"
                />
                <p className="lightbox-desc">{PHOTOS_DATA[lightbox.index].desc}</p>
              </div>

              <button
                className="lightbox-nav-btn next"
                onClick={handleNextPhoto}
                aria-label="Foto berikutnya"
              >
                <ChevronRight size={28} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DATASET MODAL ===================== */}
      {showDatasetModal && (
        <div className="modal-overlay" onClick={() => setShowDatasetModal(false)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dataset-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="dataset-modal-title">Download Dataset</h2>
              <button
                className="modal-close"
                onClick={() => setShowDatasetModal(false)}
                title="Tutup dialog dataset"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">Pilih dataset spasial yang ingin Anda unduh:</p>

              {/* Dataset Utama */}
              <div className="modal-section-group">
                <h3 className="modal-section-title">
                  <Database size={15} /> Dataset Utama
                </h3>
                <div className="dataset-list">
                  {datasets.map((dataset, idx) => (
                    <div key={idx} className="dataset-item">
                      <div className="dataset-info">
                        <h4>{dataset.name}</h4>
                        <div className="dataset-meta">
                          <span className="dataset-type">{dataset.type}</span>
                          <span className="dataset-size">{dataset.desc}</span>
                        </div>
                      </div>
                      <button
                        className="btn-download"
                        onClick={() => handleDownload(dataset.path, dataset.name)}
                        aria-label={`Download ${dataset.name}`}
                      >
                        <Database size={15} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Topografi BIG 1:25.000 */}
              <div className="modal-section-group">
                <h3 className="modal-section-title">
                  <Database size={15} /> Topografi BIG 1:25.000
                </h3>
                <p className="modal-section-sub">
                  Sumber: Badan Informasi Geospasial — Peta Rupa Bumi Indonesia wilayah Kota Bekasi ({topoDatasets.reduce((s, g) => s + g.items.length, 0)} layer)
                </p>
                {topoDatasets.map((group) => (
                  <div key={group.group} className="topo-group-block">
                    <div
                      className="topo-group-title"
                      style={{ color: group.color, borderLeftColor: group.color }}
                    >
                      {group.group}
                    </div>
                    <div className="dataset-list topo-list">
                      {group.items.map((item, idx) => (
                        <div key={idx} className="dataset-item topo-item">
                          <div className="dataset-info">
                            <h4 className="topo-item-name">{item.name}</h4>
                            <div className="dataset-meta">
                              <span className="dataset-type">GeoJSON</span>
                              <span className="dataset-size">{item.desc}</span>
                            </div>
                          </div>
                          <button
                            className="btn-download topo-btn-download"
                            onClick={() => handleDownload(item.path, item.name)}
                            aria-label={`Download ${item.name}`}
                          >
                            <Database size={13} /> Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;