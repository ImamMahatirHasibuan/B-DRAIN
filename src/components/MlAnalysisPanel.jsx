import React from 'react';
import { AlertCircle, Download, Droplets, MapPin, RefreshCw, XCircle } from 'lucide-react';

const riskColor = (cls) => (cls === 'tinggi' ? '#dc2626' : cls === 'sedang' ? '#d97706' : '#16a34a');
const riskBg = (cls) => (cls === 'tinggi' ? '#fef2f2' : cls === 'sedang' ? '#fffbeb' : '#f0fdf4');
const riskBorder = (cls) => (cls === 'tinggi' ? '#fecaca' : cls === 'sedang' ? '#fde68a' : '#bbf7d0');
const riskLabel = (cls) => (cls === 'tinggi' ? 'Tinggi' : cls === 'sedang' ? 'Sedang' : 'Rendah');

export default function MlAnalysisPanel({
  mlModelInfo,
  mlPickMode,
  onTogglePickMode,
  mlPickedPoint,
  onClearPickedPoint,
  mlForm,
  onMlFormChange,
  mlStatus,
  onAnalyzeSingle,
  onAnalyzeSingleOffline,
  mlResult,
  mlDerived,
  mlBatchScope,
  onMlBatchScopeChange,
  mlBatchStatus,
  onAnalyzeBatch,
  mlBatchRiskFilter,
  onMlBatchRiskFilterChange,
  mlBatchSortBy,
  onMlBatchSortByChange,
  mlBatchSummary,
  sortedBatchResults,
  filteredFloodPointsLength,
  floodPointsLength,
  onExportBatchResultsCsv,
  onExportBatchSummary,
}) {
  const inp = {
    width: '100%',
    padding: '.45rem .6rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '.82rem',
    color: '#1e3a5f',
    background: 'white',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color .15s',
  };

  const lbl = {
    fontSize: '.72rem',
    fontWeight: '600',
    color: '#64748b',
    display: 'block',
    marginBottom: '.3rem',
    letterSpacing: '.02em',
    textTransform: 'uppercase',
  };

  return (
    <div style={{display:'flex', flexDirection:'column', gap:0}}>
      <div style={{padding:'1rem 1rem .75rem', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div>
          <div style={{fontWeight:'700', fontSize:'.95rem', color:'#0f172a', display:'flex', alignItems:'center', gap:'.5rem',paddingBottom:'.35rem',flexWrap:'wrap'}}>Analisis Risiko Banjir <span style={{display:'inline-block',padding:'.3rem .65rem',background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',color:'#fff',fontSize:'.7rem',fontWeight:'800',borderRadius:'6px',whiteSpace:'normal',lineHeight:'1.1',letterSpacing:'.05em',textTransform:'none',boxShadow:'0 2px 8px rgba(251, 191, 36, 0.3)'}}>Data bersifat Simulasi,<br/>Menunggu Integrasi Data</span></div>
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
        <div>
          <div style={{display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.55rem'}}>
            <span style={{width:'20px',height:'20px',borderRadius:'50%',background:'#0ea5e9',color:'white',fontSize:'.68rem',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>1</span>
            <span style={{fontSize:'.8rem',fontWeight:'700',color:'#1e3a5f'}}>Pilih Lokasi di Peta</span>
          </div>
          <button
            onClick={onTogglePickMode}
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
                onClick={onClearPickedPoint}
                style={{background:'none',border:'none',padding:'1px 3px',cursor:'pointer',color:'#94a3b8',fontSize:'.8rem',lineHeight:1,borderRadius:'4px'}}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{marginTop:'.4rem', textAlign:'center', fontSize:'.72rem', color:'#cbd5e1'}}>— belum dipilih —</div>
          )}
        </div>

        <div>
          <div style={{display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.55rem'}}>
            <span style={{width:'20px',height:'20px',borderRadius:'50%',background:'#0ea5e9',color:'white',fontSize:'.68rem',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>2</span>
            <span style={{fontSize:'.8rem',fontWeight:'700',color:'#1e3a5f'}}>Data Lokasi</span>
          </div>

          <div style={{marginBottom:'.6rem'}}>
            <label style={lbl}>Ketinggian Lokasi <span style={{color:'#cbd5e1',fontWeight:'400',textTransform:'none'}}>(m dpl)</span></label>
            <div style={{position:'relative'}}>
              <input
                type="number"
                min={0}
                max={500}
                step={0.5}
                value={mlForm.elev_mean}
                onChange={(e) => onMlFormChange({ elev_mean: parseFloat(e.target.value) || 0 })}
                style={inp}
                placeholder="0"
              />
              <span style={{position:'absolute',right:'.6rem',top:'50%',transform:'translateY(-50%)',fontSize:'.72rem',color:'#94a3b8',pointerEvents:'none'}}>meter</span>
            </div>
          </div>

          <div>
            <label style={lbl}>Frekuensi Banjir di Sekitar</label>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'.4rem'}}>
              {[['Jarang',1,'#16a34a'],['Kadang',2,'#d97706'],['Sering',3,'#dc2626']].map(([label, value, color]) => (
                <label key={value} style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:'.4rem', borderRadius:'8px', cursor:'pointer', transition:'all .15s',
                  fontSize:'.76rem', textAlign:'center',
                  border: `1.5px solid ${mlForm.severity_score===value ? color : '#e2e8f0'}`,
                  background: mlForm.severity_score===value ? `${color}0f` : 'white',
                  color: mlForm.severity_score===value ? color : '#64748b',
                  fontWeight: mlForm.severity_score===value ? '700' : '500',
                }}>
                  <input type="radio" name="severity" value={value} checked={mlForm.severity_score===value}
                    onChange={() => onMlFormChange({ severity_score: value })} style={{display:'none'}}/>
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => { if (mlStatus !== 'loading') onAnalyzeSingle(); }}
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

        {mlStatus === 'no-api' && (
          <div style={{padding:'.6rem .75rem', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', fontSize:'.76rem', color:'#92400e', display:'flex', flexDirection:'column', gap:'.55rem'}}>
            <div style={{display:'flex', gap:'.5rem', alignItems:'flex-start'}}>
              <AlertCircle size={13} style={{flexShrink:0, marginTop:'1px'}}/>
              <span>Server analisis tidak aktif. Jalankan <code style={{background:'rgba(0,0,0,.06)',padding:'1px 5px',borderRadius:'4px',fontFamily:'monospace'}}>python ml/api.py</code> lalu coba lagi.</span>
            </div>
            <button
              onClick={onAnalyzeSingleOffline}
              disabled={!mlPickedPoint}
              style={{
                alignSelf:'flex-start',
                padding:'.36rem .62rem',
                borderRadius:'7px',
                border:'1px solid #f59e0b',
                background: mlPickedPoint ? '#fef3c7' : '#f8fafc',
                color: mlPickedPoint ? '#92400e' : '#94a3b8',
                fontWeight:'700',
                cursor: mlPickedPoint ? 'pointer' : 'not-allowed',
              }}
            >
              Gunakan Prediksi Offline (Demo)
            </button>
          </div>
        )}

        {mlStatus === 'error' && (
          <div style={{padding:'.6rem .75rem', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'.76rem', color:'#991b1b', display:'flex', gap:'.5rem', alignItems:'center'}}>
            <XCircle size={13} style={{flexShrink:0}}/> Analisis gagal. Periksa konsol untuk detail.
          </div>
        )}

        {mlStatus === 'done' && mlResult && mlDerived && (() => {
          const cls = mlResult.predicted_class;
          return (
            <div style={{display:'flex', flexDirection:'column', gap:'.65rem', animation:'slideUp .25s ease'}}>
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
                <div style={{padding:'.65rem 1rem', background:'white', borderTop:`1px solid ${riskBorder(cls)}`}}>
                  <div style={{fontSize:'.68rem', fontWeight:'700', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.45rem'}}>Probabilitas</div>
                  {Object.entries(mlResult.probabilities || {}).map(([riskClass, probability]) => (
                    <div key={riskClass} style={{display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.3rem'}}>
                      <span style={{width:'44px', fontSize:'.7rem', color:'#64748b', textTransform:'capitalize', flexShrink:0}}>{riskClass}</span>
                      <div style={{flex:1, height:'5px', background:'#f1f5f9', borderRadius:'99px', overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${(probability*100).toFixed(0)}%`, background: riskColor(riskClass), borderRadius:'99px', transition:'width .6s ease'}}/>
                      </div>
                      <span style={{width:'36px', fontSize:'.7rem', fontWeight:'700', color: riskColor(riskClass), textAlign:'right', flexShrink:0}}>{(probability*100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

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

        <div style={{marginTop:'.3rem', paddingTop:'.8rem', borderTop:'1px solid #eef2f7'}}>
          <div style={{display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.55rem'}}>
            <span style={{width:'20px',height:'20px',borderRadius:'50%',background:'#0ea5e9',color:'white',fontSize:'.68rem',fontWeight:'800',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>3</span>
            <span style={{fontSize:'.8rem',fontWeight:'700',color:'#1e3a5f'}}>Batch Prediksi Per Area</span>
          </div>

          <div style={{display:'flex',gap:'.5rem',marginBottom:'.55rem'}}>
            <select
              value={mlBatchScope}
              onChange={(e) => onMlBatchScopeChange(e.target.value)}
              style={{
                flex:1,
                padding:'.48rem .6rem',
                borderRadius:'8px',
                border:'1px solid #e2e8f0',
                fontSize:'.78rem',
                color:'#1e3a5f',
                background:'white',
              }}
            >
              <option value="filtered">Area Terfilter ({filteredFloodPointsLength})</option>
              <option value="all">Semua Area ({floodPointsLength})</option>
            </select>
            <button
              onClick={() => { if (mlBatchStatus !== 'loading') onAnalyzeBatch(); }}
              disabled={mlBatchStatus === 'loading'}
              style={{
                padding:'.48rem .75rem',
                borderRadius:'8px',
                border:'none',
                background: mlBatchStatus === 'loading' ? '#e2e8f0' : 'linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%)',
                color: mlBatchStatus === 'loading' ? '#94a3b8' : '#fff',
                fontSize:'.76rem',
                fontWeight:'700',
                cursor: mlBatchStatus === 'loading' ? 'not-allowed' : 'pointer',
                minWidth:'115px',
              }}
            >
              {mlBatchStatus === 'loading' ? 'Proses...' : 'Run Batch'}
            </button>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.45rem',marginBottom:'.55rem'}}>
            <select
              value={mlBatchRiskFilter}
              onChange={(e) => onMlBatchRiskFilterChange(e.target.value)}
              style={{
                padding:'.46rem .55rem',
                borderRadius:'8px',
                border:'1px solid #e2e8f0',
                fontSize:'.74rem',
                color:'#1e3a5f',
                background:'white',
              }}
            >
              <option value="all">Semua Kelas</option>
              <option value="tinggi">Risiko Tinggi</option>
              <option value="sedang">Risiko Sedang</option>
              <option value="rendah">Risiko Rendah</option>
            </select>
            <select
              value={mlBatchSortBy}
              onChange={(e) => onMlBatchSortByChange(e.target.value)}
              style={{
                padding:'.46rem .55rem',
                borderRadius:'8px',
                border:'1px solid #e2e8f0',
                fontSize:'.74rem',
                color:'#1e3a5f',
                background:'white',
              }}
            >
              <option value="priority">Sort: Prioritas</option>
              <option value="risk_score">Sort: Risk Score</option>
              <option value="confidence">Sort: Confidence</option>
              <option value="jumlah_titik">Sort: Jumlah Titik</option>
            </select>
          </div>

          {mlBatchStatus === 'error' && (
            <div style={{padding:'.55rem .65rem', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'.74rem', color:'#991b1b'}}>
              Batch gagal diproses. Pastikan data area tersedia dan coba lagi.
            </div>
          )}

          {mlBatchStatus === 'no-api' && (
            <div style={{padding:'.55rem .65rem', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', fontSize:'.74rem', color:'#92400e'}}>
              Server analisis tidak aktif. Jalankan API backend lalu ulangi batch.
            </div>
          )}

          {mlBatchStatus === 'done' && mlBatchSummary && (
            <div style={{display:'flex', flexDirection:'column', gap:'.6rem'}}>
              <div style={{display:'flex',gap:'.45rem'}}>
                <button
                  onClick={onExportBatchResultsCsv}
                  style={{
                    border:'1px solid #bae6fd',
                    background:'#f0f9ff',
                    color:'#0369a1',
                    borderRadius:'8px',
                    padding:'.4rem .55rem',
                    fontSize:'.72rem',
                    fontWeight:'700',
                    cursor:'pointer',
                    display:'inline-flex',
                    alignItems:'center',
                    gap:'.3rem',
                  }}
                >
                  <Download size={12}/> Export CSV
                </button>
                <button
                  onClick={onExportBatchSummary}
                  style={{
                    border:'1px solid #bae6fd',
                    background:'#f8fafc',
                    color:'#0f172a',
                    borderRadius:'8px',
                    padding:'.4rem .55rem',
                    fontSize:'.72rem',
                    fontWeight:'700',
                    cursor:'pointer',
                    display:'inline-flex',
                    alignItems:'center',
                    gap:'.3rem',
                  }}
                >
                  <Download size={12}/> Export Ringkasan
                </button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.4rem'}}>
                {[
                  ['Total', mlBatchSummary.total, '#0ea5e9'],
                  ['Sukses', mlBatchSummary.success, '#16a34a'],
                  ['Gagal', mlBatchSummary.failed, '#dc2626'],
                  ['Tinggi', mlBatchSummary.high, '#dc2626'],
                  ['Sedang', mlBatchSummary.medium, '#d97706'],
                  ['Rata2', mlBatchSummary.avgRiskScore, '#0284c7'],
                ].map(([label, value, color]) => (
                  <div key={label} style={{padding:'.45rem .5rem',border:'1px solid #e2e8f0',borderRadius:'8px',background:'#fff'}}>
                    <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.05em',color:'#94a3b8',fontWeight:'700'}}>{label}</div>
                    <div style={{fontSize:'.95rem',fontWeight:'800',color,marginTop:'.1rem'}}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{maxHeight:'220px', overflow:'auto', border:'1px solid #e2e8f0', borderRadius:'10px', background:'#fff'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:'.72rem'}}>
                  <thead>
                    <tr style={{position:'sticky',top:0,background:'#f8fafc',zIndex:1}}>
                      <th style={{textAlign:'left',padding:'.45rem .5rem',borderBottom:'1px solid #e2e8f0'}}>Area</th>
                      <th style={{textAlign:'left',padding:'.45rem .5rem',borderBottom:'1px solid #e2e8f0'}}>Kelas</th>
                      <th style={{textAlign:'right',padding:'.45rem .5rem',borderBottom:'1px solid #e2e8f0'}}>Skor</th>
                      <th style={{textAlign:'right',padding:'.45rem .5rem',borderBottom:'1px solid #e2e8f0'}}>Conf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBatchResults.map((row, index) => (
                      <tr key={`${row.kelurahan}-${index}`} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'.42rem .5rem',color:'#334155',fontWeight:'600'}}>{row.kelurahan || '-'}</td>
                        <td style={{padding:'.42rem .5rem'}}>
                          {row.success ? (
                            <span style={{
                              display:'inline-flex',
                              alignItems:'center',
                              padding:'2px 6px',
                              borderRadius:'999px',
                              fontWeight:'700',
                              fontSize:'.67rem',
                              textTransform:'capitalize',
                              color: row.predicted_class === 'tinggi' ? '#b91c1c' : row.predicted_class === 'sedang' ? '#b45309' : '#166534',
                              background: row.predicted_class === 'tinggi' ? '#fee2e2' : row.predicted_class === 'sedang' ? '#fef3c7' : '#dcfce7',
                            }}>
                              {row.predicted_class}
                            </span>
                          ) : (
                            <span style={{color:'#dc2626',fontWeight:'700'}}>Error</span>
                          )}
                        </td>
                        <td style={{padding:'.42rem .5rem',textAlign:'right',fontWeight:'700',color:'#0f172a'}}>
                          {row.success ? row.risk_score?.toFixed?.(1) ?? row.risk_score : '-'}
                        </td>
                        <td style={{padding:'.42rem .5rem',textAlign:'right',color:'#475569'}}>
                          {row.success ? `${(row.confidence || 0).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}