// ========================================
// B-DRAIN - ENHANCED VERSION
// dengan Data Real & UI Modern
// ========================================

import React, { useState, useEffect } from 'react';
import { 
  MapContainer, TileLayer, GeoJSON, Marker, Popup, 
  Circle, CircleMarker, Polyline, useMap, LayersControl, useMapEvents
} from 'react-leaflet';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Droplets, AlertTriangle, Layers, Search, Filter, Download, 
  Info, MapPin, TrendingUp, Activity, Menu, X, Sun, Moon,
  Maximize2, Minimize2, RefreshCw, Database, BarChart3, Map as MapIcon, ArrowLeft,
  Brain, Zap, CheckCircle, XCircle, AlertCircle,
  Navigation2, Clock, Shield, Home
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
// TOPO LAYERS CONFIG (geojson_kota_bekasi/)
// ========================================
const TOPO_LAYERS = [
  // ── Topografi
  { key: 'KONTUR_LN_25K',              label: 'Garis Kontur',         group: 'Topografi',     type: 'LN', color: '#b45309', weight: 1, dashArray: '4 2' },
  { key: 'SPOTHEIGHT_PT_25K',           label: 'Titik Ketinggian',     group: 'Topografi',     type: 'PT', color: '#92400e' },
  // ── Perairan
  { key: 'SUNGAI_LN_25K',              label: 'Sungai (Garis)',       group: 'Perairan',      type: 'LN', color: '#0ea5e9', weight: 1.5 },
  { key: 'SUNGAI_AR_25K',              label: 'Sungai (Area)',        group: 'Perairan',      type: 'AR', color: '#0284c7', fill: '#bae6fd', fillOpacity: 0.5 },
  { key: 'DANAU_AR_25K',               label: 'Danau',                group: 'Perairan',      type: 'AR', color: '#0369a1', fill: '#7dd3fc', fillOpacity: 0.5 },
  { key: 'TAMBANGAN_LN_25K',           label: 'Tambangan',            group: 'Perairan',      type: 'LN', color: '#0369a1', weight: 1 },
  // ── Pertanian
  { key: 'AGRISAWAH_AR_25K',           label: 'Sawah',                group: 'Pertanian',     type: 'AR', color: '#16a34a', fill: '#bbf7d0', fillOpacity: 0.45 },
  { key: 'AGRILADANG_AR_25K',          label: 'Ladang',               group: 'Pertanian',     type: 'AR', color: '#15803d', fill: '#dcfce7', fillOpacity: 0.45 },
  { key: 'AGRIKEBUN_AR_25K',           label: 'Kebun',                group: 'Pertanian',     type: 'AR', color: '#166534', fill: '#a7f3d0', fillOpacity: 0.45 },
  { key: 'AGRITANAMCAMPUR_AR_25K',     label: 'Tanaman Campuran',     group: 'Pertanian',     type: 'AR', color: '#065f46', fill: '#d1fae5', fillOpacity: 0.40 },
  // ── Vegetasi
  { key: 'NONAGRIALANG_AR_25K',        label: 'Alang-alang',          group: 'Vegetasi',      type: 'AR', color: '#a16207', fill: '#fef9c3', fillOpacity: 0.40 },
  { key: 'NONAGRISEMAKBELUKAR_AR_25K', label: 'Semak Belukar',        group: 'Vegetasi',      type: 'AR', color: '#78350f', fill: '#fef3c7', fillOpacity: 0.40 },
  // ── Permukiman
  { key: 'PEMUKIMAN_AR_25K',           label: 'Permukiman',           group: 'Permukiman',    type: 'AR', color: '#be123c', fill: '#fecdd3', fillOpacity: 0.40 },
  { key: 'BANGUNAN_AR_25K',            label: 'Bangunan (Area)',      group: 'Permukiman',    type: 'AR', color: '#9f1239', fill: '#fda4af', fillOpacity: 0.40 },
  { key: 'BANGUNAN_PT_25K',            label: 'Bangunan (Titik)',     group: 'Permukiman',    type: 'PT', color: '#881337' },
  // ── Transportasi
  { key: 'JALAN_LN_25K',              label: 'Jalan',                group: 'Transportasi',  type: 'LN', color: '#d97706', weight: 1.5 },
  { key: 'RELKA_LN_25K',              label: 'Rel Kereta Api',       group: 'Transportasi',  type: 'LN', color: '#1f2937', weight: 2, dashArray: '8 4' },
  { key: 'JEMBATAN_LN_25K',           label: 'Jembatan (Garis)',     group: 'Transportasi',  type: 'LN', color: '#92400e', weight: 2 },
  { key: 'JEMBATAN_PT_25K',           label: 'Jembatan (Titik)',     group: 'Transportasi',  type: 'PT', color: '#78350f' },
  { key: 'STASIUNKA_PT_25K',          label: 'Stasiun Kereta',       group: 'Transportasi',  type: 'PT', color: '#1f2937' },
  // ── Administrasi
  { key: 'ADMINISTRASI_LN_25K',       label: 'Batas Administrasi',   group: 'Administrasi',  type: 'LN', color: '#7c3aed', weight: 1.5, dashArray: '4 3' },
  { key: 'ADMINISTRASIDESA_AR_25K',   label: 'Batas Desa/Kelurahan', group: 'Administrasi',  type: 'AR', color: '#6d28d9', fill: 'transparent', fillOpacity: 0 },
  { key: 'TOPONIMI_PT_25K',           label: 'Toponimi',             group: 'Administrasi',  type: 'PT', color: '#4c1d95' },
  { key: 'TONGGAKKM_PT_25K',          label: 'Tonggak KM',           group: 'Administrasi',  type: 'PT', color: '#5b21b6' },
  // ── Fasilitas Umum
  { key: 'KESEHATAN_PT_25K',          label: 'Fasilitas Kesehatan',  group: 'Fasilitas',     type: 'PT', color: '#059669' },
  { key: 'PENDIDIKAN_PT_25K',         label: 'Fasilitas Pendidikan', group: 'Fasilitas',     type: 'PT', color: '#0891b2' },
  { key: 'PEMERINTAHAN_PT_25K',       label: 'Kantor Pemerintahan',  group: 'Fasilitas',     type: 'PT', color: '#1d4ed8' },
  { key: 'SARANAIBADAH_PT_25K',       label: 'Sarana Ibadah',        group: 'Fasilitas',     type: 'PT', color: '#6d28d9' },
  { key: 'KANTORPOS_PT_25K',          label: 'Kantor Pos',           group: 'Fasilitas',     type: 'PT', color: '#dc2626' },
  { key: 'NIAGA_PT_25K',              label: 'Niaga / Komersial',    group: 'Fasilitas',     type: 'PT', color: '#d97706' },
  { key: 'CAGARBUDAYA_PT_25K',        label: 'Cagar Budaya',         group: 'Fasilitas',     type: 'PT', color: '#7c2d12' },
  // ── Utilitas
  { key: 'KABELLISTRIK_LN_25K',       label: 'Kabel Listrik',        group: 'Utilitas',      type: 'LN', color: '#ca8a04', weight: 1, dashArray: '6 3' },
  { key: 'GENLISTRIK_PT_25K',         label: 'Generator Listrik',    group: 'Utilitas',      type: 'PT', color: '#ca8a04' },
  { key: 'DEPOMINYAK_PT_25K',         label: 'Depo Minyak',          group: 'Utilitas',      type: 'PT', color: '#9a3412' },
];

const TOPO_GROUPS = [...new Set(TOPO_LAYERS.map(l => l.group))];

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
// MAP CLICK HANDLER (for AI location picker)
// ========================================
const MapClickHandler = ({ active, onPick }) => {
  useMapEvents({
    click: (e) => {
      if (active) onPick(e.latlng);
    },
  });
  return null;
};

// ========================================
// ML HELPER FUNCTIONS (pure, no state)
// ========================================
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getNearestHospital = (lat, lon, hospitalGeoJson) => {
  if (!hospitalGeoJson?.features?.length) return null;
  let best = null, bestDist = Infinity;
  for (const f of hospitalGeoJson.features) {
    const [hLon, hLat] = f.geometry.coordinates;
    const d = haversine(lat, lon, hLat, hLon);
    if (d < bestDist) {
      bestDist = d;
      const p = f.properties;
      best = {
        name: p.nama || p.NAMA || p.name || 'Rumah Sakit',
        address: p.alamat || p.ALAMAT || p.address || '',
        dist: bestDist,
      };
    }
  }
  return best;
};

const getFloodDuration = (riskClass, elev) => {
  if (riskClass === 'tinggi') {
    if (elev <= 5)  return '3–7 hari (sangat lambat surut)';
    if (elev <= 12) return '2–5 hari';
    return '1–3 hari';
  }
  if (riskClass === 'sedang') {
    if (elev <= 5)  return '12–36 jam';
    return '6–24 jam';
  }
  return 'Biasanya < 6 jam, surut cepat';
};

const getEvacuationAdvice = (riskClass) => {
  if (riskClass === 'tinggi') return {
    urgency: '⚠️ SEGERA EVAKUASI',
    text: 'Tinggalkan area sebelum banjir tiba. Bawa dokumen penting, obat-obatan, dan kebutuhan darurat. Menuju ke shelter atau lantai atas gedung terdekat.',
    color: '#ef4444',
    bg: '#fee2e2',
  };
  if (riskClass === 'sedang') return {
    urgency: '⚡ WASPADA TINGGI',
    text: 'Pantau informasi BPBD setempat. Siapkan tas darurat dan pastikan jalur evakuasi bersih. Pindahkan barang berharga ke tempat lebih tinggi.',
    color: '#f59e0b',
    bg: '#fef3c7',
  };
  return {
    urgency: '✅ SIAGA NORMAL',
    text: 'Risiko rendah, namun tetap waspada saat hujan deras. Pastikan saluran drainase di sekitar rumah tidak tersumbat.',
    color: '#22c55e',
    bg: '#f0fdf4',
  };
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
  const [topoLayerData, setTopoLayerData] = useState({});
  const [activeTopoLayers, setActiveTopoLayers] = useState({});
  const [topoGroupOpen, setTopoGroupOpen] = useState({});

  // ML / AI Integration state
  const [mlForm, setMlForm] = useState({
    is_bandang: 0,       // 0=genangan, 1=bandang
    elev_mean: 12,       // elevasi rata-rata (m)
    severity_score: 2,   // 1=rendah, 2=sedang, 3=tinggi
  });
  const [mlPickMode, setMlPickMode] = useState(false);    // true = user sedang klik titik di peta
  const [mlPickedPoint, setMlPickedPoint] = useState(null); // {lat, lng}
  const [mlResult, setMlResult] = useState(null);          // prediction result
  const [mlStatus, setMlStatus] = useState('idle');        // 'idle'|'loading'|'done'|'error'|'no-api'
  const [showMlLayer, setShowMlLayer] = useState(true);
  const [mlModelInfo, setMlModelInfo] = useState(null);
  const [mlDerived, setMlDerived] = useState(null);  // {hospital, duration, advice}

  // ========================================
  // DATA LOADING
  // ========================================
  // Fetch ML model info on load (non-blocking)
  useEffect(() => { fetchMlModelInfo(); }, []);

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

  const toggleTopoLayer = (key) => {
    setActiveTopoLayers(prev => {
      const newActive = !prev[key];
      if (newActive && !topoLayerData[key]) {
        fetch(`/data/geojson_kota_bekasi/${key}.geojson`)
          .then(r => r.json())
          .then(data => setTopoLayerData(d => ({ ...d, [key]: data })))
          .catch(() => {});
      }
      return { ...prev, [key]: newActive };
    });
  };

  const toggleTopoGroup = (group) => {
    const groupKeys = TOPO_LAYERS.filter(l => l.group === group).map(l => l.key);
    const anyActive = groupKeys.some(k => activeTopoLayers[k]);
    setActiveTopoLayers(prev => {
      const updated = { ...prev };
      groupKeys.forEach(k => { updated[k] = !anyActive; });
      return updated;
    });
    if (!anyActive) {
      groupKeys.forEach(k => {
        if (!topoLayerData[k]) {
          fetch(`/data/geojson_kota_bekasi/${k}.geojson`)
            .then(r => r.json())
            .then(data => setTopoLayerData(d => ({ ...d, [k]: data })))
            .catch(() => {});
        }
      });
    }
  };

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

  const downloadGeoJson = (data, filename) => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTopoLayer = async (key) => {
    if (topoLayerData[key]) {
      downloadGeoJson(topoLayerData[key], `${key}.geojson`);
    } else {
      try {
        const r = await fetch(`/data/geojson_kota_bekasi/${key}.geojson`);
        const data = await r.json();
        setTopoLayerData(d => ({ ...d, [key]: data }));
        downloadGeoJson(data, `${key}.geojson`);
      } catch {}
    }
  };

  // ========================================
  // ML PREDICTION
  // ========================================
  const ML_API = 'http://localhost:5000';

  const fetchMlModelInfo = async () => {
    try {
      const res = await fetch(`${ML_API}/api/health`);
      if (res.ok) setMlModelInfo(await res.json());
    } catch { /* API not running */ }
  };

  const handleKelurahanSelect = (val) => {
    // REMOVED — replaced by map click interaction
  };

  const predictSingleArea = async () => {
    if (!mlPickedPoint) return;
    setMlStatus('loading');
    setMlResult(null);
    setMlDerived(null);
    try {
      const lat = mlPickedPoint.lat;
      const lon = mlPickedPoint.lng;
      // Build full feature vector — user fills is_bandang, elev_mean, severity_score;
      // everything else uses sensible Bekasi defaults
      const payload = {
        is_bandang: mlForm.is_bandang,
        elev_mean: mlForm.elev_mean,
        elev_min: Math.max(0, mlForm.elev_mean - 3),
        sungai_density: 0.08,
        dist_to_river: 0.005,
        pct_pemukiman: 0.65,
        pct_sawah: 0.05,
        jumlah_titik_banjir: 10,
        masa_tanggap_darurat_hari: 14,
        severity_score: mlForm.severity_score,
        shape_area: 0.0005,
        shape_leng: 0.15,
        compactness: 0.28,
        centroid_lat: parseFloat(lat.toFixed(6)),
        centroid_lon: parseFloat(lon.toFixed(6)),
      };
      const res = await fetch(`${ML_API}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resultData = await res.json();
      setMlResult(resultData);
      // Compute derived outputs
      const hospital = getNearestHospital(lat, lon, hospitalData);
      const duration = getFloodDuration(resultData.predicted_class, mlForm.elev_mean);
      const advice   = getEvacuationAdvice(resultData.predicted_class);
      setMlDerived({ hospital, duration, advice });
      setMlStatus('done');
      setShowMlLayer(true);
    } catch (e) {
      setMlStatus(e.message.includes('Failed to fetch') ? 'no-api' : 'error');
    }
  };

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

  // ── Topo layer styles (used in map render)
  const getTopoStyle = (cfg) => {
    if (cfg.type === 'AR') return {
      fillColor: cfg.fill || cfg.color,
      fillOpacity: cfg.fillOpacity !== undefined ? cfg.fillOpacity : 0.4,
      color: cfg.color,
      weight: cfg.weight || 1,
      opacity: 0.85,
      dashArray: cfg.dashArray,
    };
    if (cfg.type === 'LN') return {
      color: cfg.color,
      weight: cfg.weight || 1.5,
      opacity: 0.85,
      dashArray: cfg.dashArray,
    };
    return {};
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
            <button className="menu-btn" onClick={() => setSidebarOpen(s => !s)}>{sidebarOpen ? <X size={24}/> : <Menu size={23}/>}</button>
          </div>
        </div>
      </header>

      <div className="main-content">

        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-tabs">
            {[['overview','Overview',<Activity size={18}/>],['layers','Layers',<Layers size={18}/>],['analytics','Analytics',<TrendingUp size={18}/>],['spatial','Spatial',<MapIcon size={18}/>],['ai','Risiko',<Brain size={18}/>]].map(([tab,label,icon]) => (
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
                  <div className="stat-card gradient-blue">
                    <div className="stat-icon"><Layers size={28}/></div>
                    <div className="stat-content">
                      <span className="stat-value">{(floodRiskData?.features?.length||0)+(flashFloodRiskData?.features?.length||0)}</span>
                      <span className="stat-label">Area Delineasi Risiko</span>
                      <span className="stat-change">{floodRiskData?.features?.length||0} genangan · {flashFloodRiskData?.features?.length||0} bandang</span>
                    </div>
                  </div>
                  <div className="stat-card gradient-purple">
                    <div className="stat-icon"><Database size={28}/></div>
                    <div className="stat-content">
                      <span className="stat-value">{TOPO_LAYERS.length}</span>
                      <span className="stat-label">Layer Topografi BIG</span>
                      <span className="stat-change">Peta 1:25.000 · {TOPO_GROUPS.length} kategori</span>
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

                {/* ── Topografi BIG 1:25.000 */}
                <div style={{marginTop:'1.2rem'}}>
                  <div style={{fontWeight:'700',color:'#0c4a6e',fontSize:'.85rem',marginBottom:'.6rem',display:'flex',alignItems:'center',gap:'.4rem'}}>
                    <Database size={15}/> Data Topografi BIG 1:25.000
                    <span style={{fontSize:'.75rem',color:'#64748b',fontWeight:'400'}}>({TOPO_LAYERS.length} layer)</span>
                  </div>
                  {TOPO_GROUPS.map(group => {
                    const groupLayers = TOPO_LAYERS.filter(l => l.group === group);
                    const anyActive = groupLayers.some(l => activeTopoLayers[l.key]);
                    const isOpen = topoGroupOpen[group];
                    return (
                      <div key={group} style={{marginBottom:'.5rem',border:'1px solid rgba(14,165,233,0.15)',borderRadius:'10px',overflow:'hidden'}}>
                        <div
                          onClick={() => setTopoGroupOpen(p => ({...p, [group]: !p[group]}))}
                          style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.5rem .75rem',background: anyActive ? 'rgba(14,165,233,0.08)' : 'rgba(248,250,252,0.7)',cursor:'pointer',gap:'.5rem'}}
                        >
                          <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                            <input
                              type="checkbox"
                              checked={anyActive}
                              onChange={() => toggleTopoGroup(group)}
                              onClick={e => e.stopPropagation()}
                              style={{width:'14px',height:'14px',cursor:'pointer'}}
                            />
                            <span style={{fontWeight:'600',fontSize:'.8rem',color:'#1e3a5f'}}>{group}</span>
                            <span style={{fontSize:'.72rem',color:'#94a3b8'}}>({groupLayers.length})</span>
                          </div>
                          <span style={{fontSize:'.75rem',color:'#94a3b8'}}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                        {isOpen && (
                          <div style={{padding:'.35rem .6rem .4rem',background:'rgba(255,255,255,0.6)'}}>
                            {groupLayers.map(cfg => (
                              <div key={cfg.key} style={{display:'flex',alignItems:'center',gap:'.45rem',padding:'.25rem .4rem',borderRadius:'6px',marginBottom:'.15rem'}}>
                                <input
                                  type="checkbox"
                                  checked={!!activeTopoLayers[cfg.key]}
                                  onChange={() => toggleTopoLayer(cfg.key)}
                                  style={{width:'13px',height:'13px',cursor:'pointer'}}
                                />
                                <span style={{width:'10px',height:'10px',borderRadius: cfg.type==='PT'?'50%':'2px',background:cfg.color,flexShrink:0,opacity:.9}}></span>
                                <span style={{fontSize:'.78rem',color:'#374151'}}>{cfg.label}</span>
                                {topoLayerData[cfg.key] && (
                                  <span style={{fontSize:'.7rem',color:'#94a3b8',marginLeft:'auto'}}>
                                    {topoLayerData[cfg.key].features?.length || 0}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

            {/* AI / ML */}
            {activeTab === 'ai' && (() => {
              const riskColor  = (cls) => cls === 'tinggi' ? '#dc2626' : cls === 'sedang' ? '#d97706' : '#16a34a';
              const riskBg     = (cls) => cls === 'tinggi' ? '#fef2f2' : cls === 'sedang' ? '#fffbeb' : '#f0fdf4';
              const riskBorder = (cls) => cls === 'tinggi' ? '#fecaca' : cls === 'sedang' ? '#fde68a' : '#bbf7d0';
              const riskLabel  = (cls) => cls === 'tinggi' ? 'Tinggi' : cls === 'sedang' ? 'Sedang' : 'Rendah';
              const inp = {
                width:'100%', padding:'.45rem .6rem', borderRadius:'8px',
                border:'1px solid #e2e8f0', fontSize:'.82rem', color:'#1e3a5f',
                background:'white', boxSizing:'border-box', outline:'none',
                transition:'border-color .15s',
              };
              const lbl = { fontSize:'.72rem', fontWeight:'600', color:'#64748b', display:'block', marginBottom:'.3rem', letterSpacing:'.02em', textTransform:'uppercase' };
              return (
                <div style={{display:'flex', flexDirection:'column', gap:0}}>

                  {/* ── Panel header */}
                  <div style={{padding:'1rem 1rem .75rem', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontWeight:'700', fontSize:'.95rem', color:'#0f172a'}}>Analisis Risiko Banjir</div>
                      <div style={{fontSize:'.72rem', color:'#94a3b8', marginTop:'.15rem'}}>Masukkan data lokasi untuk mendapat penilaian risiko</div>
                    </div>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:'.3rem',
                      padding:'3px 9px', borderRadius:'99px', fontSize:'.67rem', fontWeight:'700',
                      letterSpacing:'.03em',
                      background: mlModelInfo ? '#f0fdf4' : '#f8fafc',
                      color: mlModelInfo ? '#15803d' : '#94a3b8',
                      border: `1px solid ${mlModelInfo ? '#bbf7d0' : '#e2e8f0'}`,
                    }}>
                      <span style={{width:'6px',height:'6px',borderRadius:'50%',background: mlModelInfo ? '#22c55e' : '#cbd5e1', flexShrink:0}}/>
                      {mlModelInfo ? 'Tersambung' : 'Offline'}
                    </span>
                  </div>

                  <div style={{padding:'1rem', display:'flex', flexDirection:'column', gap:'1rem'}}>

                    {/* ── Step 1 */}
                    <div>
                      <div style={{display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.55rem'}}>
                        <span style={{width:'20px',height:'20px',borderRadius:'50%',background:'#0ea5e9',color:'white',fontSize:'.68rem',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>1</span>
                        <span style={{fontSize:'.8rem',fontWeight:'700',color:'#1e3a5f'}}>Pilih Lokasi di Peta</span>
                      </div>
                      <button
                        onClick={() => { setMlPickMode(p => !p); setMlResult(null); setMlDerived(null); setMlStatus('idle'); }}
                        style={{
                          width:'100%', padding:'.55rem .75rem', borderRadius:'9px', fontSize:'.8rem',
                          fontWeight:'600', cursor:'pointer', transition:'all .18s',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:'.45rem',
                          border: mlPickMode ? '1.5px solid #0ea5e9' : '1.5px dashed #cbd5e1',
                          background: mlPickMode ? '#f0f9ff' : '#fafafa',
                          color: mlPickMode ? '#0369a1' : '#64748b',
                          boxShadow: mlPickMode ? '0 0 0 3px rgba(14,165,233,.1)' : 'none',
                        }}
                      >
                        <MapPin size={14} style={{flexShrink:0}}/>
                        {mlPickMode ? 'Klik titik di peta…' : 'Tentukan lokasi pada peta'}
                      </button>
                      {mlPickedPoint ? (
                        <div style={{marginTop:'.45rem', display:'flex', alignItems:'center', gap:'.5rem', padding:'.4rem .6rem', background:'#f0f9ff', borderRadius:'7px', border:'1px solid #bae6fd'}}>
                          <MapPin size={11} style={{color:'#0284c7',flexShrink:0}}/>
                          <span style={{fontSize:'.74rem', color:'#0369a1', fontWeight:'600', flex:1}}>
                            {mlPickedPoint.lat.toFixed(5)}, {mlPickedPoint.lng.toFixed(5)}
                          </span>
                          <button
                            onClick={()=>{setMlPickedPoint(null);setMlResult(null);setMlDerived(null);setMlStatus('idle');}}
                            style={{background:'none',border:'none',padding:'1px 3px',cursor:'pointer',color:'#94a3b8',fontSize:'.8rem',lineHeight:1,borderRadius:'4px'}}
                          >✕</button>
                        </div>
                      ) : (
                        <div style={{marginTop:'.4rem', textAlign:'center', fontSize:'.72rem', color:'#cbd5e1'}}>— belum dipilih —</div>
                      )}
                    </div>

                    {/* ── Step 2 */}
                    <div>
                      <div style={{display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.55rem'}}>
                        <span style={{width:'20px',height:'20px',borderRadius:'50%',background:'#0ea5e9',color:'white',fontSize:'.68rem',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>2</span>
                        <span style={{fontSize:'.8rem',fontWeight:'700',color:'#1e3a5f'}}>Data Lokasi</span>
                      </div>

                      {/* Elevation */}
                      <div style={{marginBottom:'.6rem'}}>
                        <label style={lbl}>Ketinggian Lokasi <span style={{color:'#cbd5e1',fontWeight:'400',textTransform:'none'}}>(m dpl)</span></label>
                        <div style={{position:'relative'}}>
                          <input
                            type="number" min={0} max={500} step={0.5}
                            value={mlForm.elev_mean}
                            onChange={e => setMlForm(f => ({...f, elev_mean: parseFloat(e.target.value)||0}))}
                            style={inp}
                            placeholder="0"
                          />
                          <span style={{position:'absolute',right:'.6rem',top:'50%',transform:'translateY(-50%)',fontSize:'.72rem',color:'#94a3b8',pointerEvents:'none'}}>meter</span>
                        </div>
                      </div>

                      {/* Flood type */}
                      <div style={{marginBottom:'.6rem'}}>
                        <label style={lbl}>Jenis Potensi Banjir</label>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.4rem'}}>
                          {[['Genangan',0,'#3b82f6'],['Bandang',1,'#ef4444']].map(([l,v,c]) => (
                            <label key={v} style={{
                              display:'flex', alignItems:'center', gap:'.4rem', padding:'.45rem .6rem',
                              borderRadius:'8px', cursor:'pointer', transition:'all .15s', fontSize:'.79rem',
                              border: `1.5px solid ${mlForm.is_bandang===v ? c : '#e2e8f0'}`,
                              background: mlForm.is_bandang===v ? `${c}0f` : 'white',
                              color: mlForm.is_bandang===v ? c : '#475569',
                              fontWeight: mlForm.is_bandang===v ? '700' : '500',
                            }}>
                              <input type="radio" name="is_bandang" value={v} checked={mlForm.is_bandang===v}
                                onChange={()=>setMlForm(f=>({...f,is_bandang:v}))} style={{display:'none'}}/>
                              <span style={{width:'7px',height:'7px',borderRadius:'50%',background: mlForm.is_bandang===v ? c : '#e2e8f0',flexShrink:0,transition:'all .15s'}}/>
                              {l}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Flood history */}
                      <div>
                        <label style={lbl}>Frekuensi Banjir di Sekitar</label>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'.4rem'}}>
                          {[['Jarang',1,'#16a34a'],['Kadang',2,'#d97706'],['Sering',3,'#dc2626']].map(([l,v,c]) => (
                            <label key={v} style={{
                              display:'flex', alignItems:'center', justifyContent:'center',
                              padding:'.4rem', borderRadius:'8px', cursor:'pointer', transition:'all .15s',
                              fontSize:'.76rem', textAlign:'center',
                              border: `1.5px solid ${mlForm.severity_score===v ? c : '#e2e8f0'}`,
                              background: mlForm.severity_score===v ? `${c}0f` : 'white',
                              color: mlForm.severity_score===v ? c : '#64748b',
                              fontWeight: mlForm.severity_score===v ? '700' : '500',
                            }}>
                              <input type="radio" name="severity" value={v} checked={mlForm.severity_score===v}
                                onChange={()=>setMlForm(f=>({...f,severity_score:v}))} style={{display:'none'}}/>
                              {l}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Analyze button */}
                    <button
                      onClick={() => { if (mlStatus !== 'loading') predictSingleArea(); }}
                      disabled={mlStatus === 'loading' || !mlPickedPoint}
                      style={{
                        width:'100%', padding:'.62rem', borderRadius:'10px', border:'none', fontSize:'.85rem',
                        fontWeight:'700', cursor: (!mlPickedPoint||mlStatus==='loading') ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem',
                        transition:'all .2s', letterSpacing:'.01em',
                        background: (!mlPickedPoint||mlStatus==='loading')
                          ? '#e2e8f0'
                          : 'linear-gradient(135deg,#0284c7 0%,#0369a1 100%)',
                        color: (!mlPickedPoint||mlStatus==='loading') ? '#94a3b8' : 'white',
                        boxShadow: (!mlPickedPoint||mlStatus==='loading') ? 'none' : '0 4px 14px rgba(2,132,199,.3)',
                      }}
                    >
                      {mlStatus === 'loading'
                        ? <><RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/> Menganalisis…</>
                        : <><Droplets size={14}/> Analisis Risiko</>}
                    </button>

                    {/* ── Error states */}
                    {mlStatus === 'no-api' && (
                      <div style={{padding:'.6rem .75rem', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', fontSize:'.76rem', color:'#92400e', display:'flex', gap:'.5rem', alignItems:'flex-start'}}>
                        <AlertCircle size={13} style={{flexShrink:0, marginTop:'1px'}}/>
                        <span>Server analisis tidak aktif. Jalankan <code style={{background:'rgba(0,0,0,.06)',padding:'1px 5px',borderRadius:'4px',fontFamily:'monospace'}}>python ml/api.py</code> lalu coba lagi.</span>
                      </div>
                    )}
                    {mlStatus === 'error' && (
                      <div style={{padding:'.6rem .75rem', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'.76rem', color:'#991b1b', display:'flex', gap:'.5rem', alignItems:'center'}}>
                        <XCircle size={13} style={{flexShrink:0}}/> Analisis gagal. Periksa konsol untuk detail.
                      </div>
                    )}

                    {/* ── Result */}
                    {mlStatus === 'done' && mlResult && mlDerived && (() => {
                      const cls = mlResult.predicted_class;
                      return (
                        <div style={{display:'flex', flexDirection:'column', gap:'.65rem', animation:'slideUp .25s ease'}}>

                          {/* Risk score card */}
                          <div style={{borderRadius:'12px', overflow:'hidden', border:`1px solid ${riskBorder(cls)}`}}>
                            <div style={{padding:'.65rem 1rem', background: riskBg(cls), display:'flex', alignItems:'center', gap:'.75rem'}}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:'.68rem', fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.15rem'}}>Tingkat Risiko</div>
                                <div style={{fontSize:'1.5rem', fontWeight:'900', color: riskColor(cls), lineHeight:1}}>{riskLabel(cls)}</div>
                              </div>
                              <div style={{textAlign:'center', padding:'.4rem .7rem', background:'white', borderRadius:'9px', border:`1px solid ${riskBorder(cls)}`}}>
                                <div style={{fontSize:'1.35rem', fontWeight:'900', color: riskColor(cls), lineHeight:1}}>{mlResult.risk_score}</div>
                                <div style={{fontSize:'.62rem', color:'#94a3b8', fontWeight:'600'}}>/ 100</div>
                              </div>
                            </div>
                            {/* Probability bars */}
                            <div style={{padding:'.65rem 1rem', background:'white', borderTop:`1px solid ${riskBorder(cls)}`}}>
                              <div style={{fontSize:'.68rem', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.45rem'}}>Probabilitas</div>
                              {Object.entries(mlResult.probabilities || {}).map(([c, p]) => (
                                <div key={c} style={{display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.3rem'}}>
                                  <span style={{width:'44px', fontSize:'.7rem', color:'#64748b', textTransform:'capitalize', flexShrink:0}}>{c}</span>
                                  <div style={{flex:1, height:'5px', background:'#f1f5f9', borderRadius:'99px', overflow:'hidden'}}>
                                    <div style={{height:'100%', width:`${(p*100).toFixed(0)}%`, background: riskColor(c), borderRadius:'99px', transition:'width .6s ease'}}/>
                                  </div>
                                  <span style={{width:'36px', fontSize:'.7rem', fontWeight:'700', color: riskColor(c), textAlign:'right', flexShrink:0}}>{(p*100).toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Info cards: hospital + duration */}
                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.5rem'}}>
                            {mlDerived.hospital && (
                              <div style={{padding:'.6rem .65rem', background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                                <div style={{fontSize:'.65rem', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'.3rem'}}>RS Terdekat</div>
                                <div style={{fontSize:'.76rem', fontWeight:'700', color:'#0f172a', marginBottom:'.15rem', lineHeight:'1.3'}}>{mlDerived.hospital.name}</div>
                                <div style={{fontSize:'.75rem', fontWeight:'800', color:'#0284c7'}}>{mlDerived.hospital.dist.toFixed(2)} km</div>
                              </div>
                            )}
                            <div style={{padding:'.6rem .65rem', background:'white', borderRadius:'10px', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                              <div style={{fontSize:'.65rem', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'.3rem'}}>Estimasi Surut</div>
                              <div style={{fontSize:'.75rem', fontWeight:'700', color:'#0f172a', lineHeight:'1.35'}}>{mlDerived.duration}</div>
                            </div>
                          </div>

                          {/* Evacuation recommendation */}
                          <div style={{padding:'.65rem .75rem', borderRadius:'10px', background: riskBg(cls), border:`1px solid ${riskBorder(cls)}`}}>
                            <div style={{fontSize:'.7rem', fontWeight:'800', color: riskColor(cls), marginBottom:'.3rem', letterSpacing:'.02em'}}>{mlDerived.advice.urgency}</div>
                            <div style={{fontSize:'.74rem', color:'#374151', lineHeight:'1.5'}}>{mlDerived.advice.text}</div>
                          </div>

                          <div style={{fontSize:'.64rem', color:'#cbd5e1', textAlign:'center'}}>
                            {mlPickedPoint?.lat.toFixed(5)}, {mlPickedPoint?.lng.toFixed(5)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}



          </div>
        </aside>

        {/* MAP SECTION */}
        <main className={`map-section ${isMinimized ? 'minimized' : ''}`}>
          <MapContainer center={mapCenter} zoom={12} style={{height:'100%',width:'100%', cursor: mlPickMode ? 'crosshair' : ''}} className="leaflet-container">

            <GeomanControl />
            <MapClickHandler
              active={mlPickMode}
              onPick={(latlng) => {
                setMlPickedPoint(latlng);
                setMlPickMode(false);
                setMlResult(null);
                setMlDerived(null);
                setMlStatus('idle');
              }}
            />

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

            {/* ── Topografi BIG layers */}
            {TOPO_LAYERS.map(cfg => {
              if (!activeTopoLayers[cfg.key] || !topoLayerData[cfg.key]) return null;
              if (cfg.type === 'PT') {
                return (
                  <GeoJSON
                    key={`topo-${cfg.key}`}
                    data={topoLayerData[cfg.key]}
                    pointToLayer={(feature, latlng) =>
                      L.circleMarker(latlng, {
                        radius: 4,
                        fillColor: cfg.color,
                        color: '#fff',
                        weight: 0.8,
                        opacity: 0.9,
                        fillOpacity: 0.8,
                      })
                    }
                    onEachFeature={(feature, layer) => {
                      const p = feature.properties || {};
                      const label = p.NAMOBJ || p.NAMA || p.nama || p.REMARK || cfg.label;
                      const extra = Object.entries(p)
                        .filter(([k,v]) => v && !['FID','OBJECTID','REMARK','LUASWH','KELILINGWH'].includes(k))
                        .slice(0, 5)
                        .map(([k,v]) => `<p><strong>${k}:</strong> ${v}</p>`) .join('');
                      layer.bindPopup(`<div class="custom-popup"><h4 style="color:${cfg.color}">${cfg.label}</h4><p>${label}</p>${extra}<p style="font-size:.8em;color:#64748b;margin-top:6px">Sumber: BIG 1:25.000</p></div>`);
                    }}
                  />
                );
              }
              return (
                <GeoJSON
                  key={`topo-${cfg.key}`}
                  data={topoLayerData[cfg.key]}
                  style={() => getTopoStyle(cfg)}
                  onEachFeature={(feature, layer) => {
                    const p = feature.properties || {};
                    const label = p.NAMOBJ || p.NAMA || p.nama || p.REMARK || cfg.label;
                    const extra = Object.entries(p)
                      .filter(([k,v]) => v && !['FID','OBJECTID','REMARK','LUASWH','KELILINGWH'].includes(k))
                      .slice(0, 5)
                      .map(([k,v]) => `<p><strong>${k}:</strong> ${v}</p>`).join('');
                    layer.bindPopup(`<div class="custom-popup"><h4 style="color:${cfg.color}">${cfg.label}</h4><p>${label}</p>${extra}<p style="font-size:.8em;color:#64748b;margin-top:6px">Sumber: BIG 1:25.000</p></div>`);
                    if (cfg.type === 'AR') {
                      const def = getTopoStyle(cfg);
                      layer.on({
                        mouseover: () => layer.setStyle({ ...def, fillOpacity: Math.min((def.fillOpacity||0.4)+0.2, 0.85), weight: (def.weight||1)+1 }),
                        mouseout:  () => layer.setStyle(def),
                      });
                    }
                  }}
                />
              );
            })}

            {/* ── ML picked location marker */}
            {mlPickedPoint && (() => {
              const mlColor = (cls) => cls === 'tinggi' ? '#dc2626' : cls === 'sedang' ? '#d97706' : '#16a34a';
              const cls = mlResult?.predicted_class;
              const markerColor = cls ? mlColor(cls) : '#0284c7';
              return (
                <CircleMarker
                  key={`ml-loc-${mlPickedPoint.lat}-${mlPickedPoint.lng}`}
                  center={[mlPickedPoint.lat, mlPickedPoint.lng]}
                  radius={11}
                  pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: 0.5, weight: 2.5, dashArray: cls ? '5,3' : '4,4' }}
                >
                  <Popup>
                    <div className="custom-popup">
                      <h4>Lokasi Anda</h4>
                      <p><b>Koordinat:</b> {mlPickedPoint.lat.toFixed(5)}, {mlPickedPoint.lng.toFixed(5)}</p>
                      {cls && <>
                        <p><b>Risiko Banjir:</b> <span style={{color: markerColor, fontWeight: 700, textTransform:'capitalize'}}>{cls}</span></p>
                        <p><b>Skor:</b> {mlResult.risk_score}/100</p>
                      </>}
                      {!cls && <p style={{color:'#94a3b8',fontSize:'.8em'}}>Isi form dan jalankan analisis</p>}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })()}

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

          {/* ── Map overlay info panel & minimize btn */}
          <div className="map-overlay">
            <button className="map-minimize-btn" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? "Restore" : "Minimize"}>
              {isMinimized ? <Maximize2 size={18}/> : <Minimize2 size={18}/>}
            </button>
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

                {showMlLayer && mlResult && mlPickedPoint && (
                  <div style={{marginTop:'.8rem',paddingTop:'.8rem',borderTop:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:'.72rem',fontWeight:'700',color:'#475569',marginBottom:'.4rem',textTransform:'uppercase',letterSpacing:'.06em'}}>Risiko Banjir</div>
                    {[['#dc2626','Tinggi'],['#d97706','Sedang'],['#16a34a','Rendah']].map(([c,l])=>{
                      const active = l.toLowerCase() === mlResult.predicted_class;
                      return (
                        <div key={l} style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.78rem',marginBottom:'.25rem',opacity:active?1:0.35}}>
                          <span style={{width:'10px',height:'10px',borderRadius:'3px',background:c,flexShrink:0,boxShadow:active?`0 0 4px ${c}80`:''}}></span>
                          <span style={{color:active?c:'#64748b',fontWeight:active?'700':'400'}}>{l}</span>
                        </div>
                      );
                    })}
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
