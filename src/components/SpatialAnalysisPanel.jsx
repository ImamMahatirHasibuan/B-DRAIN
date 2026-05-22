import React from 'react';
import { AlertTriangle, Download, Map as MapIcon, Activity, TrendingUp, Database } from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
  ResponsiveContainer,
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

const COLORS = ['#991b1b', '#c2410c', '#065f46', '#1e40af', '#6b21a8', '#9f1239'];

export default function SpatialAnalysisPanel({
  activeTab,
  analysisResults,
  selectedAnalysis,
  priorityAreas,
  exportPriorityAreasCsv,
  exportPrioritySummary,
  kecamatanData,
  darkMode,
  renderPieLabel,
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
  hospitalData,
  drainageData,
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
  const points = Array.isArray(floodPoints) ? floodPoints : [];
  const showAnalyticsTab = activeTab === 'analytics';
  const showSpatialTab = activeTab === 'spatial';

  return (
    <>
      {showAnalyticsTab && (
      <div className="analytics-overview-wrapper">
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
            <div className="stat-icon"><MapIcon size={28}/></div>
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
            <div className="stat-icon"><Activity size={28}/></div>
            <div className="stat-content">
              <span className="stat-value">{drainageData?.features?.length || 0}</span>
              <span className="stat-label">Sungai Utama</span>
              <span className="stat-change">Data OSM</span>
            </div>
          </div>
          <div className="stat-card gradient-green">
            <div className="stat-icon"><TrendingUp size={28}/></div>
            <div className="stat-content">
              <span className="stat-value">{stats.avgPerKecamatan}</span>
              <span className="stat-label">Rata-rata/Kecamatan</span>
              <span className="stat-change">Titik per area</span>
            </div>
          </div>
          <div className="stat-card gradient-blue">
            <div className="stat-icon"><Database size={28}/></div>
            <div className="stat-content">
              <span className="stat-value">{TOPO_LAYERS.length}</span>
              <span className="stat-label">Layer Topografi BIG</span>
              <span className="stat-change">Peta 1:25.000 · {TOPO_GROUPS.length} kategori</span>
            </div>
          </div>
        </div>

        <div className="chart-section glass-effect">
          <h4 style={{display:'flex',alignItems:'center',gap:'.5rem',paddingBottom:'.35rem',flexWrap:'wrap'}}><img src={analysisIcon} alt="Chart" style={{width:'20px',height:'20px',objectFit:'contain'}} />Top Kecamatan Rawan Banjir <span style={{marginLeft:'auto',padding:'.3rem .65rem',background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',color:'#fff',fontSize:'.7rem',fontWeight:'800',borderRadius:'6px',whiteSpace:'normal',lineHeight:'1.1',letterSpacing:'.05em',textTransform:'none',boxShadow:'0 2px 8px rgba(251, 191, 36, 0.3)'}}>Data bersifat Simulasi,<br/>Menunggu Integrasi Data</span></h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={kecamatanData} margin={{top:10,right:20,left:10,bottom:25}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3}/>
              <XAxis dataKey="name" stroke="#6b7280" tick={false} axisLine/>
              <YAxis stroke="#6b7280" style={{fontSize:'.75rem'}} label={{value:'Jumlah Titik',angle:-90,position:'insideLeft',style:{fontSize:'.75rem'}}}/>
              <Tooltip contentStyle={{backgroundColor:darkMode?'#1f2937':'#fff',border:'1px solid #e5e7eb',borderRadius:'8px',fontSize:'.875rem',padding:'8px 12px'}} formatter={v=>[`${v} titik`,'Jumlah']}/>
              <Bar dataKey="value" radius={[8,8,0,0]}>
                {kecamatanData.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>) }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section glass-effect">
          <h4 style={{display:'flex',alignItems:'center',gap:'.5rem',paddingBottom:'.35rem',flexWrap:'wrap'}}><img src={analysisIcon} alt="Distribution" style={{width:'20px',height:'20px',objectFit:'contain'}} />Distribusi Titik Banjir <span style={{marginLeft:'auto',padding:'.3rem .65rem',background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',color:'#fff',fontSize:'.7rem',fontWeight:'800',borderRadius:'6px',whiteSpace:'normal',lineHeight:'1.1',letterSpacing:'.05em',textTransform:'none',boxShadow:'0 2px 8px rgba(251, 191, 36, 0.3)'}}>Data bersifat Simulasi,<br/>Menunggu Integrasi Data</span></h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={kecamatanData} cx="50%" cy="45%" labelLine={false} label={renderPieLabel} innerRadius={35} outerRadius={85} dataKey="value" paddingAngle={2}>
                {kecamatanData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>) }
              </Pie>
              <Tooltip formatter={(v,_,p)=>[`${v} titik`,p.payload.name]}/>
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize:'.75rem',paddingTop:'0px',color:'#000000 !important'}} formatter={(value) => <span style={{color:'#000000'}}>{value.length>12?value.slice(0,12)+'…':value}</span>}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      <div className="analytics-section">
        <h3 style={{paddingBottom:'.35rem'}}>Analisis Spasial <span style={{display:'inline-block',marginLeft:'.8rem',marginBottom:'.15rem',padding:'.3rem .65rem',background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',color:'#fff',fontSize:'.7rem',fontWeight:'800',borderRadius:'6px',whiteSpace:'normal',lineHeight:'1.1',letterSpacing:'.05em',textTransform:'none',boxShadow:'0 2px 8px rgba(251, 191, 36, 0.3)',position:'relative'}}>Data bersifat Simulasi,<br/>Menunggu Integrasi Data</span></h3>
        <div className="analysis-card glass-effect">
          <h4 style={{display:'flex',alignItems:'center',gap:'.5rem'}}><img src={analysisIcon} alt="Sungai Utama" style={{width:'20px',height:'20px',objectFit:'contain'}} />Kedekatan dengan Sungai Utama</h4>
          <p>Analisis kedekatan titik banjir dengan sungai utama</p>
          <div className="metric-large">~350m</div>
          <p className="metric-note">Jarak rata-rata estimasi</p>
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