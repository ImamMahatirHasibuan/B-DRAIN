import React from 'react';
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

/**
 * Panel analisis pada sidebar dashboard, terdiri dari dua tab.
 *
 * Hanya satu tab yang dirender, ditentukan oleh activeTab:
 * - 'analytics' (tab Analytics, judul "Analisis Mendalam"): bar chart "Top Kecamatan Rawan Banjir",
 *   kartu "Kedekatan dengan Sungai Utama", daftar "Ranking Kecamatan", dan radar chart.
 * - 'spatial' (tab Spatial, judul "Analisis Spasial"): pilihan wilayah administratif (adminView),
 *   kontrol radius buffer, tool kedekatan sungai, tool identifikasi area prioritas, tabel hasil,
 *   serta daftar Top 5 area prioritas dengan rekomendasi statis.
 *
 * Transformasi data:
 * - Bar chart memakai kecamatanData (dihitung di komponen induk, MapDashboard.jsx, dari floodData).
 *   Bentuknya { name, value }, berisi jumlah titik banjir per kecamatan, diurutkan menurun, dibatasi 6 entri.
 * - Radar chart memakai radarData, yang dipetakan dari kecamatanData menjadi { subject, A, fullMark: 30 }.
 *   Radius sumbu memakai domain [0, ceil(stats.maxFloodPoints * 1.1)], bukan fullMark.
 * - Daftar "Ranking Kecamatan" tidak memakai kecamatanData. Komponen ini mengurutkan salinan floodPoints
 *   berdasarkan jumlah_titik dan mengambil lima teratas, sehingga satu kecamatan bisa muncul lebih dari sekali
 *   jika floodPoints memiliki lebih dari satu baris per kecamatan.
 *
 * Kartu kedekatan sungai (tab Analytics):
 * Nilai "~350m" dan teks keterangan pada kartu adalah placeholder statis yang ditulis langsung di kode.
 * Nilai ini bukan hasil perhitungan jarak ke sungai. Tombol "Cek Kedekatan" pada tab Spatial memanggil
 * performProximityAnalysis, tetapi logika perhitungannya berada di komponen induk.
 *
 * Chip "Data simulasi" pada judul kedua tab menyatakan bahwa data yang ditampilkan masih simulasi.
 *
 * Prop yang diterima namun tidak dipakai di komponen ini (terdeteksi oleh eslint no-unused-vars):
 * TOPO_LAYERS, TOPO_GROUPS, topoGroupOpen, setTopoGroupOpen, activeTopoLayers, toggleTopoGroup,
 * toggleTopoLayer, topoLayerData. Prop ini tidak dihapus dan hanya dicatat di sini.
 */
export default function SpatialAnalysisPanel({
  activeTab,
  analysisResults,
  selectedAnalysis,
  priorityAreas,
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
  TOPO_LAYERS,
  TOPO_GROUPS,
  topoGroupOpen,
  setTopoGroupOpen,
  activeTopoLayers,
  toggleTopoGroup,
  toggleTopoLayer,
  topoLayerData,
  adminView,
  setAdminView,
}) {
  // Memastikan floodPoints selalu berupa array sebelum diproses di daftar ranking.
  const points = Array.isArray(floodPoints) ? floodPoints : [];
  // Penentu tab yang dirender. Kedua blok di bawah bersifat saling eksklusif.
  const showAnalyticsTab = activeTab === 'analytics';
  const showSpatialTab = activeTab === 'spatial';

  return (
    <>
      {showAnalyticsTab && (
      <div className="analytics-overview-wrapper">
      <div className="analytics-section">
        <h3 style={{paddingBottom:'.35rem',display:'flex',alignItems:'center',gap:'.6rem',flexWrap:'wrap'}}>Analisis Mendalam <span className="sim-chip" title="Data bersifat simulasi, menunggu integrasi data">Data simulasi</span></h3>

        <div className="chart-section glass-effect">
          <h4 style={{display:'flex',alignItems:'center',gap:'.5rem',paddingBottom:'.35rem'}}><img src={analysisIcon} alt="" style={{width:'18px',height:'18px',objectFit:'contain'}} />Top Kecamatan Rawan Banjir</h4>
          <ResponsiveContainer width="100%" height={Math.max(180, kecamatanData.length * 38 + 20)}>
            <BarChart layout="vertical" data={kecamatanData} margin={{top:4,right:40,left:8,bottom:4}} barCategoryGap={8}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={darkMode?'#334155':'#e5e7eb'} opacity={0.5}/>
              <XAxis type="number" hide/>
              <YAxis type="category" dataKey="name" width={96} tick={{fontSize:11, fill: darkMode?'#cbd5e1':'#475569'}} tickLine={false} axisLine={false} interval={0}/>
              <Tooltip
                cursor={{fill: darkMode?'rgba(148,163,184,0.12)':'rgba(2,132,199,0.06)'}}
                contentStyle={{backgroundColor:darkMode?'#1f2937':'#fff',border:`1px solid ${darkMode?'#334155':'#e5e7eb'}`,borderRadius:'8px',fontSize:'.8rem',padding:'6px 10px'}}
                labelStyle={{color:darkMode?'#e2e8f0':'#0f172a',fontWeight:700}}
                formatter={v=>[`${v} titik`,'Jumlah']}
              />
              <Bar dataKey="value" fill="#0284c7" radius={[0,6,6,0]} maxBarSize={22}>
                <LabelList dataKey="value" position="right" style={{fontSize:11, fontWeight:700, fill: darkMode?'#e2e8f0':'#0f172a'}}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analysis-card glass-effect">
          <h4 style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}><img src={analysisIcon} alt="Sungai Utama" style={{width:'20px',height:'20px',objectFit:'contain'}} />Kedekatan dengan Sungai Utama <span className="estimate-chip">Estimasi</span></h4>
          <p>Analisis kedekatan titik banjir dengan sungai utama</p>
          <div className="metric-estimate">~350m</div>
          <p className="metric-note">Placeholder statis — bukan hasil perhitungan proximity aktual</p>
        </div>
        <div className="analysis-card glass-effect">
          <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={analysisIcon} alt="Ranking" style={{width:'20px',height:'20px',objectFit:'contain'}} />Ranking Kecamatan</h4>
          <div className="top-locations">
            {points.slice().sort((a,b)=>b.jumlah_titik-a.jumlah_titik).slice(0,5).map((p,i)=>(
              <div key={p.id} className="location-item">
                <span className={`rank rank-${i+1}`}>{i+1}</span>
                <div className="location-details">
                  <strong>{p.nama_kecamatan||p.kecamatan}</strong>
                  <span>{p.jumlah_titik} titik banjir</span>
                </div>
                <span className={`severity-badge-small ${p.severity}`}>{p.severity==='high'?'Tinggi':p.severity==='medium'?'Sedang':'Rendah'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-section glass-effect">
          <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={satelliteDishIcon} alt="Radar" style={{width:'20px',height:'20px',objectFit:'contain'}} />Radar Analysis</h4>
          <ResponsiveContainer width="100%" aspect={1} maxHeight={300} minHeight={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={darkMode?'#334155':'#e5e7eb'}/>
              <PolarAngleAxis dataKey="subject" tick={{fontSize:11, fill: darkMode?'#cbd5e1':'#475569'}}/>
              <PolarRadiusAxis angle={90} domain={[0,Math.ceil(stats.maxFloodPoints*1.1)]} tick={{fontSize:10, fill: darkMode?'#94a3b8':'#94a3b8'}}/>
              <Radar name="Jumlah Titik" dataKey="A" stroke="#0284c7" fill="#0284c7" fillOpacity={0.5}/>
              <Tooltip
                contentStyle={{backgroundColor:darkMode?'#1f2937':'#fff',border:`1px solid ${darkMode?'#334155':'#e5e7eb'}`,borderRadius:'8px',fontSize:'.8rem',padding:'6px 10px'}}
                labelStyle={{color:darkMode?'#e2e8f0':'#0f172a',fontWeight:700}}
                formatter={v=>[`${v} titik`,'Jumlah']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
      )}

      {showSpatialTab && (
      <div className="spatial-section">
        <h3 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={analysisIcon} alt="Analysis" style={{width:'24px',height:'24px',objectFit:'contain'}} />Analisis Spasial</h3>
        <p className="section-description">Tools analisis spasial untuk identifikasi korelasi titik rawan banjir dengan infrastruktur sungai utama</p>

        <div className="control-group" style={{marginTop:'.6rem'}}>
          <label style={{display:'block',fontSize:'.9rem',marginBottom:'.35rem'}}>Wilayah Administratif (default: Kelurahan)</label>
          <div style={{display:'flex',gap:'.8rem',alignItems:'center'}}>
            <label style={{display:'flex',alignItems:'center',gap:'.35rem'}}>
              <input type="radio" name="adminView" checked={adminView==='kelurahan'} onChange={()=>setAdminView('kelurahan')} />
              <span style={{marginLeft:'.25rem'}}>Kelurahan</span>
            </label>
            <label style={{display:'flex',alignItems:'center',gap:'.35rem'}}>
              <input type="radio" name="adminView" checked={adminView==='kecamatan'} onChange={()=>setAdminView('kecamatan')} />
              <span style={{marginLeft:'.25rem'}}>Kecamatan</span>
            </label>
          </div>
        </div>

        <div className="analysis-tool glass-effect">
          <h4><MapIcon size={20}/> Buffer Analysis</h4>
          <p className="tool-description">Identifikasi sungai utama dalam radius tertentu dari titik banjir</p>
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
            Kedekatan dengan Sungai Utama
          </h4>
          <p className="tool-description">Analisis kedekatan setiap titik banjir ke sungai utama terdekat</p>
          <button className="btn-analyze" onClick={performProximityAnalysis}><TrendingUp size={18}/>Cek Kedekatan</button>
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
              Hasil: {selectedAnalysis==='buffer'?'Buffer Analysis':'Kedekatan dengan Sungai Utama'}
            </h4>
            {selectedAnalysis==='buffer'&&(
              <div className="results-content">
                <div className="result-summary">
                  <div className="summary-card"><span className="summary-label">Terlayani</span><span className="summary-value">{analysisResults.filter(r=>r.coverage==='Terlayani').length}</span></div>
                  <div className="summary-card"><span className="summary-label">Tidak Terlayani</span><span className="summary-value alert">{analysisResults.filter(r=>r.coverage==='Tidak Terlayani').length}</span></div>
                </div>
                <div className="results-table">
                  <table><thead><tr><th>Kecamatan</th><th>Sungai Utama</th><th>Status</th><th>Jarak</th></tr></thead>
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
            <div style={{display:'flex',gap:'.5rem',marginBottom:'.7rem'}}>
              <button className="btn-analyze" onClick={exportPriorityAreasCsv} style={{padding:'.45rem .65rem',fontSize:'.74rem'}}>
                <Download size={14}/> Export CSV
              </button>
              <button className="btn-analyze" onClick={exportPrioritySummary} style={{padding:'.45rem .65rem',fontSize:'.74rem'}}>
                <Download size={14}/> Export Ringkasan
              </button>
            </div>
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