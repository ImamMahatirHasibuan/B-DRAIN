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
import L from 'leaflet';
import './MapDashboard.css';
import logoBDrain from './assets/Logo B-DRAIN.png';
import mapIcon from './assets/map.png';
import GeomanControls from './GeomanControls';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

// ========================================
// HELPER FUNCTIONS
// ========================================

const createMarkerIcon = (severity, count) => {
  // Simple solid color markers
  const colors = {
    high: '#e63946',
    medium: '#f77f00',
    low: '#06d6a0'
  };
  
  const color = colors[severity] || colors.low;
  const baseSize = 14;
  const size = Math.min(Math.max(baseSize + (count * 0.4), 14), 28);
  
  return L.divIcon({
    html: `
      <div class="simple-marker-wrapper">
        <div class="simple-marker-dot" style="background-color: ${color}; width: ${size}px; height: ${size}px;"></div>
        ${count > 1 ? `<span class="simple-marker-badge" style="background-color: ${color};">${count}</span>` : ''}
      </div>
    `,
    className: 'simple-marker-container',
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
    popupAnchor: [0, -(size + 8) / 2 - 5]
  });
};

// ========================================
// MAIN COMPONENT
// ========================================
function MapDashboard({ onBack }) {
  // States
  const [floodData, setFloodData] = useState([]);
  const [floodPoints, setFloodPoints] = useState([]);
  const [drainageData, setDrainageData] = useState(null);
  const [floodRiskData, setFloodRiskData] = useState(null);
  const [flashFloodRiskData, setFlashFloodRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  
  const [activeLayers, setActiveLayers] = useState({
    floodPoints: true,
    drainage: true,
    floodRisk: true,
    flashFloodRisk: true,
    heatmap: false,
    bufferZones: false
  });
  
  const [filterSeverity, setFilterSeverity] = useState('all');
  
  // Spatial Analysis States
  const [bufferRadius, setBufferRadius] = useState(500); // dalam meter
  const [analysisResults, setAnalysisResults] = useState(null);
  const [priorityAreas, setPriorityAreas] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.2642, 106.9869]); // Bekasi center

  // ========================================
  // LOAD REAL GEOJSON DATA - BANJIR
  // ========================================
  useEffect(() => {
    fetch('/data/data_banjir.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('✅ Real Banjir GeoJSON Data loaded:', data.features.length, 'features');
        
        // Extract data from GeoJSON features
        const validData = data.features.map((feature) => ({
          id: feature.properties.id,
          kecamatan: feature.properties.kecamatan,
          nama_kecamatan: feature.properties.nama_kecamatan,
          jumlah_titik: feature.properties.jumlah_titik_banjir,
          masa_tanggap: feature.properties.masa_tanggap_darurat_hari,
          tahun: feature.properties.tahun,
          provinsi: feature.properties.nama_provinsi,
          kota: feature.properties.bps_nama_kabupaten_kota
        }));
        
        setFloodData(validData);
        
        // Create flood points with coordinates from GeoJSON
        const points = data.features.map(feature => {
          const coords = feature.geometry.coordinates; // [lng, lat]
          
          return {
            id: feature.properties.id,
            kecamatan: feature.properties.kecamatan,
            nama_kecamatan: feature.properties.nama_kecamatan,
            jumlah_titik: feature.properties.jumlah_titik_banjir,
            masa_tanggap: feature.properties.masa_tanggap_darurat_hari,
            tahun: feature.properties.tahun,
            provinsi: feature.properties.nama_provinsi,
            kota: feature.properties.bps_nama_kabupaten_kota,
            lat: coords[1],  // GeoJSON uses [lng, lat]
            lng: coords[0],
            severity: feature.properties.severity
          };
        });
        
        setFloodPoints(points);
        setLoading(false);
      })
      .catch(error => {
        console.error('❌ Error loading Banjir GeoJSON:', error);
        setLoading(false);
      });
  }, []);

  // ========================================
  // LOAD REAL GEOJSON DATA
  // ========================================
  useEffect(() => {
    fetch('/data/export.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('✅ Real GeoJSON Data loaded:', data.features.length, 'features');
        setDrainageData(data);
      })
      .catch(error => {
        console.error('❌ Error loading GeoJSON:', error);
      });
  }, []);

  useEffect(() => {
    fetch('/data/delineasi-indeks-risiko-banjir.geojson')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setFloodRiskData(data);
        console.log('✅ Layer risiko banjir loaded:', data.features?.length || 0, 'features');
      })
      .catch(error => {
        console.warn('⚠️ Layer risiko banjir belum tersedia (opsional):', error.message);
      });
  }, []);

  useEffect(() => {
    fetch('/data/delineasi-indeks-risiko-banjir-bandang.geojson')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setFlashFloodRiskData(data);
        console.log('✅ Layer risiko banjir bandang loaded:', data.features?.length || 0, 'features');
      })
      .catch(error => {
        console.warn('⚠️ Layer risiko banjir bandang belum tersedia (opsional):', error.message);
      });
  }, []);

  // ========================================
  // DATA PROCESSING
  // ========================================
  
  const getKecamatanData = () => {
    const kecamatanMap = {};
    
    floodData.forEach(item => {
      if (!kecamatanMap[item.kecamatan]) {
        kecamatanMap[item.kecamatan] = {
          name: item.nama_kecamatan || item.kecamatan,
          value: 0
        };
      }
      kecamatanMap[item.kecamatan].value += item.jumlah_titik;
    });
    
    return Object.values(kecamatanMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const getRadarData = () => {
    return getKecamatanData().map(item => ({
      subject: item.name,
      A: item.value,
      fullMark: 30
    }));
  };

  const getTotalStats = () => {
    const total = floodData.reduce((sum, item) => sum + item.jumlah_titik, 0);
    
    // Hitung jumlah kecamatan unik
    const uniqueKecamatan = new Set(floodData.map(item => item.kecamatan));
    const totalKecamatan = uniqueKecamatan.size;
    
    // Hitung rata-rata
    const avgPerKecamatan = totalKecamatan > 0 ? total / totalKecamatan : 0;
    const highRisk = floodPoints.filter(p => p.severity === 'high').length;
    
    // Get tahun range
    const years = floodData.map(item => item.tahun).filter(y => y);
    const minYear = years.length > 0 ? Math.min(...years) : 2020;
    const maxYear = years.length > 0 ? Math.max(...years) : 2020;
    const yearRange = minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`;
    
    // Get max flood points untuk radar chart
    const maxFloodPoints = floodData.length > 0 ? Math.max(...floodData.map(item => item.jumlah_titik)) : 30;
    
    return { 
      total, 
      avgPerKecamatan: avgPerKecamatan.toFixed(1), 
      highRisk,
      totalKecamatan,
      totalRecords: floodData.length,
      yearRange,
      maxFloodPoints
    };
  };

  // ========================================
  // SPATIAL ANALYSIS FUNCTIONS
  // ========================================
  
  // Haversine formula untuk menghitung jarak antara dua koordinat
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Buffer Analysis - Mengidentifikasi saluran drainase dalam radius dari titik banjir
  const performBufferAnalysis = () => {
    if (!drainageData || floodPoints.length === 0) {
      alert('Data drainase atau titik banjir belum tersedia');
      return;
    }

    const results = floodPoints.map(point => {
      let drainageCount = 0;
      let nearestDrainage = null;
      let minDistance = Infinity;

      // Hitung drainase dalam buffer radius
      if (drainageData.features) {
        drainageData.features.forEach(feature => {
          if (feature.geometry.type === 'LineString') {
            // Cek titik pertama dari LineString
            const drainCoords = feature.geometry.coordinates[0];
            const distance = calculateDistance(
              point.lat, point.lng,
              drainCoords[1], drainCoords[0]
            );

            if (distance <= bufferRadius) {
              drainageCount++;
            }

            if (distance < minDistance) {
              minDistance = distance;
              nearestDrainage = {
                distance: distance.toFixed(0),
                type: feature.properties.waterway || 'drain'
              };
            }
          }
        });
      }

      return {
        ...point,
        drainageInBuffer: drainageCount,
        nearestDrainage,
        coverage: drainageCount > 0 ? 'Terlayani' : 'Tidak Terlayani'
      };
    });

    setAnalysisResults(results);
    setSelectedAnalysis('buffer');
    
    // Identifikasi area prioritas perbaikan
    const priority = results
      .filter(r => r.drainageInBuffer === 0 && r.severity === 'high')
      .sort((a, b) => b.jumlah_titik - a.jumlah_titik);
    
    setPriorityAreas(priority);
  };

  // Proximity Analysis - Analisis kedekatan ke saluran drainase terdekat
  const performProximityAnalysis = () => {
    if (!drainageData || floodPoints.length === 0) {
      alert('Data drainase atau titik banjir belum tersedia');
      return;
    }

    const results = floodPoints.map(point => {
      let minDistance = Infinity;
      let nearestDrainageInfo = null;

      if (drainageData.features) {
        drainageData.features.forEach(feature => {
          if (feature.geometry.type === 'LineString') {
            const drainCoords = feature.geometry.coordinates[0];
            const distance = calculateDistance(
              point.lat, point.lng,
              drainCoords[1], drainCoords[0]
            );

            if (distance < minDistance) {
              minDistance = distance;
              nearestDrainageInfo = {
                distance: distance.toFixed(0),
                type: feature.properties.waterway || 'drain',
                coords: { lat: drainCoords[1], lng: drainCoords[0] },
                accessibility: distance < 200 ? 'Sangat Dekat' : 
                              distance < 500 ? 'Dekat' : 
                              distance < 1000 ? 'Sedang' : 'Jauh'
              };
            }
          }
        });
      }

      return {
        ...point,
        nearestDrainage: nearestDrainageInfo,
        proximityScore: minDistance < 500 ? 'Baik' : minDistance < 1000 ? 'Sedang' : 'Buruk'
      };
    });

    setAnalysisResults(results);
    setSelectedAnalysis('proximity');
  };

  // Identifikasi Area Prioritas Perbaikan
  const identifyPriorityAreas = () => {
    const scored = floodPoints.map(point => {
      let score = 0;
      
      // Skor berdasarkan jumlah titik banjir (40%)
      if (point.jumlah_titik >= 20) score += 40;
      else if (point.jumlah_titik >= 12) score += 25;
      else score += 10;
      
      // Skor berdasarkan severity (30%)
      if (point.severity === 'high') score += 30;
      else if (point.severity === 'medium') score += 20;
      else score += 10;
      
      // Skor berdasarkan ketersediaan drainase (30%)
      if (analysisResults) {
        const result = analysisResults.find(r => r.id === point.id);
        if (result && result.drainageInBuffer === 0) score += 30;
        else if (result && result.drainageInBuffer < 2) score += 20;
        else score += 10;
      }
      
      return {
        ...point,
        priorityScore: score,
        priorityLevel: score >= 80 ? 'Sangat Mendesak' : 
                      score >= 60 ? 'Mendesak' : 
                      score >= 40 ? 'Perlu Perhatian' : 'Monitor'
      };
    });

    const sorted = scored.sort((a, b) => b.priorityScore - a.priorityScore);
    setPriorityAreas(sorted.slice(0, 5));
    setSelectedAnalysis('priority');
  };

  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  const toggleLayer = (layer) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleBufferZonesToggle = () => {
    if (!analysisResults || selectedAnalysis !== 'buffer') {
      if (!drainageData || floodPoints.length === 0) {
        alert('Data drainase atau titik banjir belum tersedia');
        return;
      }

      performBufferAnalysis();
      setActiveLayers(prev => ({ ...prev, bufferZones: true }));
      return;
    }

    setActiveLayers(prev => ({ ...prev, bufferZones: !prev.bufferZones }));
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const filteredFloodPoints = floodPoints.filter(point => {
    const matchesSeverity = filterSeverity === 'all' || point.severity === filterSeverity;
    const matchesSearch = point.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (point.nama_kecamatan || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const drainageStyle = (feature) => {
    const type = feature.properties.waterway;
    return {
      color: type === 'drain' ? '#3b82f6' : '#10b981',
      weight: 3,
      opacity: 0.7
    };
  };

  const normalizeRiskClass = (value) => {
    if (!value) return 'unknown';
    const normalized = String(value).toLowerCase().trim();
    if (normalized.includes('tinggi')) return 'tinggi';
    if (normalized.includes('sedang')) return 'sedang';
    if (normalized.includes('rendah')) return 'rendah';
    return 'unknown';
  };

  const getRiskClass = (feature) => {
    const props = feature?.properties || {};
    return normalizeRiskClass(props.Kelas ?? props.kelas ?? props.CLASS ?? props.class);
  };

  const floodRiskStyle = (feature) => {
    const riskClass = getRiskClass(feature);
    const colors = {
      tinggi: '#0891b2',    // cyan-600
      sedang: '#06b6d4',    // cyan-500
      rendah: '#67e8f9',    // cyan-300
      unknown: '#cbd5e1'
    };

    return {
      color: colors[riskClass],
      fillColor: 'transparent',
      weight: 3,
      opacity: 0.9,
      fillOpacity: 0
    };
  };

  const flashFloodRiskStyle = (feature) => {
    const riskClass = getRiskClass(feature);
    const colors = {
      tinggi: '#0284c7',    // sky-600
      sedang: '#38bdf8',    // sky-400
      rendah: '#bae6fd',    // sky-200
      unknown: '#cbd5e1'
    };

    return {
      color: colors[riskClass],
      fillColor: 'transparent',
      weight: 3,
      opacity: 0.9,
      fillOpacity: 0
    };
  };

  const getProximityLineColor = (score) => {
    if (score === 'Baik') return '#10b981';
    if (score === 'Sedang') return '#f59e0b';
    return '#ef4444';
  };

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="#0c4a6e"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
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
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();
  const kecamatanData = getKecamatanData();
  const radarData = getRadarData();

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      
      {/* ========================================
          HEADER
          ======================================== */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-btn" onClick={onBack} title="Back to Home">
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            
            <div className="logo">
              <div className="logo-icon-wrapper">
                <img src={logoBDrain} alt="Geodashboard Bekasi" className="logo-image" style={{width: '55px', height: '55px', objectFit: 'contain'}} />
              </div>
              <div className="logo-text">
                <h1 style={{fontSize: '1rem', fontWeight: '700', color: '#0c4a6e', marginBottom: '0.15rem'}}>
                  Geodashboard Bekasi
                </h1>
                <p style={{fontSize: '0.75rem', color: '#64748b'}}>
                  Visualisasi & Analisis Spasial Titik Rawan Banjir dan Infrastruktur Drainase
                </p>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="search-box">
              <Search size={20} />
              <input 
                type="text" 
                placeholder="Cari kecamatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button className="icon-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button className="icon-btn" onClick={toggleFullscreen} title="Fullscreen">
              {fullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            
            <button className="icon-btn" title="Download Data">
              <Download size={20} />
            </button>
            
            <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={24} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">
        
        {/* ========================================
            SIDEBAR
            ======================================== */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          
          <div className="sidebar-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Activity size={18} />
              <span>Overview</span>
            </button>
            
            <button 
              className={`tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              <Layers size={18} />
              <span>Layers</span>
            </button>
            
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <TrendingUp size={18} />
              <span>Analytics</span>
            </button>

            <button 
              className={`tab-btn ${activeTab === 'spatial' ? 'active' : ''}`}
              onClick={() => setActiveTab('spatial')}
            >
              <MapIcon size={18} />
              <span>Spatial Analysis</span>
            </button>

            <button 
              className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              <Database size={18} />
              <span>Data</span>
            </button>
          </div>

          <div className="sidebar-content">
            
            {/* ======== OVERVIEW TAB ======== */}
            {activeTab === 'overview' && (
              <div className="overview-section">
                <div className="section-header">
                  <h3>Statistik Kota Bekasi</h3>
                  <span className="badge">{stats.yearRange}</span>
                </div>
                
                <div className="stat-cards">
                  <div className="stat-card gradient-red">
                    <div className="stat-icon">
                      <AlertTriangle size={28} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-value">{stats.total}</span>
                      <span className="stat-label">Total Titik Banjir</span>
                      <span className="stat-change">▲ {stats.highRisk} area high-risk</span>
                    </div>
                  </div>
                  
                  <div className="stat-card gradient-blue">
                    <div className="stat-icon">
                      <MapPin size={28} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-value">{stats.totalKecamatan}</span>
                      <span className="stat-label">Kecamatan Terdampak</span>
                      <span className="stat-change">{stats.totalRecords} kejadian tercatat</span>
                    </div>
                  </div>
                  
                  <div className="stat-card gradient-purple">
                    <div className="stat-icon">
                      <Droplets size={28} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-value">{drainageData ? drainageData.features.length : 0}</span>
                      <span className="stat-label">Saluran Drainase</span>
                      <span className="stat-change">Data dari OSM</span>
                    </div>
                  </div>

                  <div className="stat-card gradient-green">
                    <div className="stat-icon">
                      <BarChart3 size={28} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-value">{stats.avgPerKecamatan}</span>
                      <span className="stat-label">Rata-rata/Kecamatan</span>
                      <span className="stat-change">Titik banjir per area</span>
                    </div>
                  </div>
                </div>

                {/* Bar Chart - Top Kecamatan */}
                <div className="chart-section glass-effect">
                  <h4> Top Kecamatan Rawan Banjir (Hover untuk detail)</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart 
                      data={kecamatanData}
                      margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280"
                        tick={false}
                        axisLine={true}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        style={{ fontSize: '0.75rem' }}
                        label={{ value: 'Jumlah Titik', angle: -90, position: 'insideLeft', style: { fontSize: '0.75rem' } }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#1f2937' : '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          padding: '8px 12px'
                        }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#0c4a6e' }}
                        formatter={(value) => [`${value} titik banjir`, 'Jumlah']}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                        {kecamatanData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="chart-section glass-effect">
                  <h4>📊 Distribusi Titik Banjir</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={kecamatanData}
                        cx="50%"
                        cy="45%"
                        labelLine={false}
                        label={renderPieLabel}
                        innerRadius={35}
                        outerRadius={85}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {kecamatanData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#1f2937' : '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          padding: '8px 12px'
                        }}
                        formatter={(value, name, props) => [
                          `${value} titik (${((value / kecamatanData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                          props.payload.name
                        ]}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                        formatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ======== LAYERS TAB ======== */}
            {activeTab === 'layers' && (
              <div className="layers-section">
                <h3>Layer Management</h3>
                
                <div className="layer-controls">
                  <div className="layer-item glass-effect">
                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={activeLayers.floodPoints}
                        onChange={() => toggleLayer('floodPoints')}
                      />
                      <span className="toggle-slider"></span>
                      <div className="layer-info">
                        <MapPin size={18} className="layer-icon" />
                        <div className="layer-details">
                          <span className="layer-name">Titik Rawan Banjir</span>
                          <span className="layer-count">{filteredFloodPoints.length} lokasi</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="layer-item glass-effect">
                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={activeLayers.drainage}
                        onChange={() => toggleLayer('drainage')}
                      />
                      <span className="toggle-slider"></span>
                      <div className="layer-info">
                        <Droplets size={18} className="layer-icon" />
                        <div className="layer-details">
                          <span className="layer-name">Infrastruktur Drainase</span>
                          <span className="layer-count">{drainageData ? drainageData.features.length : 0} saluran</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="layer-item glass-effect">
                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={activeLayers.bufferZones}
                        onChange={handleBufferZonesToggle}
                      />
                      <span className="toggle-slider"></span>
                      <div className="layer-info">
                        <MapIcon size={18} className="layer-icon" />
                        <div className="layer-details">
                          <span className="layer-name">Buffer Zones</span>
                          <span className="layer-count">
                            {selectedAnalysis === 'buffer' ? `${bufferRadius}m radius` : 'Run analysis first'}
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="layer-item glass-effect">
                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={activeLayers.floodRisk}
                        onChange={() => toggleLayer('floodRisk')}
                      />
                      <span className="toggle-slider"></span>
                      <div className="layer-info">
                        <AlertTriangle size={18} className="layer-icon" />
                        <div className="layer-details">
                          <span className="layer-name">🚨 Delineasi Risiko Banjir Genangan</span>
                          <span className="layer-desc">Peta zona risiko banjir dengan tingkat risiko berbeda (biru tua hingga muda)</span>
                          <span className="layer-count">{floodRiskData?.features?.length || 0} area</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="layer-item glass-effect">
                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={activeLayers.flashFloodRisk}
                        onChange={() => toggleLayer('flashFloodRisk')}
                      />
                      <span className="toggle-slider"></span>
                      <div className="layer-info">
                        <AlertTriangle size={18} className="layer-icon" />
                        <div className="layer-details">
                          <span className="layer-name">⚡ Delineasi Risiko Banjir Bandang</span>
                          <span className="layer-desc">Area rentan banjir bandang dengan tingkat risiko berbeda (biru tua hingga muda)</span>
                          <span className="layer-count">{flashFloodRiskData?.features?.length || 0} area</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="filter-section">
                  <h4> Filter Tingkat Keparahan</h4>
                  <select 
                    value={filterSeverity} 
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="filter-select glass-effect"
                  >
                    <option value="all">Semua Tingkat</option>
                    <option value="high">🔴 Tinggi (≥20 titik)</option>
                    <option value="medium">🟡 Sedang (12-19 titik)</option>
                    <option value="low">🟢 Rendah (&lt;12 titik)</option>
                  </select>
                </div>

                <div className="legend-section glass-effect">
                  <h4> Legenda</h4>
                  <div className="legend-items">
                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#ef4444', minWidth: '20px', height: '20px'}}></span>
                      <div className="legend-text">
                        <strong>Tingkat Tinggi</strong>
                        <span>≥20 titik banjir</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#f59e0b', minWidth: '20px', height: '20px'}}></span>
                      <div className="legend-text">
                        <strong>Tingkat Sedang</strong>
                        <span>12-19 titik banjir</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#10b981', minWidth: '20px', height: '20px'}}></span>
                      <div className="legend-text">
                        <strong>Tingkat Rendah</strong>
                        <span>&lt;12 titik banjir</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-line" style={{backgroundColor: '#3b82f6', minWidth: '20px', height: '3px'}}></span>
                      <div className="legend-text">
                        <strong>Saluran Drainase</strong>
                        <span>Data OpenStreetMap</span>
                      </div>
                    </div>

                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#0891b2', minWidth: '20px', height: '20px', opacity: 0.7}}></span>
                      <div className="legend-text">
                        <strong>Risiko Banjir Genangan (Tinggi)</strong>
                        <span>Delineasi indeks risiko banjir</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#06b6d4', minWidth: '20px', height: '20px', opacity: 0.7}}></span>
                      <div className="legend-text">
                        <strong>Risiko Banjir Genangan (Sedang)</strong>
                        <span>Delineasi indeks risiko banjir</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#67e8f9', minWidth: '20px', height: '20px', opacity: 0.7}}></span>
                      <div className="legend-text">
                        <strong>Risiko Banjir Genangan (Rendah)</strong>
                        <span>Delineasi indeks risiko banjir</span>
                      </div>
                    </div>

                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#0284c7', minWidth: '20px', height: '20px', opacity: 0.7}}></span>
                      <div className="legend-text">
                        <strong>Risiko Banjir Bandang (Tinggi)</strong>
                        <span>Warna dibedakan dari banjir genangan</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#38bdf8', minWidth: '20px', height: '20px', opacity: 0.7}}></span>
                      <div className="legend-text">
                        <strong>Risiko Banjir Bandang (Sedang)</strong>
                        <span>Warna dibedakan dari banjir genangan</span>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color" style={{backgroundColor: '#bae6fd', minWidth: '20px', height: '20px', opacity: 0.7}}></span>
                      <div className="legend-text">
                        <strong>Risiko Banjir Bandang (Rendah)</strong>
                        <span>Warna dibedakan dari banjir genangan</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======== ANALYTICS TAB ======== */}
            {activeTab === 'analytics' && (
              <div className="analytics-section">
                <h3>Analisis Spasial</h3>
                
                <div className="analysis-card glass-effect">
                  <h4>📍 Proximity Analysis</h4>
                  <p>Analisis kedekatan titik banjir dengan drainase</p>
                  <div className="metric-large">~350m</div>
                  <p className="metric-note">Jarak rata-rata estimasi</p>
                </div>

                <div className="analysis-card glass-effect">
                  <h4>🏆 Ranking Kecamatan</h4>
                  <div className="top-locations">
                    {floodPoints
                      .sort((a, b) => b.jumlah_titik - a.jumlah_titik)
                      .slice(0, 5)
                      .map((point, index) => (
                        <div key={point.id} className="location-item">
                          <span className={`rank rank-${index + 1}`}>{index + 1}</span>
                          <div className="location-details">
                            <strong>{point.nama_kecamatan || point.kecamatan}</strong>
                            <span>{point.jumlah_titik} titik banjir</span>
                          </div>
                          <span className={`severity-badge-small ${point.severity}`}>
                            {point.severity === 'high' ? '🔴' : point.severity === 'medium' ? '🟡' : '🟢'}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="chart-section glass-effect">
                  <h4>📡 Radar Analysis</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        style={{ fontSize: '0.75rem' }}
                      />
                      <PolarRadiusAxis angle={90} domain={[0, Math.ceil(stats.maxFloodPoints * 1.1)]} />
                      <Radar 
                        name="Jumlah Titik" 
                        dataKey="A" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.6} 
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ======== SPATIAL ANALYSIS TAB ======== */}
            {activeTab === 'spatial' && (
              <div className="spatial-section">
                <h3>🗺️ Analisis Spasial</h3>
                <p className="section-description">
                  Tools analisis spasial untuk identifikasi korelasi antara titik rawan banjir 
                  dengan infrastruktur drainase
                </p>

                {/* Buffer Analysis Tool */}
                <div className="analysis-tool glass-effect">
                  <h4><MapIcon size={20} /> Buffer Analysis</h4>
                  <p className="tool-description">
                    Identifikasi saluran drainase dalam radius tertentu dari titik banjir
                  </p>
                  
                  <div className="tool-controls">
                    <div className="control-group">
                      <label>Buffer Radius (meter):</label>
                      <div className="slider-container">
                        <input 
                          type="range" 
                          min="100" 
                          max="2000" 
                          step="50"
                          value={bufferRadius}
                          onChange={(e) => setBufferRadius(parseInt(e.target.value))}
                          className="slider"
                        />
                        <span className="slider-value">{bufferRadius}m</span>
                      </div>
                    </div>
                    
                    <button 
                      className="btn-analyze"
                      onClick={performBufferAnalysis}
                    >
                      <Activity size={18} />
                      Run Buffer Analysis
                    </button>
                  </div>
                </div>

                {/* Proximity Analysis Tool */}
                <div className="analysis-tool glass-effect">
                  <h4><MapPin size={20} /> Proximity Analysis</h4>
                  <p className="tool-description">
                    Analisis kedekatan setiap titik banjir ke saluran drainase terdekat
                  </p>
                  
                  <button 
                    className="btn-analyze"
                    onClick={performProximityAnalysis}
                  >
                    <TrendingUp size={18} />
                    Run Proximity Analysis
                  </button>
                </div>

                {/* Priority Areas Identification */}
                <div className="analysis-tool glass-effect">
                  <h4><AlertTriangle size={20} /> Identifikasi Area Prioritas</h4>
                  <p className="tool-description">
                    Identifikasi area yang memerlukan perbaikan infrastruktur mendesak
                  </p>
                  
                  <button 
                    className="btn-analyze"
                    onClick={identifyPriorityAreas}
                  >
                    <AlertTriangle size={18} />
                    Identify Priority Areas
                  </button>
                </div>

                {/* Analysis Results */}
                {selectedAnalysis && analysisResults && selectedAnalysis !== 'priority' && (
                  <div className="analysis-results glass-effect">
                    <h4>📊 Hasil Analisis: {
                      selectedAnalysis === 'buffer' ? 'Buffer Analysis' :
                      'Proximity Analysis'
                    }</h4>
                    
                    {selectedAnalysis === 'buffer' && (
                      <div className="results-content">
                        <div className="result-summary">
                          <div className="summary-card">
                            <span className="summary-label">Area Terlayani</span>
                            <span className="summary-value">
                              {analysisResults.filter(r => r.coverage === 'Terlayani').length}
                            </span>
                          </div>
                          <div className="summary-card">
                            <span className="summary-label">Tidak Terlayani</span>
                            <span className="summary-value alert">
                              {analysisResults.filter(r => r.coverage === 'Tidak Terlayani').length}
                            </span>
                          </div>
                        </div>

                        <div className="results-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Kecamatan</th>
                                <th>Drainase</th>
                                <th>Status</th>
                                <th>Jarak Terdekat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisResults.map(result => (
                                <tr key={result.id}>
                                  <td>{result.nama_kecamatan || result.kecamatan}</td>
                                  <td><strong>{result.drainageInBuffer}</strong></td>
                                  <td>
                                    <span className={`coverage-badge ${result.coverage === 'Terlayani' ? 'good' : 'poor'}`}>
                                      {result.coverage}
                                    </span>
                                  </td>
                                  <td>
                                    {result.nearestDrainage ? 
                                      `${result.nearestDrainage.distance}m` : 
                                      'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {selectedAnalysis === 'proximity' && (
                      <div className="results-content">
                        <div className="results-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Kecamatan</th>
                                <th>Jarak Terdekat</th>
                                <th>Aksesibilitas</th>
                                <th>Skor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisResults.map(result => (
                                <tr key={result.id}>
                                  <td>{result.nama_kecamatan || result.kecamatan}</td>
                                  <td>
                                    {result.nearestDrainage ? 
                                      `${result.nearestDrainage.distance}m` : 
                                      'N/A'}
                                  </td>
                                  <td>
                                    {result.nearestDrainage?.accessibility || 'N/A'}
                                  </td>
                                  <td>
                                    <span className={`score-badge ${
                                      result.proximityScore === 'Baik' ? 'good' :
                                      result.proximityScore === 'Sedang' ? 'medium' : 'poor'
                                    }`}>
                                      {result.proximityScore}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Priority Areas Results */}
                {selectedAnalysis === 'priority' && priorityAreas.length > 0 && (
                  <div className="priority-results glass-effect">
                    <h4>🎯 Top 5 Area Prioritas Perbaikan</h4>
                    <div className="priority-list">
                      {priorityAreas.map((area, index) => (
                        <div key={area.id} className={`priority-item priority-${index + 1}`}>
                          <div className="priority-rank">#{index + 1}</div>
                          <div className="priority-info">
                            <h5>{area.nama_kecamatan || area.kecamatan}</h5>
                            <div className="priority-details">
                              <span>📍 {area.jumlah_titik} titik banjir</span>
                            </div>
                          </div>
                          <div className="priority-score">
                            <div className="score-text">
                              Skor <strong>{area.priorityScore}/100</strong>
                            </div>
                            <span className={`priority-level ${
                              area.priorityLevel === 'Sangat Mendesak' ? 'urgent' :
                              area.priorityLevel === 'Mendesak' ? 'high' : 'medium'
                            }`}>
                              {area.priorityLevel}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="recommendation-box">
                      <h5>💡 Rekomendasi</h5>
                      <p>
                        Area prioritas di atas memerlukan perhatian khusus dalam perencanaan 
                        perbaikan infrastruktur drainase. Pertimbangkan:
                      </p>
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

            {/* ======== DATA TAB ======== */}
            {activeTab === 'data' && (
              <div className="data-section">
                <h3>Data Tabel</h3>
                
                <div className="data-table-wrapper glass-effect">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kecamatan</th>
                        <th>Titik</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFloodPoints.map(point => (
                        <tr key={point.id}>
                          <td>{point.nama_kecamatan || point.kecamatan}</td>
                          <td><strong>{point.jumlah_titik}</strong></td>
                          <td>
                            <span className={`status-badge ${point.severity}`}>
                              {point.severity === 'high' ? 'Tinggi' : 
                               point.severity === 'medium' ? 'Sedang' : 'Rendah'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        </aside>

        {/* ========================================
            MAP SECTION
            ======================================== */}
        <main className="map-section">
          <MapContainer 
            center={mapCenter} 
            zoom={12} 
            style={{ height: '100%', width: '100%' }}
            className="leaflet-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={darkMode 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />
            
            {/* Geoman Controls for Drawing & Measuring */}
            <GeomanControls />
            
            {/* Drainage Layer */}
            {activeLayers.drainage && drainageData && (
              <GeoJSON 
                data={drainageData} 
                style={drainageStyle}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties;
                  layer.bindPopup(`
                    <div class="custom-popup">
                      <h4>🌊 Saluran Drainase</h4>
                      <p><strong>Type:</strong> ${props.waterway || 'drain'}</p>
                      <p><strong>ID:</strong> ${props['@id'] || 'N/A'}</p>
                    </div>
                  `);
                }}
              />
            )}

            {/* Delineasi Risiko Banjir */}
            {activeLayers.floodRisk && floodRiskData && (
              <GeoJSON
                data={floodRiskData}
                style={floodRiskStyle}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties || {};
                  const riskClass = getRiskClass(feature);
                  const riskDesc = {
                    'tinggi': 'Risiko Tinggi - Prioritas evakuasi dan mitigasi utama',
                    'sedang': 'Risiko Sedang - Perlu monitoring dan persiapan respons',
                    'rendah': 'Risiko Rendah - Area relatif aman dari banjir genangan'
                  };
                  layer.bindPopup(`
                    <div class="custom-popup">
                      <h4>🌊 Banjir Genangan</h4>
                      <div style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px;">
                        <strong style="color: #1e293b;">Risiko: ${riskClass.toUpperCase()}</strong><br>
                        <small>${riskDesc[riskClass] || 'Data risiko banjir'}</small>
                      </div>
                      <p style="margin: 4px 0; font-size: 0.85em;"><strong>Sumber:</strong> ${props.Catatan || 'BPBD Jabar'}</p>
                    </div>
                  `);
                  
                  // Add hover effect
                  layer.on('mouseover', function() {
                    this.setStyle({fillOpacity: 0.8, weight: 2.5});
                  });
                  layer.on('mouseout', function() {
                    this.setStyle({fillOpacity: 0.5, weight: 1.5});
                  });
                }}
              />
            )}

            {/* Delineasi Risiko Banjir Bandang */}
            {activeLayers.flashFloodRisk && flashFloodRiskData && (
              <GeoJSON
                data={flashFloodRiskData}
                style={flashFloodRiskStyle}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties || {};
                  const riskClass = getRiskClass(feature);
                  const riskDesc = {
                    'tinggi': 'Risiko Tinggi - Banjir bandang dapat terjadi dengan cepat dan berdampak besar',
                    'sedang': 'Risiko Sedang - Kemungkinan banjir bandang sedang, perlu kewaspadaan',
                    'rendah': 'Risiko Rendah - Potensi banjir bandang minimal di area ini'
                  };
                  layer.bindPopup(`
                    <div class="custom-popup">
                      <h4>⚡ Banjir Bandang</h4>
                      <div style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px;">
                        <strong style="color: #1e293b;">Risiko: ${riskClass.toUpperCase()}</strong><br>
                        <small>${riskDesc[riskClass] || 'Data risiko banjir bandang'}</small>
                      </div>
                      <p style="margin: 4px 0; font-size: 0.85em;"><strong>Sumber:</strong> ${props.Catatan || 'BPBD Jabar'}</p>
                    </div>
                  `);
                  
                  // Add hover effect
                  layer.on('mouseover', function() {
                    this.setStyle({fillOpacity: 0.8, weight: 2.5});
                  });
                  layer.on('mouseout', function() {
                    this.setStyle({fillOpacity: 0.5, weight: 1.5});
                  });
                }}
              />
            )}
            
            {/* Flood Points Layer */}
            {activeLayers.floodPoints && filteredFloodPoints.map(point => (
              <Marker 
                key={point.id}
                position={[point.lat, point.lng]}
                icon={createMarkerIcon(point.severity, point.jumlah_titik)}
                eventHandlers={{
                  click: () => setSelectedPoint(point)
                }}
              >
                <Popup className="custom-popup">
                  <div className="popup-content">
                    <h4>📍 {point.nama_kecamatan || point.kecamatan}</h4>
                    <div className="popup-stats">
                      <div className="popup-stat">
                        <span className="popup-label">Titik Banjir:</span>
                        <span className="popup-value">{point.jumlah_titik}</span>
                      </div>
                      <div className="popup-stat">
                        <span className="popup-label">Tingkat:</span>
                        <span className={`severity-badge ${point.severity}`}>
                          {point.severity === 'high' ? 'Tinggi' : 
                           point.severity === 'medium' ? 'Sedang' : 'Rendah'}
                        </span>
                      </div>
                      <div className="popup-stat">
                        <span className="popup-label">Masa Tanggap:</span>
                        <span className="popup-value">{point.masa_tanggap} hari</span>
                      </div>
                      <div className="popup-stat">
                        <span className="popup-label">Tahun:</span>
                        <span className="popup-value">{point.tahun}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Buffer Zones Layer */}
            {activeLayers.bufferZones && selectedAnalysis === 'buffer' && analysisResults && 
              analysisResults.map(point => (
                <Circle
                  key={`buffer-${point.id}`}
                  center={[point.lat, point.lng]}
                  radius={bufferRadius}
                  pathOptions={{
                    color: point.coverage === 'Terlayani' ? '#10b981' : '#ef4444',
                    fillColor: point.coverage === 'Terlayani' ? '#10b981' : '#ef4444',
                    fillOpacity: 0.1,
                    weight: 2,
                    opacity: 0.5
                  }}
                >
                  <Popup>
                    <div className="popup-content">
                      <h4>Buffer Zone Analysis</h4>
                      <p><strong>Area:</strong> {point.nama_kecamatan || point.kecamatan}</p>
                      <p><strong>Radius:</strong> {bufferRadius}m</p>
                      <p><strong>Drainase dalam buffer:</strong> {point.drainageInBuffer}</p>
                      <p><strong>Status:</strong> {point.coverage}</p>
                    </div>
                  </Popup>
                </Circle>
              ))
            }

            {/* Proximity Lines Layer */}
            {selectedAnalysis === 'proximity' && analysisResults && 
              analysisResults
                .filter(point => point.nearestDrainage?.coords)
                .map(point => (
                  <Polyline
                    key={`proximity-${point.id}`}
                    positions={[
                      [point.lat, point.lng],
                      [point.nearestDrainage.coords.lat, point.nearestDrainage.coords.lng]
                    ]}
                    pathOptions={{
                      color: getProximityLineColor(point.proximityScore),
                      weight: 2,
                      opacity: 0.7,
                      dashArray: point.proximityScore === 'Baik' ? '0' : '4,6'
                    }}
                  >
                    <Popup>
                      <div className="popup-content">
                        <h4>Proximity Analysis</h4>
                        <p><strong>Area:</strong> {point.nama_kecamatan || point.kecamatan}</p>
                        <p><strong>Jarak:</strong> {point.nearestDrainage.distance}m</p>
                        <p><strong>Akses:</strong> {point.nearestDrainage.accessibility}</p>
                        <p><strong>Skor:</strong> {point.proximityScore}</p>
                      </div>
                    </Popup>
                  </Polyline>
                ))
            }

            {/* Priority Areas Layer */}
            {selectedAnalysis === 'priority' && priorityAreas.length > 0 &&
              priorityAreas.map(area => (
                <CircleMarker
                  key={`priority-${area.id}`}
                  center={[area.lat, area.lng]}
                  radius={area.priorityLevel === 'Sangat Mendesak' ? 12 : area.priorityLevel === 'Mendesak' ? 10 : 8}
                  pathOptions={{
                    color: area.priorityLevel === 'Sangat Mendesak' ? '#ef4444' :
                          area.priorityLevel === 'Mendesak' ? '#f59e0b' : '#10b981',
                    fillColor: area.priorityLevel === 'Sangat Mendesak' ? '#ef4444' :
                              area.priorityLevel === 'Mendesak' ? '#f59e0b' : '#10b981',
                    fillOpacity: 0.7,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div className="popup-content">
                      <h4>Area Prioritas</h4>
                      <p><strong>Area:</strong> {area.nama_kecamatan || area.kecamatan}</p>
                      <p><strong>Titik banjir:</strong> {area.jumlah_titik}</p>
                      <p><strong>Skor:</strong> {area.priorityScore}/100</p>
                      <p><strong>Level:</strong> {area.priorityLevel}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))
            }
          </MapContainer>

          {/* Map Overlay Info */}
          <div className="map-overlay">
            <div className="info-box glass-effect">
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                <img src={mapIcon} alt="Map" style={{width: '24px', height: '24px', objectFit: 'contain'}} />
                <h4 style={{margin: 0}}> Kota Bekasi</h4>
              </div>
              <p> Total: {stats.total} titik banjir</p>
              <p> Area: {stats.totalKecamatan} kecamatan</p>
              <p> Data: {stats.yearRange}</p>
            </div>

            {/* Delineation Legend Overlay */}
            {(activeLayers.floodRisk || activeLayers.flashFloodRisk) && (
              <div className="legend-overlay glass-effect" style={{position: 'fixed', bottom: '20px', right: '20px', maxWidth: '280px', zIndex: 400}}>
                <h4 style={{marginBottom: '0.8rem', color: '#0c4a6e', borderBottom: '1px solid rgba(14,165,233,0.2)', paddingBottom: '0.5rem'}}>
                  📊 Peta Risiko Banjir
                </h4>
                
                {activeLayers.floodRisk && (
                  <div style={{marginBottom: '1rem'}}>
                    <div style={{fontSize: '0.85rem', fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem'}}>🚨 Banjir Genangan</div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{width: '16px', height: '16px', backgroundColor: '#0891b2', borderRadius: '3px', opacity: 0.8}}></span>
                        <span><strong>Tinggi</strong> - Risiko banjir tinggi</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{width: '16px', height: '16px', backgroundColor: '#06b6d4', borderRadius: '3px', opacity: 0.8}}></span>
                        <span><strong>Sedang</strong> - Risiko banjir sedang</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{width: '16px', height: '16px', backgroundColor: '#67e8f9', borderRadius: '3px', opacity: 0.8}}></span>
                        <span><strong>Rendah</strong> - Risiko banjir rendah</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeLayers.flashFloodRisk && (
                  <div>
                    <div style={{fontSize: '0.85rem', fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem'}}>⚡ Banjir Bandang</div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{width: '16px', height: '16px', backgroundColor: '#0284c7', borderRadius: '3px', opacity: 0.8}}></span>
                        <span><strong>Tinggi</strong> - Risiko bandang tinggi</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{width: '16px', height: '16px', backgroundColor: '#38bdf8', borderRadius: '3px', opacity: 0.8}}></span>
                        <span><strong>Sedang</strong> - Risiko bandang sedang</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{width: '16px', height: '16px', backgroundColor: '#bae6fd', borderRadius: '3px', opacity: 0.8}}></span>
                        <span><strong>Rendah</strong> - Risiko bandang rendah</span>
                      </div>
                    </div>
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