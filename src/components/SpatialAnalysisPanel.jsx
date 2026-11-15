import React, { useState } from 'react';
import { AlertTriangle, Download, Map as MapIcon, Activity, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

export default function SpatialAnalysisPanel({
  activeTab,
  analysisResults,
  selectedAnalysis,
  priorityAreas,
  priorityBufferUsed = false,
  exportPriorityAreasCsv,
  exportPrioritySummary,
  kecamatanData,
  darkMode,
  bufferRadius,
  setBufferRadius,
  performBufferAnalysis,
  performProximityAnalysis,
  identifyPriorityAreas,
  floodPoints,
  mapFlagIcon,
  analysisIcon,
  satelliteDishIcon,
  clipboardIcon,
  emergencyIcon,
  shoppingIcon,
  stats,
  radarData,
  adminView,
  setAdminView,
}) {
  const [spatialResultFilter, setSpatialResultFilter] = useState('all');
  const points = Array.isArray(floodPoints) ? floodPoints : [];
  const showAnalyticsTab = activeTab === 'analytics';
  const showSpatialTab = activeTab === 'spatial';

  const filteredAnalysisResults = Array.isArray(analysisResults)
    ? analysisResults.filter((r) => {
        if (spatialResultFilter === 'all') return true;
        if (selectedAnalysis === 'buffer') {
          return r.coverage === spatialResultFilter;
        }
        if (selectedAnalysis === 'proximity') {
          return r.nearestDrainage?.accessibility === spatialResultFilter;
        }
        return true;
      })
    : [];

  return (
    <>
      {showAnalyticsTab && (
        <div className="analytics-overview-wrapper">
          <div className="analytics-section">
            <h3 style={{ paddingBottom: '.35rem', display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
              Analisis Mendalam <span className="sim-chip" title="Prototipe — Belum Tervalidasi">PROTOTIPE — BELUM TERVALIDASI</span>
            </h3>

            <div className="chart-section glass-effect">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingBottom: '.35rem' }}>
                <img src={analysisIcon} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                Top Kecamatan Rawan Banjir
              </h4>
              <ResponsiveContainer width="100%" height={Math.max(180, kecamatanData.length * 38 + 20)}>
                <BarChart layout="vertical" data={kecamatanData} margin={{ top: 4, right: 40, left: 8, bottom: 4 }} barCategoryGap={8}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e5e7eb'} opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: darkMode ? '#cbd5e1' : '#475569' }} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip
                    cursor={{ fill: darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(2,132,199,0.06)' }}
                    contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '.8rem', padding: '6px 10px' }}
                    labelStyle={{ color: darkMode ? '#e2e8f0' : '#0f172a', fontWeight: 700 }}
                    formatter={(v) => [`${v} titik`, 'Jumlah']}
                  />
                  <Bar dataKey="value" fill="#0284c7" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 700, fill: darkMode ? '#e2e8f0' : '#0f172a' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="analysis-card glass-effect">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                <img src={analysisIcon} alt="Sungai Utama" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                Kedekatan dengan Sungai Utama <span className="estimate-chip">Referensi Radius Default</span>
              </h4>
              <p>Radius acuan awal pemeriksaan Buffer Analysis terhadap jaringan sungai (BIG 1:25K)</p>
              <div className="metric-estimate">{bufferRadius}m</div>
              <p className="metric-note">Gunakan tab Spatial untuk menghitung jarak segmen sungai aktual per titik banjir</p>
            </div>

            <div className="analysis-card glass-effect">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <img src={analysisIcon} alt="Ranking" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                Ranking Titik Kejadian Tertinggi
              </h4>
              <div className="top-locations">
                {points
                  .slice()
                  .sort((a, b) => b.jumlah_titik - a.jumlah_titik)
                  .slice(0, 5)
                  .map((p, i) => (
                    <div key={p.id} className="location-item">
                      <span className={`rank rank-${i + 1}`}>{i + 1}</span>
                      <div className="location-details">
                        <strong>{p.kelurahan_spasial ? `${p.kelurahan_spasial} (${p.kecamatan_spasial})` : p.nama_kecamatan || p.kecamatan}</strong>
                        <span>
                          {p.jumlah_titik} titik banjir {p.tahun ? `• ${p.tahun}` : ''}
                        </span>
                      </div>
                      <span className={`severity-badge-small ${p.severity}`}>
                        {p.severity === 'high' ? 'Tinggi' : p.severity === 'medium' ? 'Sedang' : 'Rendah'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="chart-section glass-effect">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <img src={satelliteDishIcon} alt="Radar" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                Radar Analysis
              </h4>
              <ResponsiveContainer width="100%" aspect={1} maxHeight={300} minHeight={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={darkMode ? '#334155' : '#e5e7eb'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: darkMode ? '#cbd5e1' : '#475569' }} />
                  <PolarRadiusAxis angle={90} domain={[0, Math.ceil(stats.maxFloodPoints * 1.1)]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Radar name="Jumlah Titik" dataKey="A" stroke="#0284c7" fill="#0284c7" fillOpacity={0.5} />
                  <Tooltip
                    contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e5e7eb'}`, borderRadius: '8px', fontSize: '.8rem', padding: '6px 10px' }}
                    labelStyle={{ color: darkMode ? '#e2e8f0' : '#0f172a', fontWeight: 700 }}
                    formatter={(v) => [`${v} titik`, 'Jumlah']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {showSpatialTab && (
        <div className="spatial-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <img src={analysisIcon} alt="Analysis" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            Analisis Spasial
          </h3>
          <p className="section-description">
            Analisis spasial berbasis jarak terpendek ke segmen geometri sungai (`LineString` & `MultiLineString`) pada wilayah Kota Bekasi
          </p>

          <div className="control-group" style={{ marginTop: '.6rem' }}>
            <label style={{ display: 'block', fontSize: '.9rem', marginBottom: '.35rem' }}>
              Wilayah Administratif Kota Bekasi (48 Kelurahan)
            </label>
            <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <input type="radio" name="adminView" checked={adminView === 'kelurahan'} onChange={() => setAdminView('kelurahan')} />
                <span style={{ marginLeft: '.25rem' }}>Kelurahan (48)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <input type="radio" name="adminView" checked={adminView === 'kecamatan'} onChange={() => setAdminView('kecamatan')} />
                <span style={{ marginLeft: '.25rem' }}>Batas Kecamatan</span>
              </label>
            </div>
          </div>

          <div className="analysis-tool glass-effect">
            <h4><MapIcon size={20} /> Buffer Analysis</h4>
            <p className="tool-description">Identifikasi segmen sungai utama dalam radius tertentu dari titik banjir</p>
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
                    onChange={(e) => setBufferRadius(+e.target.value)}
                    className="slider"
                  />
                  <span className="slider-value">{bufferRadius}m</span>
                </div>
              </div>
              <button
                className="btn-analyze"
                onClick={() => {
                  setSpatialResultFilter('all');
                  performBufferAnalysis();
                }}
              >
                <Activity size={18} />Run Buffer Analysis
              </button>
            </div>
          </div>

          <div className="analysis-tool glass-effect">
            <h4>
              <img src={mapFlagIcon} alt="Map marker" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
              Kedekatan dengan Sungai Utama
            </h4>
            <p className="tool-description">Hitung jarak ortogonal terpendek setiap titik banjir ke segmen sungai terdekat</p>
            <button
              className="btn-analyze"
              onClick={() => {
                setSpatialResultFilter('all');
                performProximityAnalysis();
              }}
            >
              <TrendingUp size={18} />Cek Kedekatan
            </button>
          </div>

          <div className="analysis-tool glass-effect">
            <h4><AlertTriangle size={20} /> Identifikasi Area Prioritas</h4>
            <p className="tool-description">Penilaian prioritas berdasarkan jumlah titik (maks 40), keparahan (maks 30), dan hasil Buffer Analysis (maks 30)</p>
            <button className="btn-analyze" onClick={identifyPriorityAreas}>
              <AlertTriangle size={18} />Identify Priority Areas
            </button>
          </div>

          {selectedAnalysis && analysisResults && selectedAnalysis !== 'priority' && (
            <div className="analysis-results glass-effect">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <img src={clipboardIcon} alt="Results" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                Hasil: {selectedAnalysis === 'buffer' ? 'Buffer Analysis' : 'Kedekatan dengan Sungai Utama'}
              </h4>
              {selectedAnalysis === 'buffer' && (
                <div className="results-content">
                  <div style={{ fontSize: '.7rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '.4rem .55rem', borderRadius: '7px', marginBottom: '.55rem', lineHeight: 1.4 }}>
                    <strong>Sistem Koordinat:</strong> EPSG:32748 (WGS 84 / UTM Zone 48S, meter) • <strong>Radius Aktif:</strong> {bufferRadius} m • <strong>Referensi:</strong> Titik Kejadian Banjir → Segmen Sungai (LineString / MultiLineString)
                  </div>
                  <div className="result-summary">
                    <div className="summary-card">
                      <span className="summary-label">Terlayani</span>
                      <span className="summary-value">{analysisResults.filter((r) => r.coverage === 'Terlayani').length}</span>
                    </div>
                    <div className="summary-card">
                      <span className="summary-label">Tidak Terlayani</span>
                      <span className="summary-value alert">{analysisResults.filter((r) => r.coverage === 'Tidak Terlayani').length}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '.55rem', display: 'flex', alignItems: 'center', gap: '.45rem' }}>
                    <label style={{ fontSize: '.74rem', fontWeight: 600 }}>Filter Status:</label>
                    <select
                      value={spatialResultFilter}
                      onChange={(e) => setSpatialResultFilter(e.target.value)}
                      style={{ padding: '.3rem .5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '.74rem' }}
                    >
                      <option value="all">Semua ({analysisResults.length})</option>
                      <option value="Terlayani">Terlayani ({analysisResults.filter((r) => r.coverage === 'Terlayani').length})</option>
                      <option value="Tidak Terlayani">Tidak Terlayani ({analysisResults.filter((r) => r.coverage === 'Tidak Terlayani').length})</option>
                    </select>
                  </div>
                  <div className="results-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Wilayah (Spasial)</th>
                          <th>Sungai Utama</th>
                          <th>Status</th>
                          <th>Jarak Terdekat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAnalysisResults.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <div>{r.kelurahan_spasial ? `${r.kelurahan_spasial} (${r.kecamatan_spasial})` : r.nama_kecamatan || r.kecamatan}</div>
                              {r.perlu_diperiksa && (
                                <div style={{ fontSize: '.64rem', color: '#d97706', fontWeight: 600 }}>
                                  Perlu Diperiksa: atribut sumber &quot;{r.kecamatan_sumber}&quot;
                                </div>
                              )}
                            </td>
                            <td><strong>{r.drainageInBuffer}</strong></td>
                            <td>
                              <span className={`coverage-badge ${r.coverage === 'Terlayani' ? 'good' : 'poor'}`}>{r.coverage}</span>
                            </td>
                            <td>
                              <div>{r.nearestDrainage ? `${r.nearestDrainage.distance}m` : 'N/A'}</div>
                              {r.nearestDrainage?.type && (
                                <div style={{ fontSize: '.63rem', color: '#64748b' }}>{r.nearestDrainage.type}</div>
                              )}
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
                  <div style={{ fontSize: '.7rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '.4rem .55rem', borderRadius: '7px', marginBottom: '.45rem', lineHeight: 1.4 }}>
                    <strong>Objek &amp; CRS:</strong> Jarak Titik Kejadian Banjir ke Segmen Sungai Terdekat pada <strong>EPSG:32748 (UTM Zone 48S, meter)</strong>. Berbeda dari fitur ML <code>dist_to_river</code> (jarak centroid kelurahan ke sungai).
                  </div>
                  <div style={{ fontSize: '.68rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', padding: '.38rem .55rem', borderRadius: '7px', marginBottom: '.55rem', lineHeight: 1.38 }}>
                    <strong>Catatan Metodologis:</strong> Ambang kategori (&lt; 200 m Sangat Dekat, 200–499 m Dekat, 500–999 m Sedang, ≥ 1000 m Jauh) merupakan parameter operasional aplikasi untuk eksplorasi spasial, bukan standar risiko banjir tervalidasi.
                  </div>
                  <div style={{ marginBottom: '.55rem', display: 'flex', alignItems: 'center', gap: '.45rem' }}>
                    <label style={{ fontSize: '.74rem', fontWeight: 600 }}>Filter Kategori:</label>
                    <select
                      value={spatialResultFilter}
                      onChange={(e) => setSpatialResultFilter(e.target.value)}
                      style={{ padding: '.3rem .5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '.74rem' }}
                    >
                      <option value="all">Semua ({analysisResults.length})</option>
                      <option value="Sangat Dekat">Sangat Dekat (&lt; 200m)</option>
                      <option value="Dekat">Dekat (200–499m)</option>
                      <option value="Sedang">Sedang (500–999m)</option>
                      <option value="Jauh">Jauh (&gt;= 1000m)</option>
                    </select>
                  </div>
                  <div className="results-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Wilayah (Spasial)</th>
                          <th>Jarak Segmen</th>
                          <th>Aksesibilitas</th>
                          <th>Skor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAnalysisResults.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <div>{r.kelurahan_spasial ? `${r.kelurahan_spasial} (${r.kecamatan_spasial})` : r.nama_kecamatan || r.kecamatan}</div>
                              {r.perlu_diperiksa && (
                                <div style={{ fontSize: '.64rem', color: '#d97706', fontWeight: 600 }}>
                                  Perlu Diperiksa: atribut sumber &quot;{r.kecamatan_sumber}&quot;
                                </div>
                              )}
                            </td>
                            <td>
                              <div>{r.nearestDrainage ? `${r.nearestDrainage.distance}m` : 'N/A'}</div>
                              {r.nearestDrainage?.type && (
                                <div style={{ fontSize: '.63rem', color: '#64748b' }}>{r.nearestDrainage.type}</div>
                              )}
                            </td>
                            <td>{r.nearestDrainage?.accessibility || 'N/A'}</td>
                            <td>
                              <span className={`score-badge ${r.proximityScore === 'Baik' ? 'good' : r.proximityScore === 'Sedang' ? 'medium' : 'poor'}`}>
                                {r.proximityScore}
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

          {selectedAnalysis === 'priority' && priorityAreas.length > 0 && (
            <div className="priority-results glass-effect">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <img src={emergencyIcon} alt="Emergency" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                Top 5 Area Prioritas
              </h4>
              <div style={{ fontSize: '.71rem', color: priorityBufferUsed ? '#15803d' : '#b45309', background: priorityBufferUsed ? '#f0fdf4' : '#fffbeb', border: `1px solid ${priorityBufferUsed ? '#bbf7d0' : '#fde68a'}`, padding: '.4rem .55rem', borderRadius: '7px', marginBottom: '.45rem' }}>
                {priorityBufferUsed
                  ? 'Komponen Buffer Analysis aktif: Skor Maksimum = 100 (Jumlah Titik 40 + Keparahan 30 + Buffer 30).'
                  : 'Buffer Analysis belum dijalankan: Komponen Buffer dilewati (0 poin), Skor Maksimum = 70 (Jumlah Titik 40 + Keparahan 30). Jalankan Buffer Analysis terlebih dahulu untuk penilaian penuh.'}
              </div>
              <div style={{ fontSize: '.68rem', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '.35rem .55rem', borderRadius: '7px', marginBottom: '.6rem', lineHeight: 1.38 }}>
                <strong>Catatan Skoring:</strong> Bobot komponen (40 / 30 / 30) merupakan parameter operasional aplikasi untuk penentuan prioritas penanganan eksploratif.
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.7rem' }}>
                <button className="btn-analyze" onClick={exportPriorityAreasCsv} style={{ padding: '.45rem .65rem', fontSize: '.74rem' }}>
                  <Download size={14} /> Export CSV
                </button>
                <button className="btn-analyze" onClick={exportPrioritySummary} style={{ padding: '.45rem .65rem', fontSize: '.74rem' }}>
                  <Download size={14} /> Export Ringkasan
                </button>
              </div>
              <div className="priority-list">
                {priorityAreas.map((area, i) => (
                  <div key={area.id} className={`priority-item priority-${i + 1}`}>
                    <div className="priority-rank">{i + 1}</div>
                    <div className="priority-info">
                      <h5>{area.displayAreaName || area.nama_kecamatan || area.kecamatan}</h5>
                      <div className="priority-details">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.15rem' }}>
                          <img src={mapFlagIcon} alt="Map marker" style={{ width: '10px', height: '10px', objectFit: 'contain' }} />
                          {area.jumlah_titik} titik banjir • Keparahan: {area.severity}
                        </span>
                        <div style={{ fontSize: '.66rem', color: '#64748b', marginTop: '.15rem' }}>
                          Rincian: Titik (+{area.floodCountScore}) + Keparahan (+{area.severityScore})
                          {area.bufferComponentIncluded ? ` + Buffer (+${area.bufferScore})` : ' (Tanpa Buffer)'}
                        </div>
                      </div>
                    </div>
                    <div className="priority-score">
                      <div className="score-text">
                        Skor <strong>{area.priorityScore}/{area.maxPossibleScore || 100}</strong>
                      </div>
                      <span className={`priority-level ${area.priorityLevel === 'Sangat Mendesak' ? 'urgent' : area.priorityLevel === 'Mendesak' ? 'high' : 'medium'}`}>
                        {area.priorityLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="recommendation-box">
                <h5 style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <img src={shoppingIcon} alt="Rekomendasi" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  Rekomendasi
                </h5>
                <p>Area prioritas di atas memerlukan perhatian khusus dalam perencanaan perbaikan infrastruktur Sungai Utama.</p>
                <ul>
                  <li>Penambahan kapasitas Sungai Utama</li>
                  <li>Pembangunan saluran baru di area tidak terlayani</li>
                  <li>Optimalisasi sistem Sungai Utama eksisting</li>
                  <li>Monitoring intensif saat musim hujan</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
