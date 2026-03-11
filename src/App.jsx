import React, { useState } from 'react';
import { Activity, Database, TrendingUp, ArrowRight, Github, Mail, Droplet } from 'lucide-react';
import MapDashboard from './MapDashboard';
import './App.css';
import mapIcon from './assets/map.png';
import analysisIcon from './assets/analysis.png';
import emergencyIcon from './assets/emergency.png';
import barChartIcon from './assets/bar-chart.png';
import databaseIcon from './assets/database.png';
import clipboardIcon from './assets/clipboard.png';
import shoppingIcon from './assets/shopping.png';
import foto1 from './assets/foto1.jpg';
import foto2 from './assets/foto2.jpg';
import foto3 from './assets/foto3.jpg';
import foto4 from './assets/foto4.jpg';
import foto5 from './assets/foto5.jpg';
import foto6 from './assets/foto6.jpg';
import foto7 from './assets/foto7.jpg';

function App() {
  const [showMap, setShowMap] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const photos = [foto1, foto2, foto3, foto4, foto5, foto6, foto7];
  
  const datasets = [
    { name: 'data_banjir.geojson',                                type: 'GeoJSON', desc: 'Titik rawan banjir historis 30 kecamatan',          path: '/data/data_banjir.geojson' },
    { name: 'delineasi-indeks-risiko-banjir.geojson',             type: 'GeoJSON', desc: 'Delineasi indeks risiko banjir genangan (61 area)',  path: '/data/delineasi-indeks-risiko-banjir.geojson' },
    { name: 'delineasi-indeks-risiko-banjir.csv',                 type: 'CSV',     desc: 'Versi CSV risiko banjir genangan',                  path: '/data/delineasi-indeks-risiko-banjir.csv' },
    { name: 'delineasi-indeks-risiko-banjir-bandang.geojson',     type: 'GeoJSON', desc: 'Delineasi indeks risiko banjir bandang (61 area)',   path: '/data/delineasi-indeks-risiko-banjir-bandang.geojson' },
    { name: 'delineasi-indeks-risiko-banjir-bandang.csv',         type: 'CSV',     desc: 'Versi CSV risiko banjir bandang',                   path: '/data/delineasi-indeks-risiko-banjir-bandang.csv' },
    { name: 'export.geojson',                                     type: 'GeoJSON', desc: 'Infrastruktur drainase (OpenStreetMap)',             path: '/data/export.geojson' },
    { name: 'sebaran-rumah-sakit-jawa-barat.geojson',             type: 'GeoJSON', desc: 'Sebaran fasilitas kesehatan Jawa Barat',            path: '/data/sebaran-rumah-sakit-jawa-barat.geojson' },
  ];

  const topoDatasets = [
    { group: 'Topografi', color: '#b45309', items: [
      { name: 'KONTUR_LN_25K.geojson',     desc: 'Garis kontur elevasi',        path: '/data/geojson_kota_bekasi/KONTUR_LN_25K.geojson' },
      { name: 'SPOTHEIGHT_PT_25K.geojson', desc: 'Titik ketinggian (spot height)', path: '/data/geojson_kota_bekasi/SPOTHEIGHT_PT_25K.geojson' },
    ]},
    { group: 'Perairan', color: '#0ea5e9', items: [
      { name: 'SUNGAI_LN_25K.geojson',  desc: 'Jaringan sungai (garis)',  path: '/data/geojson_kota_bekasi/SUNGAI_LN_25K.geojson' },
      { name: 'SUNGAI_AR_25K.geojson',  desc: 'Area sungai (poligon)',    path: '/data/geojson_kota_bekasi/SUNGAI_AR_25K.geojson' },
      { name: 'DANAU_AR_25K.geojson',   desc: 'Area danau / waduk',       path: '/data/geojson_kota_bekasi/DANAU_AR_25K.geojson' },
      { name: 'TAMBANGAN_LN_25K.geojson', desc: 'Jalur tambangan/penyeberangan', path: '/data/geojson_kota_bekasi/TAMBANGAN_LN_25K.geojson' },
    ]},
    { group: 'Pertanian', color: '#16a34a', items: [
      { name: 'AGRISAWAH_AR_25K.geojson',       desc: 'Area sawah',              path: '/data/geojson_kota_bekasi/AGRISAWAH_AR_25K.geojson' },
      { name: 'AGRILADANG_AR_25K.geojson',      desc: 'Area ladang',             path: '/data/geojson_kota_bekasi/AGRILADANG_AR_25K.geojson' },
      { name: 'AGRIKEBUN_AR_25K.geojson',       desc: 'Area perkebunan',         path: '/data/geojson_kota_bekasi/AGRIKEBUN_AR_25K.geojson' },
      { name: 'AGRITANAMCAMPUR_AR_25K.geojson', desc: 'Area tanaman campuran',   path: '/data/geojson_kota_bekasi/AGRITANAMCAMPUR_AR_25K.geojson' },
    ]},
    { group: 'Vegetasi', color: '#78350f', items: [
      { name: 'NONAGRIALANG_AR_25K.geojson',        desc: 'Area alang-alang',   path: '/data/geojson_kota_bekasi/NONAGRIALANG_AR_25K.geojson' },
      { name: 'NONAGRISEMAKBELUKAR_AR_25K.geojson', desc: 'Area semak belukar', path: '/data/geojson_kota_bekasi/NONAGRISEMAKBELUKAR_AR_25K.geojson' },
    ]},
    { group: 'Permukiman', color: '#be123c', items: [
      { name: 'PEMUKIMAN_AR_25K.geojson',  desc: 'Area permukiman',        path: '/data/geojson_kota_bekasi/PEMUKIMAN_AR_25K.geojson' },
      { name: 'BANGUNAN_AR_25K.geojson',   desc: 'Bangunan (poligon)',     path: '/data/geojson_kota_bekasi/BANGUNAN_AR_25K.geojson' },
      { name: 'BANGUNAN_PT_25K.geojson',   desc: 'Bangunan (titik)',       path: '/data/geojson_kota_bekasi/BANGUNAN_PT_25K.geojson' },
    ]},
    { group: 'Transportasi', color: '#d97706', items: [
      { name: 'JALAN_LN_25K.geojson',      desc: 'Jaringan jalan',         path: '/data/geojson_kota_bekasi/JALAN_LN_25K.geojson' },
      { name: 'RELKA_LN_25K.geojson',      desc: 'Rel kereta api',         path: '/data/geojson_kota_bekasi/RELKA_LN_25K.geojson' },
      { name: 'JEMBATAN_LN_25K.geojson',   desc: 'Jembatan (garis)',       path: '/data/geojson_kota_bekasi/JEMBATAN_LN_25K.geojson' },
      { name: 'JEMBATAN_PT_25K.geojson',   desc: 'Jembatan (titik)',       path: '/data/geojson_kota_bekasi/JEMBATAN_PT_25K.geojson' },
      { name: 'STASIUNKA_PT_25K.geojson',  desc: 'Stasiun kereta api',     path: '/data/geojson_kota_bekasi/STASIUNKA_PT_25K.geojson' },
    ]},
    { group: 'Administrasi', color: '#7c3aed', items: [
      { name: 'ADMINISTRASI_LN_25K.geojson',     desc: 'Batas administrasi',     path: '/data/geojson_kota_bekasi/ADMINISTRASI_LN_25K.geojson' },
      { name: 'ADMINISTRASIDESA_AR_25K.geojson', desc: 'Batas desa/kelurahan',   path: '/data/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson' },
      { name: 'TOPONIMI_PT_25K.geojson',         desc: 'Nama tempat (toponimi)', path: '/data/geojson_kota_bekasi/TOPONIMI_PT_25K.geojson' },
      { name: 'TONGGAKKM_PT_25K.geojson',        desc: 'Tonggak kilometer',      path: '/data/geojson_kota_bekasi/TONGGAKKM_PT_25K.geojson' },
    ]},
    { group: 'Fasilitas Umum', color: '#059669', items: [
      { name: 'KESEHATAN_PT_25K.geojson',    desc: 'Fasilitas kesehatan',    path: '/data/geojson_kota_bekasi/KESEHATAN_PT_25K.geojson' },
      { name: 'PENDIDIKAN_PT_25K.geojson',   desc: 'Fasilitas pendidikan',   path: '/data/geojson_kota_bekasi/PENDIDIKAN_PT_25K.geojson' },
      { name: 'PEMERINTAHAN_PT_25K.geojson', desc: 'Kantor pemerintahan',    path: '/data/geojson_kota_bekasi/PEMERINTAHAN_PT_25K.geojson' },
      { name: 'SARANAIBADAH_PT_25K.geojson', desc: 'Sarana ibadah',          path: '/data/geojson_kota_bekasi/SARANAIBADAH_PT_25K.geojson' },
      { name: 'KANTORPOS_PT_25K.geojson',    desc: 'Kantor pos',             path: '/data/geojson_kota_bekasi/KANTORPOS_PT_25K.geojson' },
      { name: 'NIAGA_PT_25K.geojson',        desc: 'Niaga / komersial',      path: '/data/geojson_kota_bekasi/NIAGA_PT_25K.geojson' },
      { name: 'CAGARBUDAYA_PT_25K.geojson',  desc: 'Cagar budaya',           path: '/data/geojson_kota_bekasi/CAGARBUDAYA_PT_25K.geojson' },
    ]},
    { group: 'Utilitas', color: '#ca8a04', items: [
      { name: 'KABELLISTRIK_LN_25K.geojson', desc: 'Jaringan kabel listrik', path: '/data/geojson_kota_bekasi/KABELLISTRIK_LN_25K.geojson' },
      { name: 'GENLISTRIK_PT_25K.geojson',   desc: 'Generator listrik',      path: '/data/geojson_kota_bekasi/GENLISTRIK_PT_25K.geojson' },
      { name: 'DEPOMINYAK_PT_25K.geojson',   desc: 'Depo minyak',            path: '/data/geojson_kota_bekasi/DEPOMINYAK_PT_25K.geojson' },
    ]},
  ];

  const handleDownload = (filePath, fileName) => {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  console.log('App is rendering!', showMap);

  if (showMap) {
    return <MapDashboard onBack={() => setShowMap(false)} />;
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <nav className="navbar">
          <div className="nav-brand">
            <img src="/logo.png" alt="Geodashboard Bekasi" className="brand-logo" style={{width: '100px', height: '100px', objectFit: 'contain'}} />
          </div>
          <div className="nav-links">
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <a href="#data">Data</a>
            <button className="btn-map" onClick={() => setShowMap(true)}>
              Visit Dashboard <ArrowRight size={18} />
            </button>
          </div>
        </nav>

        <div className="hero-content">
          <div className="hero-text">
            <div className="badge">Geodashboard Berbasis Web GIS</div>
            <h1>
              Visualisasi & Analisis<br />
              <span className="gradient-text">Titik Rawan Banjir</span><br />
              Kota Bekasi
            </h1>
            <p>
              Platform Geodashboard interaktif untuk visualisasi data spasial titik rawan banjir 
              dan infrastruktur drainase Kota Bekasi. Dilengkapi fitur analisis spasial untuk 
              identifikasi area prioritas perbaikan infrastruktur.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => setShowMap(true)}>
                <Activity size={20} />
                Explore Geodashboard
              </button>
              <button className="btn-secondary" onClick={() => setShowDatasetModal(true)}>
                <Database size={20} />
                View Dataset
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">12</div>
                <div className="stat-label">Kecamatan</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">250+</div>
                <div className="stat-label">Flood Points</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">100%</div>
                <div className="stat-label">Interactive</div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-card">
              <div className="card-header">
                <Activity size={20} />
                <span>Dokumentasi</span>
              </div>
              <div className="visual-content">
                <div className="photos-grid">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="photo-item">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="grid-photo" />
                    </div>
                  ))}
                </div>
                <div className="preview-stats">
                  <div className="preview-item high">
                    <div className="dot"></div>
                    <span>Total Foto</span>
                    <strong>{photos.length}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Tentang Project</span>
            <h2>Geodashboard Berbasis Web untuk Analisis Spasial</h2>
            <p>Platform SIG (Sistem Informasi Geografis) untuk visualisasi dan analisis titik rawan banjir serta infrastruktur drainase</p>
          </div>
          <div className="about-grid">
            <div className="about-card">
              <div className="about-icon"><img src={mapIcon} alt="Map" style={{width: '48px', height: '48px'}} /></div>
              <h3>Visualisasi Spasial Interaktif</h3>
              <p>Peta interaktif dengan Leaflet.js menampilkan data Shapefile (.shp) dan GeoJSON untuk visualisasi area drainase dan titik banjir di 12 kecamatan Bekasi.</p>
            </div>
            <div className="about-card">
              <div className="about-icon"><img src={analysisIcon} alt="Analysis" style={{width: '48px', height: '48px'}} /></div>
              <h3>Analisis Spasial</h3>
              <p>Fitur Buffer Analysis dan Proximity Analysis untuk mengidentifikasi korelasi antara titik genangan dengan saluran drainase terdekat.</p>
            </div>
            <div className="about-card">
              <div className="about-icon"><img src={emergencyIcon} alt="Priority" style={{width: '48px', height: '48px'}} /></div>
              <h3>Identifikasi Area Prioritas</h3>
              <p>Sistem scoring otomatis untuk menentukan area yang memerlukan perbaikan infrastruktur drainase secara mendesak.</p>
            </div>
            <div className="about-card">
              <div className="about-icon"><img src={barChartIcon} alt="Analytics" style={{width: '48px', height: '48px'}} /></div>
              <h3>Dashboard Analitik</h3>
              <p>Visualisasi data dengan berbagai chart dan grafik untuk mendukung pengambilan keputusan berbasis data spasial.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Key Features</span>
            <h2>Fitur Unggulan</h2>
          </div>
          <div className="features-grid">
            <div className="feature-large">
              <div className="feature-visual">
                <div className="chart-mockup">
                  <div className="bar" style={{height: '70%'}}></div>
                  <div className="bar" style={{height: '45%'}}></div>
                  <div className="bar" style={{height: '85%'}}></div>
                  <div className="bar" style={{height: '60%'}}></div>
                  <div className="bar" style={{height: '90%'}}></div>
                </div>
              </div>
              <div className="feature-content">
                <img src={analysisIcon} alt="Spatial Analysis" className="feature-icon" style={{width: '32px', height: '32px'}} />
                <h3>Spatial Analysis Tools</h3>
                <p>Fitur analisis spasial untuk identifikasi korelasi titik banjir dengan infrastruktur drainase</p>
                <ul>
                  <li>✓ Buffer Analysis</li>
                  <li>✓ Proximity Analysis</li>
                  <li>✓ Priority Area Identification</li>
                </ul>
              </div>
            </div>
            <div className="feature-card">
              <img src={mapIcon} alt="Interactive GIS" className="card-icon" style={{width: '28px', height: '28px'}} />
              <h3>Interactive GIS Layers</h3>
              <p>Multiple layers: Drainage system, Flood points, dan Buffer zones visualization</p>
            </div>
            <div className="feature-card">
              <img src={databaseIcon} alt="Shapefile Support" className="card-icon" style={{width: '28px', height: '28px'}} />
              <h3>Shapefile Support</h3>
              <p>Import data spasial format .shp dan GeoJSON untuk visualisasi infrastruktur</p>
            </div>
            <div className="feature-card">
              <img src={clipboardIcon} alt="Dynamic Filtering" className="card-icon" style={{width: '28px', height: '28px'}} />
              <h3>Dynamic Filtering</h3>
              <p>Filter real-time berdasarkan kecamatan, severity, dan hasil analisis spasial</p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Section */}
      <section id="data" className="data-section">
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
                <span className="tech-badge">Papa Parse</span>
              </div>
              <button className="btn-data" onClick={() => setShowMap(true)}>
                Start Exploring →
              </button>
            </div>
            <div className="data-visual">
              <div className="data-box">
                <div className="data-header">
                  <span><img src={databaseIcon} alt="Database" style={{width: '20px', height: '20px', marginRight: '0.5rem', verticalAlign: 'middle'}} /> data_jumlah_bencana_alam_banjir.csv</span>
                </div>
                <div className="data-rows">
                  <div className="data-row">kecamatan,nama_kecamatan,jumlah_titik,tahun...</div>
                  <div className="data-row">PONDOKGEDE,Pondok Gede,25,2020...</div>
                  <div className="data-row">JATISAMPURNA,Jati Sampurna,18,2020...</div>
                  <div className="data-row">BANTARGEBANG,Bantar Gebang,32,2020...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src="/logo.png" alt="Geodashboard Bekasi" className="footer-logo" style={{width: '100px', height: '100px', objectFit: 'contain'}} />
            <h4 style={{marginTop: '0.5rem', fontSize: '1.1rem'}}>Geodashboard Bekasi</h4>
            <p style={{fontSize: '0.85rem', color: '#94a3b8'}}>
              Visualisasi & Analisis Spasial Titik Rawan Banjir
            </p>
          </div>
          <div className="footer-info">
            <h5 style={{marginBottom: '0.75rem', color: '#0c4a6e'}}>Informasi Project</h5>
            <p style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>
              <strong>Mahasiswa:</strong> Imam Mahatir Hasibuan
            </p>
            <p style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>
              <strong>NIM:</strong> 2702278386
            </p>
            <p style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>
              <strong>Program:</strong> Computer Science - Software Engineering
            </p>
            <p style={{fontSize: '0.85rem'}}>
              <strong>Universitas:</strong> Bina Nusantara
            </p>
          </div>
          <div className="footer-links">
            <Github size={20} />
            <Mail size={20} />
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Geodashboard Bekasi - Pre-Thesis Project. Built with React, Leaflet.js & GeoJSON.</p>
        </div>
      </footer>

      {/* Dataset Modal */}
      {showDatasetModal && (
        <div className="modal-overlay" onClick={() => setShowDatasetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Download Dataset</h2>
              <button className="modal-close" onClick={() => setShowDatasetModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{marginBottom: '1.5rem', color: '#64748b'}}>Pilih dataset yang ingin Anda download:</p>

              {/* Dataset Utama */}
              <div style={{marginBottom: '1.5rem'}}>
                <h3 style={{fontSize: '0.85rem', fontWeight: '700', color: '#0c4a6e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                  <Database size={14}/> Dataset Utama
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
                      <button className="btn-download" onClick={() => handleDownload(dataset.path, dataset.name)}>
                        <Database size={16}/> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Topografi BIG */}
              <div>
                <h3 style={{fontSize: '0.85rem', fontWeight: '700', color: '#0c4a6e', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                  <Database size={14}/> Topografi BIG 1:25.000
                </h3>
                <p style={{fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem'}}>
                  Sumber: Badan Informasi Geospasial — Peta Rupa Bumi Indonesia, wilayah Kota Bekasi ({topoDatasets.reduce((s, g) => s + g.items.length, 0)} layer)
                </p>
                {topoDatasets.map((group) => (
                  <div key={group.group} style={{marginBottom: '1rem'}}>
                    <div style={{fontSize: '0.78rem', fontWeight: '700', color: group.color, borderLeft: `3px solid ${group.color}`, paddingLeft: '0.5rem', marginBottom: '0.4rem'}}>
                      {group.group}
                    </div>
                    <div className="dataset-list" style={{gap: '0.3rem'}}>
                      {group.items.map((item, idx) => (
                        <div key={idx} className="dataset-item" style={{padding: '0.5rem 0.75rem'}}>
                          <div className="dataset-info">
                            <h4 style={{fontSize: '0.8rem'}}>{item.name}</h4>
                            <div className="dataset-meta">
                              <span className="dataset-type">GeoJSON</span>
                              <span className="dataset-size">{item.desc}</span>
                            </div>
                          </div>
                          <button className="btn-download" style={{padding: '0.3rem 0.65rem', fontSize: '0.75rem'}} onClick={() => handleDownload(item.path, item.name)}>
                            <Database size={13}/> Download
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
