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
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
import MlAnalysisPanel from './components/MlAnalysisPanel';
import SpatialAnalysisPanel from './components/SpatialAnalysisPanel';
import logoBDrain from './assets/Logo B-DRAIN.png';
import mapIcon from './assets/map.png';
import emergencyIcon from './assets/emergency.png';
import mapFlagIcon from './assets/maps-and-flags.png';
import clipboardIcon from './assets/clipboard.png';
import databaseIcon from './assets/database.png';
import shoppingIcon from './assets/shopping.png';
import analysisIcon from './assets/analysis.png';
import barChartIcon from './assets/bar-chart.png';
import satelliteDishIcon from './assets/satellite-dish.png';
import {
  buildOfflineRiskEstimate,
  buildMlPayload,
  classColor,
  getEvacuationAdvice,
  getFloodDuration,
  getNearestHospital,
  severityToScore,
} from './utils/mlRiskUtils';
import {
  buildBatchResultsCsv,
  buildBatchSummaryText,
  buildPriorityAreasCsv,
  buildPrioritySummaryText,
  getTimestampString,
} from './utils/reportExportUtils';

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
// MODERN MARKER FACTORY
// ========================================
const createMarkerIcon = (severity, count) => {
  const palette = {
    high:   { bg: '#2563EB', glow: 'rgba(37,99,235,0.35)',   ring: 'rgba(37,99,235,0.18)' },
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
          border-radius:999px;
          padding:0 6px;
          font-size:10px;
          line-height:1.35;
          transform:translate(25%,-25%);
          box-shadow:0 1px 3px rgba(0,0,0,.2);
        ">${count}</span>
        ` : ''}
      </div>
    `,
    className: 'bdrain-marker',
    iconSize: [totalSize, totalSize],
    iconAnchor: [totalSize / 2, totalSize / 2],
  });
};

// ========================================
// DATA PROCESSING
// ========================================
const MapDashboard = ({ onBack }) => {
  const [floodData, setFloodData] = useState([]);
  const [floodPoints, setFloodPoints] = useState([]);
  const [drainageData, setDrainageData] = useState(null);
  const [floodRiskData, setFloodRiskData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [activeLayers, setActiveLayers] = useState({
    floodPoints: true,
    drainage: false,
    floodRisk: false,
    bufferZones: false,
    hospitals: false,
    mlBatchRisk: false,
  });

  const [filterSeverity, setFilterSeverity] = useState('all');
  const [bufferRadius, setBufferRadius] = useState(350);
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
  const [activeTopoLayers, setActiveTopoLayers] = useState({
    // show kelurahan boundaries by default
    'ADMINISTRASIDESA_AR_25K': true,
    'ADMINISTRASI_LN_25K': false,
  });
  const [adminView, setAdminView] = useState('kelurahan');
  const [topoGroupOpen, setTopoGroupOpen] = useState({});

  const [mlForm, setMlForm] = useState({
    elev_mean: 12,
    severity_score: 2,
  });
  const [mlPickMode, setMlPickMode] = useState(false);
  const [mlPickedPoint, setMlPickedPoint] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [mlStatus, setMlStatus] = useState('idle');
  const [showMlLayer, setShowMlLayer] = useState(true);
  const [mlModelInfo, setMlModelInfo] = useState(null);
  const [mlDerived, setMlDerived] = useState(null);
  const [mlBatchScope, setMlBatchScope] = useState('all');
  const [mlBatchStatus, setMlBatchStatus] = useState('idle');
  const [mlBatchResults, setMlBatchResults] = useState([]);
  const [mlBatchSummary, setMlBatchSummary] = useState(null);
  const [mlBatchRiskFilter, setMlBatchRiskFilter] = useState('all');
  const [mlBatchSortBy, setMlBatchSortBy] = useState('risk_score');

  const   fetchTopoLayerData = async (key) => {
    if (topoLayerData[key]) return topoLayerData[key];
    // try primary location first; if it fails to parse as JSON, try fallback
    const primaryPath = `/data/geojson_kota_bekasi/${key}.geojson`;
    const fallbackPath = `/data/geojson_kota_bekasi/geojson_kota_bekasi/${key}.geojson`;

    const tryLoad = async (path) => {
      try {
        const res = await fetch(path);
        if (!res.ok) return null;
        // attempt to parse JSON; if parsing fails we'll treat as null
        try {
          const json = await res.json();
          // basic validation: must be an object with features or type
          if (json && (json.type || json.features)) return json;
          return null;
        } catch (err) {
          return null;
        }
      } catch (err) {
        return null;
      }
    };

    let data = await tryLoad(primaryPath);
    if (!data) data = await tryLoad(fallbackPath);
    if (!data) throw new Error(`Failed to load topo layer ${key} from ${primaryPath} or ${fallbackPath}`);
    setTopoLayerData(prev => ({ ...prev, [key]: data }));
    return data;
  };

  useEffect(() => {
    let cancelled = false;

    const safeFetchJson = async (path) => {
      try {
        const response = await fetch(path);
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    };

    const normalizeFloodPoints = (geoJson) => {
      const features = geoJson?.features || [];
      return features
        .map((feature) => {
          const coordinates = feature?.geometry?.coordinates || [];
          const [lng, lat] = coordinates;
          if (typeof lat !== 'number' || typeof lng !== 'number') return null;

          const properties = feature?.properties || {};
              return {
                id: properties.id ?? `${properties.kecamatan || properties.nama_kecamatan || 'flood'}-${lat}-${lng}`,
                lat,
                lng,
                kecamatan: properties.kecamatan || properties.bps_nama_kecamatan || properties.nama_kecamatan || '-',
                nama_kecamatan: properties.nama_kecamatan || properties.bps_nama_kecamatan || properties.kecamatan || '-',
                // Support multiple possible property names coming from different generators
                jumlah_titik: Number(properties.jumlah_titik ?? properties.jumlah_titik_banjir ?? properties.jumlah_titik_banjar ?? 0),
                severity: properties.severity || properties.severity_historis || 'low',
                tahun: properties.tahun || null,
              };
        })
        .filter(Boolean);
    };

    const loadDashboardData = async () => {
      const [floodGeoJson, hospitalGeoJson, drainageGeoJson, delineasiGeoJson] = await Promise.all([
        safeFetchJson('/data/data_banjir.geojson'),
        safeFetchJson('/data/sebaran-rumah-sakit-jawa-barat.geojson'),
        safeFetchJson('/data/export.geojson'),
        safeFetchJson('/data/delineasi-indeks-risiko-banjir.geojson'),
      ]);

      if (cancelled) return;

      const points = normalizeFloodPoints(floodGeoJson);
      setFloodData(points);
      setFloodPoints(points);
      // prefer delineasi/genangan polygon file if available
      setFloodRiskData(delineasiGeoJson || null);
      setHospitalData(hospitalGeoJson);
      setDrainageData(drainageGeoJson);
      setLoading(false);
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const activeKeys = TOPO_LAYERS
      .map(layer => layer.key)
      .filter(key => activeTopoLayers[key] && !topoLayerData[key]);

    if (!activeKeys.length) return;

    activeKeys.forEach(key => {
      fetchTopoLayerData(key).catch(() => {});
    });
  }, [activeTopoLayers, topoLayerData]);

  const setAdminViewHandler = (view) => {
    setAdminView(view);
    setActiveTopoLayers(prev => ({
      ...prev,
      'ADMINISTRASIDESA_AR_25K': view === 'kelurahan',
      'ADMINISTRASI_LN_25K': view === 'kecamatan',
    }));
  };

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
    const yearRange = '2020';
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
    const priorityScenarioNames = ['Skenario Uji Coba Wilayah A', 'Skenario Uji Coba Wilayah B', 'Skenario Uji Coba Wilayah C', 'Skenario Uji Coba Wilayah D', 'Skenario Uji Coba Wilayah E'];
    const simulatedPriorityAreas = scored
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 5)
      .map((area, index) => ({
        ...area,
        originalNamaKecamatan: area.nama_kecamatan,
        originalKecamatan: area.kecamatan,
        nama_kecamatan: priorityScenarioNames[index] || `Skenario Uji Coba Wilayah ${String.fromCharCode(65 + index)}`,
        kecamatan: priorityScenarioNames[index] || `Skenario Uji Coba Wilayah ${String.fromCharCode(65 + index)}`,
      }));
    setPriorityAreas(simulatedPriorityAreas);
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
        fetchTopoLayerData(key).catch(() => {});
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
          fetchTopoLayerData(k).catch(() => {});
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

  const downloadTextFile = (content, filename, mimeType = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPriorityAreasCsv = () => {
    if (!priorityAreas.length) return;

    const generatedAt = new Date().toISOString();
    const timestamp = getTimestampString();
    const csv = buildPriorityAreasCsv({ priorityAreas, selectedAnalysis, generatedAt });

    downloadTextFile(csv, `priority-areas-${timestamp}.csv`, 'text/csv;charset=utf-8');
  };

  const exportPrioritySummary = () => {
    if (!priorityAreas.length) return;

    const generatedAt = new Date().toISOString();
    const lines = buildPrioritySummaryText({ priorityAreas, selectedAnalysis, generatedAt });

    downloadTextFile(lines, `priority-summary-${getTimestampString()}.txt`);
  };

  const exportBatchResultsCsv = () => {
    if (!sortedBatchResults.length) return;

    const generatedAt = new Date().toISOString();
    const csv = buildBatchResultsCsv({ rows: sortedBatchResults, generatedAt });

    downloadTextFile(csv, `batch-risk-results-${getTimestampString()}.csv`, 'text/csv;charset=utf-8');
  };

  const exportBatchSummary = () => {
    if (!mlBatchSummary) return;

    const generatedAt = new Date().toISOString();
    const lines = buildBatchSummaryText({
      summary: mlBatchSummary,
      rows: sortedBatchResults,
      scope: mlBatchScope,
      filterClass: mlBatchRiskFilter,
      sortBy: mlBatchSortBy,
      generatedAt,
    });

    downloadTextFile(lines, `batch-risk-summary-${getTimestampString()}.txt`);
  };

  const downloadTopoLayer = async (key) => {
    if (topoLayerData[key]) {
      downloadGeoJson(topoLayerData[key], `${key}.geojson`);
    } else {
      try {
        const data = await fetchTopoLayerData(key);
        downloadGeoJson(data, `${key}.geojson`);
      } catch {}
    }
  };

  // ========================================
  // ML PREDICTION
  // ========================================
  const ML_API = import.meta.env.VITE_ML_API_URL || 'http://localhost:5000';

  const fetchMlModelInfo = async () => {
    try {
      const res = await fetch(`${ML_API}/api/health`);
      if (res.ok) setMlModelInfo(await res.json());
    } catch { /* API not running */ }
  };

  useEffect(() => {
    fetchMlModelInfo();
  }, []);

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
      const payload = buildMlPayload({
        lat,
        lon,
        mlForm,
      });
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

  const handleMlTogglePickMode = () => {
    setMlPickMode(p => !p);
    setMlResult(null);
    setMlDerived(null);
    setMlStatus('idle');
  };

  const handleMlClearPickedPoint = () => {
    setMlPickedPoint(null);
    setMlResult(null);
    setMlDerived(null);
    setMlStatus('idle');
  };

  const handleMlFormChange = (patch) => {
    setMlForm((form) => ({ ...form, ...patch }));
  };

  const predictSingleAreaOffline = () => {
    if (!mlPickedPoint) return;

    const lat = mlPickedPoint.lat;
    const lon = mlPickedPoint.lng;
    const payload = buildMlPayload({
      lat,
      lon,
      mlForm,
    });

    const resultData = buildOfflineRiskEstimate(payload);
    setMlResult(resultData);

    const hospital = getNearestHospital(lat, lon, hospitalData);
    const duration = getFloodDuration(resultData.predicted_class, mlForm.elev_mean);
    const advice = getEvacuationAdvice(resultData.predicted_class);
    setMlDerived({ hospital, duration, advice });
    setMlStatus('done');
    setShowMlLayer(true);
  };

  const predictBatchAreas = async () => {
    setMlBatchStatus('loading');
    setMlBatchResults([]);
    setMlBatchSummary(null);

    const targetPoints = mlBatchScope === 'all' ? floodPoints : filteredFloodPoints;
    if (!targetPoints.length) {
      setMlBatchStatus('error');
      return;
    }

    const features = targetPoints.map((point) => ({
      kelurahan: point.nama_kecamatan || point.kecamatan,
      kecamatan: point.kecamatan,
      ...buildMlPayload({
        lat: point.lat,
        lon: point.lng,
        mlForm,
      }),
    }));

    try {
      const response = await fetch(`${ML_API}/api/predict/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      const enrichedResults = (data.results || []).map((row) => {
        const sourcePoint = targetPoints[row.index] || {};
        const lat = Number(sourcePoint.lat ?? row.lat);
        const lng = Number(sourcePoint.lng ?? sourcePoint.lon ?? row.lng ?? row.lon);
        const priorityScore = row.success
          ? ((row.risk_score || 0) * 0.65) + ((row.confidence || 0) * 0.2) + ((sourcePoint.jumlah_titik || 0) * 0.15)
          : 0;

        return {
          ...row,
          lat,
          lng,
          jumlah_titik: sourcePoint.jumlah_titik || 0,
          nama_kecamatan: sourcePoint.nama_kecamatan || sourcePoint.kecamatan || row.kecamatan || row.kelurahan || '-',
          priority_score: Number(priorityScore.toFixed(2)),
        };
      });

      const sortedResults = enrichedResults.slice().sort((a, b) => {
        if (!!a.success !== !!b.success) return a.success ? -1 : 1;
        return (b.priority_score || 0) - (a.priority_score || 0);
      });

      const successRows = sortedResults.filter(r => r.success);
      const highCount = successRows.filter(r => r.predicted_class === 'tinggi').length;
      const mediumCount = successRows.filter(r => r.predicted_class === 'sedang').length;
      const lowCount = successRows.filter(r => r.predicted_class === 'rendah').length;
      const avgRiskScore = successRows.length
        ? (successRows.reduce((sum, row) => sum + (row.risk_score || 0), 0) / successRows.length).toFixed(1)
        : '0.0';

      setMlBatchResults(sortedResults);
      setMlBatchSummary({
        total: sortedResults.length,
        success: successRows.length,
        failed: sortedResults.length - successRows.length,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        avgRiskScore,
      });
      setMlBatchStatus('done');
      setActiveLayers(p => ({ ...p, mlBatchRisk: true }));
    } catch (e) {
      setMlBatchStatus(e.message.includes('Failed to fetch') ? 'no-api' : 'error');
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

  const sortedBatchResults = mlBatchResults
    .filter(row => row.success)
    .filter(row => mlBatchRiskFilter === 'all' || row.predicted_class === mlBatchRiskFilter)
    .slice()
    .sort((a, b) => {
      if (mlBatchSortBy === 'risk_score') return (b.risk_score || 0) - (a.risk_score || 0);
      if (mlBatchSortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
      if (mlBatchSortBy === 'jumlah_titik') return (b.jumlah_titik || 0) - (a.jumlah_titik || 0);
      return (b.priority_score || 0) - (a.priority_score || 0);
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
      tinggi: { fill: '#bfdbfe', stroke: '#3b82f6', opacity: 0.65, strokeW: 1.8 },
      sedang: { fill: '#fef3c7', stroke: '#f59e0b', opacity: 0.55, strokeW: 1.5 },
      rendah: { fill: '#bbf7d0', stroke: '#10b981', opacity: 0.45, strokeW: 1.2 },
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
  const floodRiskAreaCount = (floodRiskData && floodRiskData.features && floodRiskData.features.length)
    ? floodRiskData.features.length
    : new Set(floodData.map(i => i.kecamatan)).size;

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
                  <h3 style={{paddingBottom:'.35rem'}}>Statistik Kota Bekasi <span style={{display:'inline-block',marginLeft:'.8rem',marginBottom:'.15rem',padding:'.3rem .65rem',background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',color:'#fff',fontSize:'.7rem',fontWeight:'800',borderRadius:'6px',whiteSpace:'normal',lineHeight:'1.1',letterSpacing:'.05em',textTransform:'none',boxShadow:'0 2px 8px rgba(251, 191, 36, 0.3)',position:'relative'}}>Data bersifat Simulasi,<br/>Menunggu Integrasi Data</span></h3>
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
                      <span className="stat-label">Sungai Utama</span>
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
                      <span className="stat-value">{floodRiskAreaCount}</span>
                      <span className="stat-label">Peta Tingkat Risiko Banjir per Kelurahan</span>
                      <span className="stat-change">{floodRiskAreaCount} area kelurahan</span>
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
                  <h4 style={{display:'flex',alignItems:'center',gap:'.5rem',paddingBottom:'.35rem',flexWrap:'wrap'}}><img src={barChartIcon} alt="Bar Chart" style={{width:'20px',height:'20px',objectFit:'contain'}} />Top Kecamatan Rawan Banjir <span style={{marginLeft:'auto',padding:'.3rem .65rem',background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',color:'#fff',fontSize:'.7rem',fontWeight:'800',borderRadius:'6px',whiteSpace:'normal',lineHeight:'1.1',letterSpacing:'.05em',textTransform:'none',boxShadow:'0 2px 8px rgba(251, 191, 36, 0.3)'}}>Data bersifat Simulasi,<br/>Menunggu Integrasi Data</span></h4>
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
                  <h4 style={{display:'flex',alignItems:'center',gap:'.5rem',paddingBottom:'.35rem',flexWrap:'wrap'}}><img src={barChartIcon} alt="Distribution" style={{width:'20px',height:'20px',objectFit:'contain'}} />Distribusi Titik Banjir <span style={{marginLeft:'auto',padding:'.3rem .65rem',background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',color:'#fff',fontSize:'.7rem',fontWeight:'800',borderRadius:'6px',whiteSpace:'normal',lineHeight:'1.1',letterSpacing:'.05em',textTransform:'none',boxShadow:'0 2px 8px rgba(251, 191, 36, 0.3)'}}>Data bersifat Simulasi,<br/>Menunggu Integrasi Data</span></h4>
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
                <h3 style={{paddingBottom:'.35rem'}}>Layer Management <span style={{display:'inline-block',marginLeft:'.8rem',marginBottom:'.15rem',padding:'.3rem .65rem',background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',color:'#fff',fontSize:'.7rem',fontWeight:'800',borderRadius:'6px',whiteSpace:'normal',lineHeight:'1.1',letterSpacing:'.05em',textTransform:'none',boxShadow:'0 2px 8px rgba(251, 191, 36, 0.3)',position:'relative'}}>Data bersifat Simulasi,<br/>Menunggu Integrasi Data</span></h3>
                <div className="layer-controls">
                  {[
                    ['floodPoints','Titik Rawan Banjir',`${filteredFloodPoints.length} lokasi`,<MapPin size={18}/>],
                    ['drainage','Sungai Utama',`${drainageData?.features?.length||0} saluran`,<Droplets size={18}/>],
                    ['hospitals','Rumah Sakit',`${hospitalData?.features?.length||0} fasilitas`,<AlertTriangle size={18}/>],
                    ['bufferZones','Buffer Zones',selectedAnalysis==='buffer'?`${bufferRadius}m radius`:'Run analysis first',<MapIcon size={18}/>],
                    ['floodRisk','Peta Tingkat Risiko Banjir per Kelurahan',`${floodRiskAreaCount} area`,<AlertTriangle size={18}/>],
                    ['mlBatchRisk','Layer Hasil Batch ML',`${mlBatchResults.filter(r=>r.success).length} area`,<Brain size={18}/>],
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
                    <option value="high">🔵 Tinggi (≥20 titik)</option>
                    <option value="medium">🟡 Sedang (12–19 titik)</option>
                    <option value="low">🟢 Rendah (&lt;12 titik)</option>
                  </select>
                </div>

                <div className="legend-section glass-effect">
                  <h4>Legenda</h4>
                  <div className="legend-items">
                    {[['#2563EB','Peta Tingkat Risiko Banjir per Kelurahan - Tinggi','≥20 titik banjir'],['#f59e0b','Peta Tingkat Risiko Banjir per Kelurahan - Sedang','12–19 titik banjir'],['#10b981','Peta Tingkat Risiko Banjir per Kelurahan - Rendah','<12 titik banjir']].map(([c,n,d])=>(
                      <div key={n} className="legend-item">
                        <span className="legend-color" style={{backgroundColor:c}}></span>
                        <div className="legend-text"><strong>{n}</strong><span>{d}</span></div>
                      </div>
                    ))}
                    <div className="legend-item">
                      <span className="legend-line" style={{backgroundColor:'#38bdf8'}}></span>
                      <div className="legend-text"><strong>Sungai Utama</strong><span>OpenStreetMap</span></div>
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
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'analytics' || activeTab === 'spatial') && (
              <SpatialAnalysisPanel
                activeTab={activeTab}
                analysisResults={analysisResults}
                selectedAnalysis={selectedAnalysis}
                priorityAreas={priorityAreas}
                exportPriorityAreasCsv={exportPriorityAreasCsv}
                exportPrioritySummary={exportPrioritySummary}
                kecamatanData={kecamatanData}
                darkMode={darkMode}
                renderPieLabel={renderPieLabel}
                bufferRadius={bufferRadius}
                setBufferRadius={setBufferRadius}
                performBufferAnalysis={performBufferAnalysis}
                performProximityAnalysis={performProximityAnalysis}
                identifyPriorityAreas={identifyPriorityAreas}
                mapFlagIcon={mapFlagIcon}
                analysisIcon={analysisIcon}
                satelliteDishIcon={satelliteDishIcon}
                clipboardIcon={clipboardIcon}
                emergencyIcon={emergencyIcon}
                shoppingIcon={shoppingIcon}
                stats={stats}
                radarData={radarData}
                floodPoints={floodPoints}
                hospitalData={hospitalData}
                drainageData={drainageData}
                TOPO_LAYERS={TOPO_LAYERS}
                TOPO_GROUPS={TOPO_GROUPS}
                topoGroupOpen={topoGroupOpen}
                setTopoGroupOpen={setTopoGroupOpen}
                activeTopoLayers={activeTopoLayers}
                toggleTopoGroup={toggleTopoGroup}
                toggleTopoLayer={toggleTopoLayer}
                topoLayerData={topoLayerData}
                adminView={adminView}
                setAdminView={setAdminViewHandler}
              />
            )}

            {/* AI / ML */}
            {activeTab === 'ai' && (
              <MlAnalysisPanel
                mlModelInfo={mlModelInfo}
                mlPickMode={mlPickMode}
                onTogglePickMode={handleMlTogglePickMode}
                mlPickedPoint={mlPickedPoint}
                onClearPickedPoint={handleMlClearPickedPoint}
                mlForm={mlForm}
                onMlFormChange={handleMlFormChange}
                mlStatus={mlStatus}
                onAnalyzeSingle={predictSingleArea}
                onAnalyzeSingleOffline={predictSingleAreaOffline}
                mlResult={mlResult}
                mlDerived={mlDerived}
                mlBatchScope={mlBatchScope}
                onMlBatchScopeChange={setMlBatchScope}
                mlBatchStatus={mlBatchStatus}
                onAnalyzeBatch={predictBatchAreas}
                mlBatchRiskFilter={mlBatchRiskFilter}
                onMlBatchRiskFilterChange={setMlBatchRiskFilter}
                mlBatchSortBy={mlBatchSortBy}
                onMlBatchSortByChange={setMlBatchSortBy}
                mlBatchSummary={mlBatchSummary}
                sortedBatchResults={sortedBatchResults}
                filteredFloodPointsLength={filteredFloodPoints.length}
                floodPointsLength={floodPoints.length}
                onExportBatchResultsCsv={exportBatchResultsCsv}
                onExportBatchSummary={exportBatchSummary}
              />
            )}



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

            {/* ── Flood Risk polygons */}
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
                      <h4>🌊 Sungai Utama</h4>
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
                <Popup><div className="popup-content"><h4>Buffer Zone</h4><p><b>Area:</b> {p.nama_kecamatan||p.kecamatan}</p><p><b>Radius:</b> {bufferRadius}m</p><p><b>Sungai Utama:</b> {p.drainageInBuffer}</p><p><b>Status:</b> {p.coverage}</p></div></Popup>
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

            {/* ── ML batch risk markers */}
            {activeLayers.mlBatchRisk && sortedBatchResults.map((row, idx) => {
              const lat = Number(row.lat);
              const lng = Number(row.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
              const markerColor = classColor(row.predicted_class);
              const radius = row.priority_score >= 80 ? 12 : row.priority_score >= 65 ? 10 : 8;
              return (
                <CircleMarker
                  key={`ml-batch-${row.index}-${idx}`}
                  center={[lat, lng]}
                  radius={radius}
                  pathOptions={{
                    color: markerColor,
                    fillColor: markerColor,
                    fillOpacity: 0.45,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="custom-popup">
                      <h4>Hasil Batch ML</h4>
                      <p><b>Area:</b> {row.kelurahan || row.nama_kecamatan}</p>
                      <p><b>Kelas:</b> <span style={{color: markerColor, fontWeight: 700, textTransform: 'capitalize'}}>{row.predicted_class}</span></p>
                      <p><b>Risk Score:</b> {row.risk_score?.toFixed?.(1) ?? row.risk_score}</p>
                      <p><b>Confidence:</b> {(row.confidence || 0).toFixed(1)}%</p>
                      <p><b>Priority Score:</b> {row.priority_score}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

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

                {/* Unified legend: Peta Tingkat Risiko Banjir per Kelurahan */}
                <div style={{marginBottom:'.8rem'}}>
                  <div style={{fontSize:'.78rem',fontWeight:'700',color:'#6b7280',marginBottom:'.4rem',textTransform:'uppercase',letterSpacing:'.04em'}}>📊 Peta Tingkat Risiko Banjir per Kelurahan</div>
                  {[['#2563EB','Peta Tingkat Risiko Banjir per Kelurahan - Tinggi'],['#f59e0b','Peta Tingkat Risiko Banjir per Kelurahan - Sedang'],['#10b981','Peta Tingkat Risiko Banjir per Kelurahan - Rendah']].map(([c,l])=>(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.78rem',marginBottom:'.25rem'}}>
                      <span style={{width:'12px',height:'12px',borderRadius:'3px',background:c,flexShrink:0,opacity:.95}}></span>
                      <span style={{color:'#475569'}}>{l}</span>
                    </div>
                  ))}
                </div>

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

                {activeLayers.mlBatchRisk && sortedBatchResults.length > 0 && (
                  <div style={{marginTop:'.8rem',paddingTop:'.8rem',borderTop:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:'.72rem',fontWeight:'700',color:'#475569',marginBottom:'.4rem',textTransform:'uppercase',letterSpacing:'.06em'}}>Batch ML Layer</div>
                    {[['#dc2626','Tinggi'],['#d97706','Sedang'],['#16a34a','Rendah']].map(([c,l]) => (
                      <div key={`batch-${l}`} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'.5rem',fontSize:'.78rem',marginBottom:'.25rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.45rem'}}>
                          <span style={{width:'10px',height:'10px',borderRadius:'50%',background:c,flexShrink:0}}></span>
                          <span style={{color:'#475569'}}>{l}</span>
                        </div>
                        <span style={{fontWeight:'700',color:'#0f172a'}}>
                          {sortedBatchResults.filter(r => r.predicted_class === l.toLowerCase()).length}
                        </span>
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
