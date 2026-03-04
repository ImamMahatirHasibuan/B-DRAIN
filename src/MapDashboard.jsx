// ========================================
// B-DRAIN - ENHANCED VERSION
// dengan Data Real & UI Modern
// ========================================

import React, { useState, useEffect } from 'react';
import { 
  MapContainer, TileLayer, GeoJSON, Marker, Popup, 
  Circle, CircleMarker, Polyline, useMap, LayersControl 
} from 'react-leaflet';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Droplets, AlertTriangle, Layers, Search, Filter, Download, 
  Info, MapPin, TrendingUp, Activity, Menu, X, Sun, Moon,
  Maximize2, Minimize2, RefreshCw, Database, BarChart3, Map as MapIcon, ArrowLeft
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import './MapDashboard.css';
import logoBDrain from './assets/Logo B-DRAIN.png';
import mapIcon from './assets/map.png';
import emergencyIcon from './assets/emergency.png';
import mapFlagIcon from './assets/maps-and-flags.png';
import clipboardIcon from './assets/clipboard.png';
import databaseIcon from './assets/database.png';
import shoppingIcon from './assets/shopping.png';
import analysisIcon from './assets/analysis.png';
import rankingIcon from './assets/ranking.png';
import satelliteDishIcon from './assets/satellite-dish.png';
import barChartIcon from './assets/bar-chart.png';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const COLORS = ['#991b1b', '#c2410c', '#065f46', '#1e40af', '#6b21a8', '#9f1239'];

// ========================================
// GEOMAN CONTROL COMPONENT
// ========================================
const GeomanControl = () => {
  const map = useMap();
  
  useEffect(() => {
    if (map && L.PM) {
      map.pm.addControls({
        position: 'topleft',
        drawCircle: true,
        drawCircleMarker: false,
        drawPolyline: true,
        drawRectangle: true,
        drawPolygon: true,
        drawMarker: false,
        drawText: false,
        editMode: true,
        dragMode: true,
        cutPolygon: false,
        removalMode: true,
        snappingOption: false,
      });
    }
  }, [map]);
  
  return null;
};

// ========================================
// MODERN MARKER FACTORY
// ========================================
const createMarkerIcon = (severity, count) => {
  const palette = {
    high:   { bg: '#ef4444', glow: 'rgba(239,68,68,0.35)',   ring: 'rgba(239,68,68,0.18)' },
    medium: { bg: '#f59e0b', glow: 'rgba(245,158,11,0.35)',  ring: 'rgba(245,158,11,0.18)' },
    low:    { bg: '#10b981', glow: 'rgba(16,185,129,0.35)',  ring: 'rgba(16,185,129,0.18)' },
  };

  const p = palette[severity] || palette.low;
  const coreSize = severity === 'high' ? 13 : severity === 'medium' ? 11 : 9;
  const totalSize = coreSize + 20; // room for ring

  return L.divIcon({
    html: `
      <div style="
        position:relative;
        width:${totalSize}px;
        height:${totalSize}px;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <!-- outer pulse ring -->
        <span style="
          position:absolute;
          inset:0;
          border-radius:50%;
          background:${p.ring};
          border:1.5px solid ${p.bg}44;
          animation:bdrain-pulse 2.4s ease-out infinite;
        "></span>
        <!-- core dot -->
        <span style="
          position:relative;
          width:${coreSize}px;
          height:${coreSize}px;
          border-radius:50%;
          background:${p.bg};
          box-shadow:0 0 0 2px #fff, 0 2px 10px ${p.glow};
          transition:transform .2s;
          z-index:2;
        "></span>
        ${count > 1 ? `
        <span style="
          position:absolute;
          top:-5px;
          right:-5px;
          background:${p.bg};
          color:#fff;
          font:600 9px/1 'Segoe UI',sans-serif;
          padding:2px 4px;
          border-radius:8px;
          border:1.5px solid #fff;
          min-width:16px;
          text-align:center;
          box-shadow:0 1px 4px rgba(0,0,0,.25);
          z-index:3;
        ">${count}</span>` : ''}
      </div>
      <style>
        @keyframes bdrain-pulse {
          0%   { transform:scale(0.6); opacity:.8; }
          100% { transform:scale(1.6); opacity:0; }
        }
      </style>
    `,
    className: '',
    iconSize: [totalSize, totalSize],
    iconAnchor: [totalSize / 2, totalSize / 2],
    popupAnchor: [0, -(totalSize / 2) - 4],
  });
};

// ========================================
// MAIN COMPONENT
// ========================================
function MapDashboard({ onBack }) {
  const [floodData, setFloodData] = useState([]);
  const [floodPoints, setFloodPoints] = useState([]);
  const [drainageData, setDrainageData] = useState(null);
  const [floodRiskData, setFloodRiskData] = useState(null);
  const [flashFloodRiskData, setFlashFloodRiskData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  
  const [activeLayers, setActiveLayers] = useState({
    floodPoints: true,
    drainage: false,
    floodRisk: false,
    flashFloodRisk: false,
    hospitals: true,
    heatmap: false,
    bufferZones: false
  });
  
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [bufferRadius, setBufferRadius] = useState(500);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [priorityAreas, setPriorityAreas] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.2642, 106.9869]);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // ========================================
  // DATA LOADING
  // ========================================
  useEffect(() => {
    fetch('/data/data_banjir.geojson')
      .then(r => r.json())
      .then(data => {
        const validData = data.features.map(f => ({
          id: f.properties.id,
          kecamatan: f.properties.kecamatan,
          nama_kecamatan: f.properties.nama_kecamatan,
          jumlah_titik: f.properties.jumlah_titik_banjir,
          masa_tanggap: f.properties.masa_tanggap_darurat_hari,
          tahun: f.properties.tahun,
          provinsi: f.properties.nama_provinsi,
          kota: f.properties.bps_nama_kabupaten_kota,
        }));
        setFloodData(validData);

        const points = data.features.map(f => ({
          id: f.properties.id,
          kecamatan: f.properties.kecamatan,
          nama_kecamatan: f.properties.nama_kecamatan,
          jumlah_titik: f.properties.jumlah_titik_banjir,
          masa_tanggap: f.properties.masa_tanggap_darurat_hari,
          tahun: f.properties.tahun,
          provinsi: f.properties.nama_provinsi,
          kota: f.properties.bps_nama_kabupaten_kota,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          severity: f.properties.severity,
        }));
        setFloodPoints(points);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/data/export.geojson').then(r => r.json()).then(setDrainageData).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/data/delineasi-indeks-risiko-banjir.geojson')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setFloodRiskData).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/data/delineasi-indeks-risiko-banjir-bandang.geojson')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setFlashFloodRiskData).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/data/sebaran-rumah-sakit-jawa-barat.geojson')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setHospitalData).catch(() => {});
  }, []);

  // ========================================
  // DATA PROCESSING
  // ========================================
  const getKecamatanData = () => {
    const map = {};
    floodData.forEach(item => {
      if (!map[item.kecamatan]) map[item.kecamatan] = { name: item.nama_kecamatan || item.kecamatan, value: 0 };
      map[item.kecamatan].value += item.jumlah_titik;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6);
  };

  const getRadarData = () => getKecamatanData().map(item => ({ subject: item.name, A: item.value, fullMark: 30 }));

  const getTotalStats = () => {
    const total = floodData.reduce((s, i) => s + i.jumlah_titik, 0);
    const uniqueKec = new Set(floodData.map(i => i.kecamatan));
    const totalKecamatan = uniqueKec.size;
    const avgPerKecamatan = totalKecamatan > 0 ? (total / totalKecamatan).toFixed(1) : 0;
    const highRisk = floodPoints.filter(p => p.severity === 'high').length;
    const years = floodData.map(i => i.tahun).filter(Boolean);
    const minYear = years.length ? Math.min(...years) : 2020;
    const maxYear = years.length ? Math.max(...years) : 2020;
    const yearRange = minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`;
    const maxFloodPoints = floodData.length ? Math.max(...floodData.map(i => i.jumlah_titik)) : 30;
    return { total, avgPerKecamatan, highRisk, totalKecamatan, totalRecords: floodData.length, yearRange, maxFloodPoints };
  };

  // ========================================
  // SPATIAL ANALYSIS
  // ========================================
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const performBufferAnalysis = () => {
    if (!drainageData || floodPoints.length === 0) { alert('Data belum tersedia'); return; }
    const results = floodPoints.map(point => {
      let drainageCount = 0, nearestDrainage = null, minDist = Infinity;
      drainageData.features?.forEach(f => {
        if (f.geometry.type === 'LineString') {
          // Check ALL coordinates in the LineString, not just the first one
          let minDistToLine = Infinity;
          f.geometry.coordinates.forEach(([lng, lat]) => {
            const dist = calculateDistance(point.lat, point.lng, lat, lng);
            if (dist < minDistToLine) {
              minDistToLine = dist;
            }
          });
          
          // Count this drainage if ANY point is within buffer radius
          if (minDistToLine <= bufferRadius) drainageCount++;
          
          // Track nearest drainage overall
          if (minDistToLine < minDist) { 
            minDist = minDistToLine; 
            nearestDrainage = { distance: minDistToLine.toFixed(0), type: f.properties.waterway || 'drain' }; 
          }
        }
      });
      return { ...point, drainageInBuffer: drainageCount, nearestDrainage, coverage: drainageCount > 0 ? 'Terlayani' : 'Tidak Terlayani' };
    });
    setAnalysisResults(results);
    setSelectedAnalysis('buffer');
    setPriorityAreas(results.filter(r => r.drainageInBuffer === 0 && r.severity === 'high').sort((a, b) => b.jumlah_titik - a.jumlah_titik));
  };

  const performProximityAnalysis = () => {
    if (!drainageData || floodPoints.length === 0) { alert('Data belum tersedia'); return; }
    const results = floodPoints.map(point => {
      let minDist = Infinity, info = null;
      drainageData.features?.forEach(f => {
        if (f.geometry.type === 'LineString') {
          // Check ALL coordinates in the LineString to find the closest point
          f.geometry.coordinates.forEach(([lng, lat]) => {
            const dist = calculateDistance(point.lat, point.lng, lat, lng);
            if (dist < minDist) {
              minDist = dist;
              info = { distance: dist.toFixed(0), type: f.properties.waterway || 'drain', coords: { lat, lng }, accessibility: dist < 200 ? 'Sangat Dekat' : dist < 500 ? 'Dekat' : dist < 1000 ? 'Sedang' : 'Jauh' };
            }
          });
        }
      });
      return { ...point, nearestDrainage: info, proximityScore: minDist < 500 ? 'Baik' : minDist < 1000 ? 'Sedang' : 'Buruk' };
    });
    setAnalysisResults(results);
    setSelectedAnalysis('proximity');
  };

  const identifyPriorityAreas = () => {
    const scored = floodPoints.map(p => {
      let score = 0;
      if (p.jumlah_titik >= 20) score += 40; else if (p.jumlah_titik >= 12) score += 25; else score += 10;
      if (p.severity === 'high') score += 30; else if (p.severity === 'medium') score += 20; else score += 10;
      if (analysisResults) {
        const r = analysisResults.find(r => r.id === p.id);
        if (r && r.drainageInBuffer === 0) score += 30; else if (r && r.drainageInBuffer < 2) score += 20; else score += 10;
      }
      return { ...p, priorityScore: score, priorityLevel: score >= 80 ? 'Sangat Mendesak' : score >= 60 ? 'Mendesak' : score >= 40 ? 'Perlu Perhatian' : 'Monitor' };
    });
    setPriorityAreas(scored.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5));
    setSelectedAnalysis('priority');
  };

  // ========================================
  // HANDLERS
  // ========================================
  const toggleLayer = layer => setActiveLayers(p => ({ ...p, [layer]: !p[layer] }));

  const handleBufferZonesToggle = () => {
    if (!analysisResults || selectedAnalysis !== 'buffer') {
      if (!drainageData || floodPoints.length === 0) { alert('Data belum tersedia'); return; }
      performBufferAnalysis();
      setActiveLayers(p => ({ ...p, bufferZones: true }));
    } else {
      setActiveLayers(p => ({ ...p, bufferZones: !p.bufferZones }));
    }
  };

  const toggleDarkMode = () => { setDarkMode(d => !d); document.body.classList.toggle('dark-mode'); };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setFullscreen(true); }
    else { document.exitFullscreen(); setFullscreen(false); }
  };

  const filteredFloodPoints = floodPoints.filter(p => {
    const matchSev = filterSeverity === 'all' || p.severity === filterSeverity;
    const matchSearch = p.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.nama_kecamatan || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchSev && matchSearch;
  });

  // ========================================
  // MAP LAYER STYLES — MODERN POLYGON LOOK
  // ========================================

  // Drainage channels
  const drainageStyle = f => ({
    color: f.properties.waterway === 'drain' ? '#38bdf8' : '#34d399',
    weight: 2,
    opacity: 0.75,
    dashArray: '6 3',
  });

  const normalizeRiskClass = val => {
    if (!val) return 'unknown';
    const s = String(val).toLowerCase().trim();
    if (s.includes('tinggi')) return 'tinggi';
    if (s.includes('sedang')) return 'sedang';
    if (s.includes('rendah')) return 'rendah';
    return 'unknown';
  };

  const getRiskClass = f => {
    const p = f?.properties || {};
    return normalizeRiskClass(p.Kelas ?? p.kelas ?? p.CLASS ?? p.class);
  };

  // ── Banjir Genangan (abu muda / light gray)
  const floodRiskStyle = f => {
    const rc = getRiskClass(f);
    const styles = {
      tinggi: { fill: '#d1d5db', stroke: '#9ca3af', opacity: 0.65, strokeW: 1.8 },
      sedang: { fill: '#e5e7eb', stroke: '#d1d5db', opacity: 0.55, strokeW: 1.5 },
      rendah: { fill: '#f3f4f6', stroke: '#e5e7eb', opacity: 0.45, strokeW: 1.2 },
      unknown:{ fill: '#f9fafb', stroke: '#f3f4f6', opacity: 0.35, strokeW: 1.0 },
    };
    const s = styles[rc] || styles.unknown;
    return {
      fillColor: s.fill,
      fillOpacity: s.opacity,
      color: s.stroke,
      weight: s.strokeW,
      opacity: 0.9,
    };
  };

  // ── Banjir Bandang (abu tua / dark gray dengan diagonal hatching)
  const flashFloodRiskStyle = f => {
    const rc = getRiskClass(f);
    const styles = {
      tinggi: { fill: '#4b5563', stroke: '#374151', opacity: 0.65, strokeW: 2.5, dashArray: '8 4' },
      sedang: { fill: '#6b7280', stroke: '#4b5563', opacity: 0.60, strokeW: 2.2, dashArray: '6 3' },
      rendah: { fill: '#9ca3af', stroke: '#6b7280', opacity: 0.50, strokeW: 2.0, dashArray: '4 2' },
      unknown:{ fill: '#d1d5db', stroke: '#9ca3af', opacity: 0.35, strokeW: 1.5, dashArray: '3 2' },
    };
    const s = styles[rc] || styles.unknown;
    return {
      fillColor: s.fill,
      fillOpacity: s.opacity,
      color: s.stroke,
      weight: s.strokeW,
      dashArray: s.dashArray,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    };
  };

  // Popup untuk banjir genangan
  const onEachFloodRiskFeature = (feature, layer) => {
    const p = feature.properties || {};
    const rc = getRiskClass(feature);
    const rcLabel = { tinggi: 'TINGGI', sedang: 'SEDANG', rendah: 'RENDAH' }[rc] || 'TIDAK DIKETAHUI';
    
    const riskDesc = {
      tinggi: 'Risiko Tinggi - Kemungkinan banjir tinggi, perlu kewaspadaan maksimal',
      sedang: 'Risiko Sedang - Kemungkinan banjir sedang, perlu kewaspadaan',
      rendah: 'Risiko Rendah - Kemungkinan banjir rendah'
    };

    layer.bindPopup(`
      <div class="custom-popup">
        <h4>🌊 Risiko Banjir Genangan</h4>
        <p><strong>Klasifikasi: ${rcLabel}</strong></p>
        <p style="margin: 8px 0; font-size: 0.9em;">${riskDesc[rc] || 'Data risiko banjir'}</p>
        <p style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 0.85em;">
          <strong>Sumber:</strong> ${p.Catatan || 'BPBD Provinsi Jawa Barat'}
        </p>
      </div>
    `);

    // Mark layer type untuk avoid popup conflict
    layer._layerType = 'flood';
    
    const defaultStyle = floodRiskStyle(feature);
    layer.on({
      mouseover: () => layer.setStyle({ ...defaultStyle, weight: 2.5, fillOpacity: Math.min(defaultStyle.fillOpacity + 0.18, 0.9) }),
      mouseout:  () => layer.setStyle(defaultStyle),
    });
  };

  // Popup untuk banjir bandang
  const onEachFlashFloodRiskFeature = (feature, layer) => {
    const p = feature.properties || {};
    const rc = getRiskClass(feature);
    const rcLabel = { tinggi: 'TINGGI', sedang: 'SEDANG', rendah: 'RENDAH' }[rc] || 'TIDAK DIKETAHUI';
    
    const riskDesc = {
      tinggi: 'Risiko Tinggi - Kemungkinan banjir tinggi, perlu kewaspadaan maksimal',
      sedang: 'Risiko Sedang - Kemungkinan banjir sedang, perlu kewaspadaan',
      rendah: 'Risiko Rendah - Kemungkinan banjir rendah'
    };

    layer.bindPopup(`
      <div class="custom-popup">
        <h4>⚡ Risiko Banjir Bandang</h4>
        <p><strong>Klasifikasi: ${rcLabel}</strong></p>
        <p style="margin: 8px 0; font-size: 0.9em;">${riskDesc[rc] || 'Data risiko banjir'}</p>
        <p style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 0.85em;">
          <strong>Sumber:</strong> ${p.Catatan || 'BPBD Provinsi Jawa Barat'}
        </p>
      </div>
    `);

    // Mark layer type untuk avoid popup conflict
    layer._layerType = 'flashFlood';
    
    const defaultStyle = flashFloodRiskStyle(feature);
    layer.on({
      mouseover: () => layer.setStyle({ ...defaultStyle, weight: 2.5, fillOpacity: Math.min(defaultStyle.fillOpacity + 0.18, 0.9) }),
      mouseout:  () => layer.setStyle(defaultStyle),
    });
  };

  const getProximityLineColor = score => score === 'Baik' ? '#10b981' : score === 'Sedang' ? '#f59e0b' : '#ef4444';

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700">{`${(percent*100).toFixed(0)}%`}</text>;
  };

  // ========================================
  // RENDER
  // ========================================
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Droplets size={64} className="loading-icon" />
          <h2>Loading Geodashboard Bekasi...</h2>
          <div className="loading-bar"><div className="loading-progress"></div></div>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();
  const kecamatanData = getKecamatanData();
  const radarData = getRadarData();

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>

      {/* HEADER */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-btn" onClick={onBack} title="Back to Home">
              <ArrowLeft size={14} /><span>Back</span>
            </button>
            <div className="logo">
              <div className="logo-icon-wrapper">
                <img src={logoBDrain} alt="Geodashboard Bekasi" className="logo-image" style={{width:'55px',height:'55px',objectFit:'contain'}} />
              </div>
              <div className="logo-text">
                <h1 style={{fontSize:'1rem',fontWeight:'700',color:'#0c4a6e',marginBottom:'.15rem'}}>Geodashboard Bekasi</h1>
                <p style={{fontSize:'.75rem',color:'#64748b'}}>Visualisasi & Analisis Spasial Titik Rawan Banjir</p>
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="search-box">
              <Search size={20} />
              <input type="text" placeholder="Cari kecamatan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button className="icon-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
            <button className="icon-btn" onClick={toggleFullscreen} title="Fullscreen">{fullscreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}</button>
            <button className="icon-btn" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? "Restore" : "Minimize"}>{isMinimized ? <Maximize2 size={20}/> : <Minimize2 size={20}/>}</button>
            <button className="icon-btn close-btn" onClick={onBack} title="Close Map"><X size={20}/></button>
            <button className="menu-btn" onClick={() => setSidebarOpen(s => !s)}>{sidebarOpen ? <X size={24}/> : <Menu size={23}/>}</button>
          </div>
        </div>
      </header>

      <div className={`main-content ${isMinimized ? 'minimized' : ''}`}>

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen && !isMinimized ? 'open' : 'closed'}`}>
          <div className="sidebar-tabs">
            {[['overview','Overview',<Activity size={18}/>],['layers','Layers',<Layers size={18}/>],['analytics','Analytics',<TrendingUp size={18}/>],['spatial','Spatial',<MapIcon size={18}/>],['data','Data',<Database size={18}/>]].map(([tab,label,icon]) => (
              <button key={tab} className={`tab-btn ${activeTab===tab?'active':''}`} onClick={()=>setActiveTab(tab)}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-content">

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="overview-section">
                <div className="section-header">
                  <h3>Statistik Kota Bekasi</h3>
                  <span className="badge">{stats.yearRange}</span>
                </div>
                <div className="stat-cards">
                  <div className="stat-card gradient-red">
                    <div className="stat-icon"><AlertTriangle size={28}/></div>
                    <div className="stat-content">
                      <span className="stat-value">{stats.total}</span>
                      <span className="stat-label">Total Titik Banjir</span>
                      <span className="stat-change">▲ {stats.highRisk} area high-risk</span>
                    </div>
                  </div>
                  <div className="stat-card gradient-blue">
                    <div className="stat-icon"><MapPin size={28}/></div>
                    <div className="stat-content">
                      <span className="stat-value">{stats.totalKecamatan}</span>
                      <span className="stat-label">Kecamatan Terdampak</span>
                      <span className="stat-change">{stats.totalRecords} kejadian</span>
                    </div>
                  </div>
                  <div className="stat-card gradient-orange">
                    <div className="stat-icon"><Activity size={28}/></div>
                    <div className="stat-content">
                      <span className="stat-value">{hospitalData?.features?.length || 0}</span>
                      <span className="stat-label">Fasilitas Kesehatan</span>
                      <span className="stat-change">Rumah Sakit & Klinik</span>
                    </div>
                  </div>
                  <div className="stat-card gradient-purple">
                    <div className="stat-icon"><Droplets size={28}/></div>
                    <div className="stat-content">
                      <span className="stat-value">{drainageData?.features?.length || 0}</span>
                      <span className="stat-label">Saluran Drainase</span>
                      <span className="stat-change">Data OSM</span>
                    </div>
                  </div>
                  <div className="stat-card gradient-green">
                    <div className="stat-icon"><BarChart3 size={28}/></div>
                    <div className="stat-content">
                      <span className="stat-value">{stats.avgPerKecamatan}</span>
                      <span className="stat-label">Rata-rata/Kecamatan</span>
                      <span className="stat-change">Titik per area</span>
                    </div>
                  </div>
                </div>

                <div className="chart-section glass-effect">
                  <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={barChartIcon} alt="Bar Chart" style={{width:'20px',height:'20px',objectFit:'contain'}} />Top Kecamatan Rawan Banjir</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={kecamatanData} margin={{top:10,right:20,left:10,bottom:25}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3}/>
                      <XAxis dataKey="name" stroke="#6b7280" tick={false} axisLine/>
                      <YAxis stroke="#6b7280" style={{fontSize:'.75rem'}} label={{value:'Jumlah Titik',angle:-90,position:'insideLeft',style:{fontSize:'.75rem'}}}/>
                      <Tooltip contentStyle={{backgroundColor:darkMode?'#1f2937':'#fff',border:'1px solid #e5e7eb',borderRadius:'8px',fontSize:'.875rem',padding:'8px 12px'}} formatter={v=>[`${v} titik`,'Jumlah']}/>
                      <Bar dataKey="value" radius={[8,8,0,0]}>
                        {kecamatanData.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-section glass-effect">
                  <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={barChartIcon} alt="Distribution" style={{width:'20px',height:'20px',objectFit:'contain'}} />Distribusi Titik Banjir</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={kecamatanData} cx="50%" cy="45%" labelLine={false} label={renderPieLabel} innerRadius={35} outerRadius={85} dataKey="value" paddingAngle={2}>
                        {kecamatanData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v,_,p)=>[`${v} titik`,p.payload.name]}/>
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize:'.75rem',paddingTop:'0px',color:'#000000 !important'}} formatter={(value, entry) => <span style={{color:'#000000'}}>{value.length>12?value.slice(0,12)+'…':value}</span>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* LAYERS */}
            {activeTab === 'layers' && (
              <div className="layers-section">
                <h3>Layer Management</h3>
                <div className="layer-controls">
                  {[
                    ['floodPoints','Titik Rawan Banjir',`${filteredFloodPoints.length} lokasi`,<MapPin size={18}/>],
                    ['drainage','Infrastruktur Drainase',`${drainageData?.features?.length||0} saluran`,<Droplets size={18}/>],
                    ['hospitals','Rumah Sakit',`${hospitalData?.features?.length||0} fasilitas`,<AlertTriangle size={18}/>],
                    ['bufferZones','Buffer Zones',selectedAnalysis==='buffer'?`${bufferRadius}m radius`:'Run analysis first',<MapIcon size={18}/>],
                    ['floodRisk','Delineasi Risiko Banjir Genangan',`${floodRiskData?.features?.length||0} area`,<AlertTriangle size={18}/>],
                    ['flashFloodRisk','Delineasi Risiko Banjir Bandang',`${flashFloodRiskData?.features?.length||0} area`,<AlertTriangle size={18}/>],
                  ].map(([key,name,count,icon])=>(
                    <div key={key} className="layer-item glass-effect">
                      <label className="layer-toggle">
                        <input type="checkbox" checked={activeLayers[key]} onChange={key==='bufferZones'?handleBufferZonesToggle:()=>toggleLayer(key)}/>
                        <span className="toggle-slider"></span>
                        <div className="layer-info">
                          <span className="layer-icon">{icon}</span>
                          <div className="layer-details">
                            <span className="layer-name">{name}</span>
                            <span className="layer-count">{count}</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="filter-section">
                  <h4>Filter Tingkat Keparahan</h4>
                  <select value={filterSeverity} onChange={e=>setFilterSeverity(e.target.value)} className="filter-select glass-effect">
                    <option value="all">Semua Tingkat</option>
                    <option value="high">🔴 Tinggi (≥20 titik)</option>
                    <option value="medium">🟡 Sedang (12–19 titik)</option>
                    <option value="low">🟢 Rendah (&lt;12 titik)</option>
                  </select>
                </div>

                <div className="legend-section glass-effect">
                  <h4>Legenda</h4>
                  <div className="legend-items">
                    {[['#ef4444','Tingkat Tinggi','≥20 titik banjir'],['#f59e0b','Tingkat Sedang','12–19 titik banjir'],['#10b981','Tingkat Rendah','<12 titik banjir']].map(([c,n,d])=>(
                      <div key={n} className="legend-item">
                        <span className="legend-color" style={{backgroundColor:c}}></span>
                        <div className="legend-text"><strong>{n}</strong><span>{d}</span></div>
                      </div>
                    ))}
                    <div className="legend-item">
                      <span className="legend-line" style={{backgroundColor:'#38bdf8'}}></span>
                      <div className="legend-text"><strong>Saluran Drainase</strong><span>OpenStreetMap</span></div>
                    </div>
                    <div className="legend-item">
                      <svg style={{width:'20px',height:'20px',flexShrink:0}} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="18" cy="18" r="16" fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5"/>
                        <g fill="white">
                          <rect x="15" y="9" width="6" height="18" rx="1"/>
                          <rect x="9" y="15" width="18" height="6" rx="1"/>
                        </g>
                      </svg>
                      <div className="legend-text"><strong>Rumah Sakit</strong><span>Fasilitas Kesehatan</span></div>
                    </div>
                    {[['#d1d5db','Banjir Genangan – Tinggi'],['#e5e7eb','Banjir Genangan – Sedang'],['#f3f4f6','Banjir Genangan – Rendah'],['#4b5563','Banjir Bandang – Tinggi'],['#6b7280','Banjir Bandang – Sedang'],['#9ca3af','Banjir Bandang – Rendah']].map(([c,n])=>(
                      <div key={n} className="legend-item">
                        <span className="legend-color" style={{backgroundColor:c,opacity:.8}}></span>
                        <div className="legend-text"><strong>{n}</strong></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="analytics-section">
                <h3>Analisis Spasial</h3>
                <div className="analysis-card glass-effect">
                  <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={analysisIcon} alt="Proximity" style={{width:'20px',height:'20px',objectFit:'contain'}} />Proximity Analysis</h4>
                  <p>Analisis kedekatan titik banjir dengan drainase</p>
                  <div className="metric-large">~350m</div>
                  <p className="metric-note">Jarak rata-rata estimasi</p>
                </div>
                <div className="analysis-card glass-effect">
                  <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={rankingIcon} alt="Ranking" style={{width:'20px',height:'20px',objectFit:'contain'}} />Ranking Kecamatan</h4>
                  <div className="top-locations">
                    {floodPoints.sort((a,b)=>b.jumlah_titik-a.jumlah_titik).slice(0,5).map((p,i)=>(
                      <div key={p.id} className="location-item">
                        <span className={`rank rank-${i+1}`}>{i+1}</span>
                        <div className="location-details">
                          <strong>{p.nama_kecamatan||p.kecamatan}</strong>
                          <span>{p.jumlah_titik} titik banjir</span>
                        </div>
                        <span className={`severity-badge-small ${p.severity}`}>{p.severity==='high'?'🔴':p.severity==='medium'?'🟡':'🟢'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="chart-section glass-effect">
                  <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={satelliteDishIcon} alt="Radar" style={{width:'20px',height:'20px',objectFit:'contain'}} />Radar Analysis</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb"/>
                      <PolarAngleAxis dataKey="subject" style={{fontSize:'.75rem',fill:'#1e3a8a'}}/>
                      <PolarRadiusAxis angle={90} domain={[0,Math.ceil(stats.maxFloodPoints*1.1)]}/>
                      <Radar name="Jumlah Titik" dataKey="A" stroke="#1e40af" fill="#1e40af" fillOpacity={0.6}/>
                      <Tooltip/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* SPATIAL ANALYSIS */}
            {activeTab === 'spatial' && (
              <div className="spatial-section">
                <h3 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={analysisIcon} alt="Analysis" style={{width:'24px',height:'24px',objectFit:'contain'}} />Analisis Spasial</h3>
                <p className="section-description">Tools analisis spasial untuk identifikasi korelasi titik rawan banjir dengan infrastruktur drainase</p>

                <div className="analysis-tool glass-effect">
                  <h4><MapIcon size={20}/> Buffer Analysis</h4>
                  <p className="tool-description">Identifikasi saluran drainase dalam radius tertentu dari titik banjir</p>
                  <div className="tool-controls">
                    <div className="control-group">
                      <label>Buffer Radius (meter):</label>
                      <div className="slider-container">
                        <input type="range" min="100" max="2000" step="50" value={bufferRadius} onChange={e=>setBufferRadius(+e.target.value)} className="slider"/>
                        <span className="slider-value">{bufferRadius}m</span>
                      </div>
                    </div>
                    <button className="btn-analyze" onClick={performBufferAnalysis}><Activity size={18}/>Run Buffer Analysis</button>
                  </div>
                </div>

                <div className="analysis-tool glass-effect">
                  <h4>
                    <img src={mapFlagIcon} alt="Map marker" style={{width:'20px',height:'20px',objectFit:'contain'}} />
                    Proximity Analysis
                  </h4>
                  <p className="tool-description">Analisis kedekatan setiap titik banjir ke saluran drainase terdekat</p>
                  <button className="btn-analyze" onClick={performProximityAnalysis}><TrendingUp size={18}/>Run Proximity Analysis</button>
                </div>

                <div className="analysis-tool glass-effect">
                  <h4><AlertTriangle size={20}/> Identifikasi Area Prioritas</h4>
                  <p className="tool-description">Identifikasi area yang memerlukan perbaikan infrastruktur mendesak</p>
                  <button className="btn-analyze" onClick={identifyPriorityAreas}><AlertTriangle size={18}/>Identify Priority Areas</button>
                </div>

                {selectedAnalysis && analysisResults && selectedAnalysis !== 'priority' && (
                  <div className="analysis-results glass-effect">
                    <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                      <img src={clipboardIcon} alt="Results" style={{width:'20px',height:'20px',objectFit:'contain'}} />
                      Hasil: {selectedAnalysis==='buffer'?'Buffer Analysis':'Proximity Analysis'}
                    </h4>
                    {selectedAnalysis==='buffer'&&(
                      <div className="results-content">
                        <div className="result-summary">
                          <div className="summary-card"><span className="summary-label">Terlayani</span><span className="summary-value">{analysisResults.filter(r=>r.coverage==='Terlayani').length}</span></div>
                          <div className="summary-card"><span className="summary-label">Tidak Terlayani</span><span className="summary-value alert">{analysisResults.filter(r=>r.coverage==='Tidak Terlayani').length}</span></div>
                        </div>
                        <div className="results-table">
                          <table><thead><tr><th>Kecamatan</th><th>Drainase</th><th>Status</th><th>Jarak</th></tr></thead>
                          <tbody>{analysisResults.map(r=>(
                            <tr key={r.id}><td>{r.nama_kecamatan||r.kecamatan}</td><td><strong>{r.drainageInBuffer}</strong></td>
                            <td><span className={`coverage-badge ${r.coverage==='Terlayani'?'good':'poor'}`}>{r.coverage}</span></td>
                            <td>{r.nearestDrainage?`${r.nearestDrainage.distance}m`:'N/A'}</td></tr>
                          ))}</tbody></table>
                        </div>
                      </div>
                    )}
                    {selectedAnalysis==='proximity'&&(
                      <div className="results-content">
                        <div className="results-table">
                          <table><thead><tr><th>Kecamatan</th><th>Jarak</th><th>Aksesibilitas</th><th>Skor</th></tr></thead>
                          <tbody>{analysisResults.map(r=>(
                            <tr key={r.id}><td>{r.nama_kecamatan||r.kecamatan}</td>
                            <td>{r.nearestDrainage?`${r.nearestDrainage.distance}m`:'N/A'}</td>
                            <td>{r.nearestDrainage?.accessibility||'N/A'}</td>
                            <td><span className={`score-badge ${r.proximityScore==='Baik'?'good':r.proximityScore==='Sedang'?'medium':'poor'}`}>{r.proximityScore}</span></td></tr>
                          ))}</tbody></table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedAnalysis==='priority'&&priorityAreas.length>0&&(
                  <div className="priority-results glass-effect">
                    <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                      <img src={emergencyIcon} alt="Emergency" style={{width:'20px',height:'20px',objectFit:'contain'}} />
                      Top 5 Area Prioritas
                    </h4>
                    <div className="priority-list">
                      {priorityAreas.map((area,i)=>(
                        <div key={area.id} className={`priority-item priority-${i+1}`}>
                          <div className="priority-rank">{i+1}</div>
                          <div className="priority-info">
                            <h5>{area.nama_kecamatan||area.kecamatan}</h5>
                            <div className="priority-details">
                              <span style={{display:'inline-flex',alignItems:'center',gap:'.10rem'}}>
                                <img src={mapFlagIcon} alt="Map marker" style={{width:'10px',height:'10px',objectFit:'contain'}} />
                                {area.jumlah_titik} titik banjir
                              </span>
                            </div>
                          </div>
                          <div className="priority-score">
                            <div className="score-text">Skor <strong>{area.priorityScore}/100</strong></div>
                            <span className={`priority-level ${area.priorityLevel==='Sangat Mendesak'?'urgent':area.priorityLevel==='Mendesak'?'high':'medium'}`}>{area.priorityLevel}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="recommendation-box">
                      <h5 style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                        <img src={shoppingIcon} alt="Rekomendasi" style={{width:'18px',height:'18px',objectFit:'contain'}} />
                        Rekomendasi
                      </h5>
                      <p>Area prioritas di atas memerlukan perhatian khusus dalam perencanaan perbaikan infrastruktur drainase.</p>
                      <ul>
                        <li>Penambahan kapasitas saluran drainase</li>
                        <li>Pembangunan saluran baru di area tidak terlayani</li>
                        <li>Optimalisasi sistem drainase eksisting</li>
                        <li>Monitoring intensif saat musim hujan</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DATA */}
            {activeTab === 'data' && (
              <div className="data-section">
                <h3>Data Tabel</h3>
                <div className="data-table-wrapper glass-effect">
                  <table className="data-table">
                    <thead><tr><th>Kecamatan</th><th>Titik</th><th>Status</th></tr></thead>
                    <tbody>
                      {filteredFloodPoints.map(p=>(
                        <tr key={p.id}>
                          <td>{p.nama_kecamatan||p.kecamatan}</td>
                          <td><strong>{p.jumlah_titik}</strong></td>
                          <td><span className={`status-badge ${p.severity}`}>{p.severity==='high'?'Tinggi':p.severity==='medium'?'Sedang':'Rendah'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* MAP SECTION */}
        <main className="map-section">
          <MapContainer center={mapCenter} zoom={12} style={{height:'100%',width:'100%'}} className="leaflet-container">

            <GeomanControl />

            {/* Base tile — clean, light cartographic style */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url={darkMode
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
              }
            />

            {/* ── Flash Flood Risk polygons - render first so genangan is on top */}
            {activeLayers.flashFloodRisk && flashFloodRiskData && (
              <GeoJSON
                key="flash-flood-risk"
                data={flashFloodRiskData}
                style={flashFloodRiskStyle}
                onEachFeature={onEachFlashFloodRiskFeature}
              />
            )}

            {/* ── Flood Risk polygons - render last so it's on top */}
            {activeLayers.floodRisk && floodRiskData && (
              <GeoJSON
                key="flood-risk"
                data={floodRiskData}
                style={floodRiskStyle}
                onEachFeature={onEachFloodRiskFeature}
              />
            )}

            {/* ── Drainage channel lines */}
            {activeLayers.drainage && drainageData && (
              <GeoJSON
                key="drainage"
                data={drainageData}
                style={drainageStyle}
                onEachFeature={(f, l) => {
                  l.bindPopup(`
                    <div class="custom-popup">
                      <h4>🌊 Saluran Drainase</h4>
                      <p><strong>Tipe:</strong> ${f.properties.waterway||'drain'}</p>
                      <p style="margin-top: 8px; font-size: 0.85em;"><strong>Sumber:</strong> OpenStreetMap</p>
                    </div>
                  `);
                }}
              />
            )}

            {/* ── Hospital markers */}
            {activeLayers.hospitals && hospitalData && (
              <GeoJSON
                key="hospitals"
                data={hospitalData}
                pointToLayer={(feature, latlng) => {
                  const icon = L.divIcon({
                    html: '<div style="background:#3b82f6;border:2px solid #1e40af;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;box-shadow:0 1px 4px rgba(0,0,0,0.3);">+</div>',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                    popupAnchor: [0, -11],
                  });
                  return L.marker(latlng, { icon });
                }}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties || {};
                  const name = p.name || p.Nama || p.nama || 'Rumah Sakit';
                  const type = p.type || p.Tipe || p.tipe || 'Fasilitas Kesehatan';
                  
                  layer.bindPopup(`
                    <div class="custom-popup">
                      <h4>🏥 ${name}</h4>
                      <p><strong>Tipe:</strong> ${type}</p>
                      <p style="margin-top: 8px; font-size: 0.85em;"><strong>Sumber:</strong> Pemetaan Jawa Barat</p>
                    </div>
                  `);
                }}
              />
            )}

            {/* ── Flood point markers */}
            {activeLayers.floodPoints && filteredFloodPoints.map(point => (
              <Marker
                key={point.id}
                position={[point.lat, point.lng]}
                icon={createMarkerIcon(point.severity, point.jumlah_titik)}
                eventHandlers={{ click: () => setSelectedPoint(point) }}
              >
                <Popup className="custom-popup" maxWidth={260}>
                  <div className="popup-content">
                    <h4 style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                      <img src={mapFlagIcon} alt="Map marker" style={{width:'16px',height:'16px',objectFit:'contain'}} />
                      Titik Rawan Banjir
                    </h4>
                    <p><strong>Kecamatan:</strong> {point.nama_kecamatan||point.kecamatan}</p>
                    <div className="popup-stats">
                      <p><strong>Jumlah Titik Banjir:</strong> {point.jumlah_titik} titik</p>
                      <p><strong>Masa Tanggap Darurat:</strong> {point.masa_tanggap} hari</p>
                      <p><strong>Tahun Data:</strong> {point.tahun}</p>
                      <p><strong>Tingkat Keparahan:</strong> {
                        point.severity==='high'?'🔴 Tinggi':point.severity==='medium'?'🟡 Sedang':'🟢 Rendah'
                      }</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* ── Buffer circles */}
            {activeLayers.bufferZones && selectedAnalysis==='buffer' && analysisResults?.map(p=>(
              <Circle key={`buf-${p.id}`} center={[p.lat,p.lng]} radius={bufferRadius}
                pathOptions={{color:p.coverage==='Terlayani'?'#10b981':'#ef4444',fillColor:p.coverage==='Terlayani'?'#10b981':'#ef4444',fillOpacity:.08,weight:1.5,opacity:.5,dashArray:'6 3'}}
              >
                <Popup><div className="popup-content"><h4>Buffer Zone</h4><p><b>Area:</b> {p.nama_kecamatan||p.kecamatan}</p><p><b>Radius:</b> {bufferRadius}m</p><p><b>Drainase:</b> {p.drainageInBuffer}</p><p><b>Status:</b> {p.coverage}</p></div></Popup>
              </Circle>
            ))}

            {/* ── Proximity lines */}
            {selectedAnalysis==='proximity' && analysisResults?.filter(p=>p.nearestDrainage?.coords).map(p=>(
              <Polyline key={`prox-${p.id}`}
                positions={[[p.lat,p.lng],[p.nearestDrainage.coords.lat,p.nearestDrainage.coords.lng]]}
                pathOptions={{color:getProximityLineColor(p.proximityScore),weight:2,opacity:.65,dashArray:p.proximityScore==='Baik'?'0':'4 6'}}
              >
                <Popup><div className="popup-content"><p><b>Area:</b> {p.nama_kecamatan||p.kecamatan}</p><p><b>Jarak:</b> {p.nearestDrainage.distance}m</p><p><b>Skor:</b> {p.proximityScore}</p></div></Popup>
              </Polyline>
            ))}

            {/* ── Priority circle markers */}
            {selectedAnalysis==='priority' && priorityAreas.map(area=>(
              <CircleMarker key={`pri-${area.id}`} center={[area.lat,area.lng]}
                radius={area.priorityLevel==='Sangat Mendesak'?13:area.priorityLevel==='Mendesak'?10:8}
                pathOptions={{
                  color:area.priorityLevel==='Sangat Mendesak'?'#ef4444':area.priorityLevel==='Mendesak'?'#f59e0b':'#10b981',
                  fillColor:area.priorityLevel==='Sangat Mendesak'?'#ef4444':area.priorityLevel==='Mendesak'?'#f59e0b':'#10b981',
                  fillOpacity:.7,weight:2.5,
                }}
              >
                <Popup><div className="popup-content"><h4>Area Prioritas</h4><p><b>Area:</b> {area.nama_kecamatan||area.kecamatan}</p><p><b>Skor:</b> {area.priorityScore}/100</p><p><b>Level:</b> {area.priorityLevel}</p></div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* ── Map overlay info panel */}
          <div className="map-overlay">
            <div style={{
              background:'rgba(255,255,255,0.92)',
              backdropFilter:'blur(14px)',
              border:'1px solid rgba(14,165,233,0.18)',
              borderRadius:'14px',
              padding:'1rem 1.2rem',
              boxShadow:'0 8px 32px rgba(14,165,233,0.14)',
              minWidth:'190px',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.6rem',borderBottom:'1px solid rgba(14,165,233,0.12)',paddingBottom:'.6rem'}}>
                <img src={mapIcon} alt="map" style={{width:'22px',height:'22px',objectFit:'contain'}}/>
                <span style={{fontWeight:'700',color:'#0c4a6e',fontSize:'.95rem'}}>Kota Bekasi</span>
              </div>
              {[
                ['🌊','Total','  ',`${stats.total} titik`],
                ['🏙️','Area','  ',`${stats.totalKecamatan} kecamatan`],
                ['📅','Data','  ',stats.yearRange],
              ].map(([icon,label,_,val])=>(
                <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'.8rem',marginBottom:'.3rem'}}>
                  <span style={{color:'#64748b',display:'flex',alignItems:'center',gap:'.35rem'}}>{icon==='🌊'?<img src={clipboardIcon} alt="Total" style={{width:'16px',height:'16px',objectFit:'contain'}}/>:icon==='🏙️'?<img src={mapFlagIcon} alt="Area" style={{width:'16px',height:'16px',objectFit:'contain'}}/>:icon==='📅'?<img src={databaseIcon} alt="Data" style={{width:'16px',height:'16px',objectFit:'contain'}}/>:icon} {label}</span>
                  <span style={{fontWeight:'600',color:'#0c4a6e'}}>{val}</span>
                </div>
              ))}
            </div>

            {/* Risk legend overlay */}
            {(activeLayers.floodRisk||activeLayers.flashFloodRisk) && (
              <div style={{
                position:'fixed',bottom:'20px',right:'20px',
                background:'rgba(255,255,255,0.93)',
                backdropFilter:'blur(14px)',
                border:'1px solid rgba(14,165,233,0.18)',
                borderRadius:'14px',
                padding:'1rem 1.2rem',
                maxWidth:'260px',
                zIndex:400,
                boxShadow:'0 8px 32px rgba(14,165,233,0.14)',
              }}>
                <div style={{fontWeight:'700',color:'#0c4a6e',fontSize:'.9rem',borderBottom:'1px solid rgba(14,165,233,0.15)',paddingBottom:'.5rem',marginBottom:'.8rem'}}>
                  📊 Legenda Risiko
                </div>

                {activeLayers.floodRisk && (
                  <div style={{marginBottom:'.8rem'}}>
                    <div style={{fontSize:'.78rem',fontWeight:'700',color:'#6b7280',marginBottom:'.4rem',textTransform:'uppercase',letterSpacing:'.04em'}}>🌊 Banjir Genangan</div>
                    {[['#d1d5db','Tinggi'],['#e5e7eb','Sedang'],['#f3f4f6','Rendah']].map(([c,l])=>(
                      <div key={l} style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.78rem',marginBottom:'.25rem'}}>
                        <span style={{width:'12px',height:'12px',borderRadius:'3px',background:c,flexShrink:0,opacity:.85}}></span>
                        <span style={{color:'#475569'}}>{l}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeLayers.flashFloodRisk && (
                  <div>
                    <div style={{fontSize:'.78rem',fontWeight:'700',color:'#374151',marginBottom:'.4rem',textTransform:'uppercase',letterSpacing:'.04em'}}>⚡ Banjir Bandang</div>
                    {[['#4b5563','Tinggi'],['#6b7280','Sedang'],['#9ca3af','Rendah']].map(([c,l])=>(
                      <div key={l} style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.78rem',marginBottom:'.25rem'}}>
                        <span style={{width:'12px',height:'12px',borderRadius:'3px',background:c,flexShrink:0,opacity:.85}}></span>
                        <span style={{color:'#475569'}}>{l}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

      </div>
    </div>
  );
}

export default MapDashboard;
