import React from 'react';
import { AlertCircle, Download, Droplets, MapPin, RefreshCw, XCircle } from 'lucide-react';
import {
  ML_VALIDATION_STATUS_UPPER,
  ML_VALIDATION_NOTE,
  ML_ERROR_MESSAGES,
  ML_FEATURE_COLUMNS,
  OFFLINE_ESTIMATE_LABEL,
  formatModelProbabilities,
} from '../utils/mlRiskUtils';

/**
 * Mengembalikan warna teks untuk kelas risiko.
 */
const riskColor = (cls, dark = false) =>
  cls === 'tinggi' ? (dark ? '#f87171' : '#dc2626')
  : cls === 'sedang' ? (dark ? '#fbbf24' : '#d97706')
  : (dark ? '#4ade80' : '#16a34a');

/**
 * Mengembalikan warna latar kartu risiko.
 */
const riskBg = (cls, dark = false) =>
  dark
    ? (cls === 'tinggi' ? 'rgba(220,38,38,0.18)' : cls === 'sedang' ? 'rgba(217,119,6,0.18)' : 'rgba(22,163,74,0.18)')
    : (cls === 'tinggi' ? '#fef2f2' : cls === 'sedang' ? '#fffbeb' : '#f0fdf4');

/**
 * Mengembalikan warna garis tepi kartu risiko.
 */
const riskBorder = (cls, dark = false) =>
  dark
    ? (cls === 'tinggi' ? 'rgba(248,113,113,0.4)' : cls === 'sedang' ? 'rgba(251,191,36,0.4)' : 'rgba(74,222,128,0.4)')
    : (cls === 'tinggi' ? '#fecaca' : cls === 'sedang' ? '#fde68a' : '#bbf7d0');

/**
 * Mengubah kode kelas risiko menjadi label teks Indonesia.
 */
const riskLabel = (cls) => (cls === 'tinggi' ? 'Tinggi' : cls === 'sedang' ? 'Sedang' : '-');

/**
 * Lencana kecil di judul panel yang menampilkan status validasi model.
 */
function ValidationBadge() {
  return (
    <span
      role="note"
      title={ML_VALIDATION_NOTE}
      style={{
        display: 'inline-block',
        marginTop: '.4rem',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '.68rem',
        fontWeight: 700,
        background: '#fffbeb',
        color: '#92400e',
        border: '1px solid #fde68a',
      }}
    >
      {ML_VALIDATION_STATUS_UPPER}
    </span>
  );
}

/**
 * Pemberitahuan di atas hasil klasifikasi.
 * Memisahkan secara tegas antara hasil model backend dan estimasi offline.
 */
function ValidationNotice({ offline }) {
  if (offline) {
    return (
      <div
        role="status"
        style={{
          padding: '.55rem .7rem',
          borderRadius: '8px',
          background: '#fef3c7',
          border: '1.5px solid #f59e0b',
          color: '#92400e',
          fontSize: '.72rem',
          lineHeight: 1.45,
        }}
      >
        <b>{OFFLINE_ESTIMATE_LABEL}.</b> Hasil ini dihitung dengan heuristik lokal di browser saat server API tidak aktif dan tidak berasal dari model Random Forest.
      </div>
    );
  }
  return (
    <div
      role="status"
      style={{
        padding: '.5rem .7rem',
        borderRadius: '8px',
        background: '#fffbeb',
        border: '1px solid #fde68a',
        color: '#92400e',
        fontSize: '.72rem',
        lineHeight: 1.45,
      }}
    >
      <b>{ML_VALIDATION_STATUS_UPPER}.</b> {ML_VALIDATION_NOTE}
    </div>
  );
}

export default function MlAnalysisPanel({
  darkMode = false,
  mlModelInfo,
  mlModelMetadata,
  mlPickMode,
  onTogglePickMode,
  mlPickedPoint,
  mlPickedKelurahan,
  kelurahanList = [],
  onSelectKelurahanByName,
  onClearPickedPoint,
  mlForm,
  onMlFormChange,
  mlStatus,
  mlErrorMessage,
  onAnalyzeSingle,
  mlResult,
  mlDerived,
  mlBatchScope,
  onMlBatchScopeChange,
  mlBatchStatus,
  mlBatchErrorMessage,
  onAnalyzeBatch,
  mlBatchRiskFilter,
  onMlBatchRiskFilterChange,
  mlBatchSortBy,
  onMlBatchSortByChange,
  mlBatchSummary,
  sortedBatchResults,
  filteredKelurahanCount = 0,
  labeledKelurahanCount = 33,
  totalKelurahanCount = 48,
  onExportBatchResultsCsv,
  onExportBatchSummary,
}) {
  const t = darkMode
    ? { cardBg: '#1e293b', secBg: '#0f172a', border: '#334155', text: '#f1f5f9', textSec: '#cbd5e1', muted: '#94a3b8', accent: '#38bdf8' }
    : { cardBg: '#ffffff', secBg: '#f8fafc', border: '#e2e8f0', text: '#0f172a', textSec: '#475569', muted: '#94a3b8', accent: '#0284c7' };

  const inp = {
    width: '100%',
    padding: '.45rem .6rem',
    borderRadius: '8px',
    border: `1px solid ${t.border}`,
    fontSize: '.82rem',
    color: t.text,
    background: t.cardBg,
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color .15s',
  };

  const lbl = {
    fontSize: '.72rem',
    fontWeight: '600',
    color: t.textSec,
    display: 'block',
    marginBottom: '.3rem',
    letterSpacing: '.02em',
    textTransform: 'uppercase',
  };

  const isBackendOnline = Boolean(mlModelInfo && mlModelInfo.status === 'ok');
  const isModelReady = Boolean(mlModelInfo && mlModelInfo.model_loaded && mlModelInfo.inference_ready !== false);
  const isOutsideKotaBekasi = Boolean(mlPickedPoint && !mlPickedKelurahan);
  const canRunSingle = Boolean(mlPickedPoint && mlPickedKelurahan && mlStatus !== 'loading');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ padding: '1rem 1rem .75rem', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '.95rem', color: t.text, display: 'flex', alignItems: 'center', gap: '.5rem', paddingBottom: '.25rem', flexWrap: 'wrap' }}>
            Prediksi Risiko Banjir (Random Forest)
          </div>
          <div style={{ fontSize: '.72rem', color: t.muted, marginTop: '.1rem' }}>
            Unit analisis: 48 Kelurahan di Kota Bekasi (9 fitur spasial & topografi)
          </div>
          <ValidationBadge />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.25rem', flexShrink: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.3rem',
              padding: '3px 9px',
              borderRadius: '99px',
              fontSize: '.67rem',
              fontWeight: '700',
              letterSpacing: '.03em',
              background: isModelReady ? '#f0fdf4' : isBackendOnline ? '#fffbeb' : '#f8fafc',
              color: isModelReady ? '#15803d' : isBackendOnline ? '#92400e' : '#94a3b8',
              border: `1px solid ${isModelReady ? '#bbf7d0' : isBackendOnline ? '#fde68a' : '#e2e8f0'}`,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isModelReady ? '#22c55e' : isBackendOnline ? '#f59e0b' : '#cbd5e1', flexShrink: 0 }} />
            {isModelReady ? 'API & Model Siap' : isBackendOnline ? 'Model Belum Siap' : 'API Offline'}
          </span>
          {isModelReady && (
            <span style={{ fontSize: '.63rem', color: t.muted }}>
              {mlModelInfo?.model_version || mlModelMetadata?.model_version || 'rf-logo-bekasi-v2'} ({mlModelInfo?.training_samples || 33}/48 kel.)
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <details
          style={{
            borderRadius: '9px',
            border: `1px solid ${t.border}`,
            background: t.secBg,
            padding: '.55rem .7rem',
            fontSize: '.71rem',
            color: t.textSec,
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: t.text, fontSize: '.75rem' }}>
            Informasi & Spesifikasi Model Random Forest
          </summary>
          <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.3rem', lineHeight: 1.45 }}>
            <div>
              <b>Algoritma:</b> {mlModelMetadata?.algorithm || 'RandomForestClassifier'} (Pipeline: StandardScaler + RandomForestClassifier)
            </div>
            <div>
              <b>Versi & Konfigurasi:</b> {mlModelMetadata?.model_version || mlModelInfo?.model_version || 'rf-logo-bekasi-v2'} •{' '}
              <code>
                n_estimators={mlModelMetadata?.model_config?.n_estimators ?? 200}, max_depth={mlModelMetadata?.model_config?.max_depth ?? 8}, class_weight={mlModelMetadata?.model_config?.class_weight ?? 'balanced'}, random_state={mlModelMetadata?.model_config?.random_state ?? 42}
              </code>
            </div>
            <div>
              <b>Populasi & Sampel Pelatihan:</b> {mlModelMetadata?.total_kelurahan_kota_bekasi ?? 48} Kelurahan Kota Bekasi (33 berlabel Varian B, 27 Varian A, 15 tanpa titik banjir historis)
            </div>
            <div>
              <b>9 Fitur Input:</b> <code>{(mlModelMetadata?.feature_columns || ML_FEATURE_COLUMNS).join(', ')}</code>
            </div>
            <div>
              <b>Kelas Keluaran:</b> <code>{(mlModelMetadata?.label_classes || ['sedang', 'tinggi']).join(', ')}</code>
            </div>
            <div>
              <b>Evaluasi LOGO (12 Kecamatan):</b> Varian A (n=27): Acc 44.44%, Bal Acc 43.96%, Macro-F1 43.20% (Baseline Acc 40.74%) • Varian B (n=33): Acc 57.58%, Bal Acc 50.19%, Macro-F1 46.53% (Baseline Acc 60.61%)
            </div>
            <div style={{ marginTop: '.2rem', padding: '.4rem .55rem', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
              <b>{ML_VALIDATION_STATUS_UPPER}:</b> {ML_VALIDATION_NOTE}
            </div>
          </div>
        </details>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.55rem' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0ea5e9', color: 'white', fontSize: '.68rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
            <span style={{ fontSize: '.8rem', fontWeight: '700', color: t.text }}>Pilih Lokasi / Kelurahan Kota Bekasi</span>
          </div>

          {kelurahanList.length > 0 && (
            <div style={{ marginBottom: '.5rem' }}>
              <label style={lbl}>Pilih Kelurahan Kota Bekasi (48 Kelurahan)</label>
              <select
                value={mlPickedKelurahan?.kelurahan_id || mlPickedKelurahan?.kelurahan || mlPickedKelurahan?.NAMOBJ || ''}
                onChange={(e) => onSelectKelurahanByName && onSelectKelurahanByName(e.target.value)}
                style={inp}
              >
                <option value="">-- Pilih dari 48 Kelurahan atau klik pada peta --</option>
                {kelurahanList.map((k) => {
                  const optVal = k.kelurahan_id || k.kelurahan;
                  return (
                    <option key={optVal} value={optVal}>
                      {k.kelurahan} — Kec. {k.kecamatan} {k.has_flood_label ? `(${k.n_points} data banjir)` : '(Tanpa titik banjir historis)'}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <button
            onClick={onTogglePickMode}
            style={{
              width: '100%',
              padding: '.55rem .75rem',
              borderRadius: '9px',
              fontSize: '.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all .18s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '.45rem',
              border: mlPickMode ? `1.5px solid ${t.accent}` : `1.5px dashed ${t.border}`,
              background: mlPickMode ? (darkMode ? 'rgba(56,189,248,0.12)' : '#f0f9ff') : (darkMode ? t.secBg : '#fafafa'),
              color: mlPickMode ? t.accent : t.textSec,
            }}
          >
            <MapPin size={14} style={{ flexShrink: 0 }} />
            {mlPickMode ? 'Klik titik di dalam poligon Kota Bekasi…' : 'Tentukan lokasi pada peta'}
          </button>

          {mlPickedPoint ? (
            <div style={{ marginTop: '.45rem', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.4rem .6rem', background: isOutsideKotaBekasi ? '#fef2f2' : '#f0f9ff', borderRadius: '7px', border: `1px solid ${isOutsideKotaBekasi ? '#fecaca' : '#bae6fd'}` }}>
                <MapPin size={11} style={{ color: isOutsideKotaBekasi ? '#dc2626' : '#0284c7', flexShrink: 0 }} />
                <span style={{ fontSize: '.74rem', color: isOutsideKotaBekasi ? '#991b1b' : '#0369a1', fontWeight: '600', flex: 1 }}>
                  {mlPickedPoint.lat.toFixed(5)}, {mlPickedPoint.lng.toFixed(5)}
                </span>
                <button
                  onClick={onClearPickedPoint}
                  style={{ background: 'none', border: 'none', padding: '1px 3px', cursor: 'pointer', color: '#94a3b8', fontSize: '.8rem', lineHeight: 1, borderRadius: '4px' }}
                >
                  ✕
                </button>
              </div>

              {mlPickedKelurahan ? (
                <div style={{ padding: '.5rem .65rem', background: t.secBg, borderRadius: '8px', border: `1px solid ${t.border}`, fontSize: '.71rem', color: t.textSec, lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, color: t.text, marginBottom: '.2rem', display: 'flex', justifyContent: 'space-between', gap: '.4rem', flexWrap: 'wrap' }}>
                    <span>Kelurahan {mlPickedKelurahan.kelurahan || mlPickedKelurahan.NAMOBJ} (Kec. {mlPickedKelurahan.kecamatan || mlPickedKelurahan.WADMKC})</span>
                    {mlPickedKelurahan.kelurahan_id && (
                      <code style={{ fontSize: '.64rem', color: t.muted }}>{mlPickedKelurahan.kelurahan_id}</code>
                    )}
                  </div>
                  <div>
                    Status Data Historis: <b>{mlPickedKelurahan.has_flood_label ? `Berlabel (${mlPickedKelurahan.n_points || 0} kejadian)` : 'Tanpa Titik Banjir Historis (Tidak Berlabel)'}</b>
                  </div>
                  {!mlPickedKelurahan.has_flood_label && (
                    <div style={{ marginTop: '.25rem', padding: '.35rem .5rem', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '.68rem' }}>
                      Kelurahan ini termasuk 15 kelurahan tanpa catatan titik banjir historis. Hasil prediksi merupakan penerapan model pada wilayah belum berlabel, bukan kebenaran lapangan yang tervalidasi.
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.2rem .5rem', marginTop: '.3rem', fontSize: '.68rem' }}>
                    <span>Luas: <b>{((mlPickedKelurahan.features?.shape_area || mlPickedKelurahan.shape_area || 0) / 1e6).toFixed(2)} km²</b></span>
                    <span>Jarak Sungai: <b>{Number(mlPickedKelurahan.features?.dist_to_river ?? mlPickedKelurahan.dist_to_river ?? 0).toFixed(0)} m</b></span>
                    <span>Permukiman: <b>{((mlPickedKelurahan.features?.pct_pemukiman ?? mlPickedKelurahan.pct_pemukiman ?? 0) * 100).toFixed(1)}%</b></span>
                    <span>Sawah: <b>{((mlPickedKelurahan.features?.pct_sawah ?? mlPickedKelurahan.pct_sawah ?? 0) * 100).toFixed(1)}%</b></span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '.5rem .65rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '.72rem', color: '#991b1b', lineHeight: 1.4 }}>
                  <b>Perlu Diperiksa — Di Luar 48 Kelurahan Kota Bekasi.</b> Titik yang dipilih berada di luar batas administratif 48 kelurahan Kota Bekasi sehingga tidak memiliki fitur kelurahan untuk diprediksi oleh model.
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '.4rem', textAlign: 'center', fontSize: '.72rem', color: '#cbd5e1' }}>— belum dipilih —</div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.55rem' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0ea5e9', color: 'white', fontSize: '.68rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
            <span style={{ fontSize: '.8rem', fontWeight: '700', color: t.text }}>Parameter Elevasi Kelurahan</span>
          </div>

          <div style={{ marginBottom: '.2rem' }}>
            <label style={lbl}>
              Elevasi Rata-Rata (`elev_mean`){' '}
              <span style={{ color: t.muted, fontWeight: '400', textTransform: 'none' }}>(m dpl, otomatis dari kelurahan terpilih)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min={0}
                max={500}
                step={0.5}
                value={mlForm.elev_mean}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onMlFormChange({ elev_mean: Number.isFinite(val) ? val : 0 });
                }}
                style={inp}
                placeholder="0"
              />
              <span style={{ position: 'absolute', right: '.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '.72rem', color: '#94a3b8', pointerEvents: 'none' }}>meter</span>
            </div>
            <div style={{ fontSize: '.66rem', color: t.muted, marginTop: '.25rem' }}>
              8 fitur kelurahan lainnya (`shape_area`, `shape_leng`, `compactness`, `elev_min`, `sungai_density`, `dist_to_river`, `pct_pemukiman`, `pct_sawah`) diambil langsung dari data spasial kelurahan terpilih.
            </div>
          </div>
        </div>

        <button
          onClick={() => { if (canRunSingle) onAnalyzeSingle(); }}
          disabled={!canRunSingle}
          style={{
            width: '100%',
            padding: '.62rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '.85rem',
            fontWeight: '700',
            cursor: !canRunSingle ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '.5rem',
            transition: 'background .15s',
            letterSpacing: '.01em',
            background: !canRunSingle ? '#e2e8f0' : '#0284c7',
            color: !canRunSingle ? '#94a3b8' : 'white',
          }}
        >
          {mlStatus === 'loading'
            ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Menganalisis…</>
            : <><Droplets size={14} /> Analisis Risiko Kelurahan</>}
        </button>

        {mlStatus === 'no-api' && (
          <div style={{ padding: '.6rem .75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '.76rem', color: '#92400e', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                <b>{ML_ERROR_MESSAGES.SERVICE_UNAVAILABLE}</b> Pastikan server backend Flask aktif (<code style={{ background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>python ml/api.py</code>) lalu coba kembali.
              </span>
            </div>
          </div>
        )}

        {mlStatus === 'error' && (
          <div style={{ padding: '.6rem .75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '.76rem', color: '#991b1b', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <XCircle size={13} style={{ flexShrink: 0 }} />
            <span>{mlErrorMessage || ML_ERROR_MESSAGES.PREDICTION_FAILED}</span>
          </div>
        )}

        {mlStatus === 'done' && mlResult && mlDerived && (() => {
          const cls = mlResult.predicted_class;
          const isOffline = Boolean(mlResult.is_offline || mlResult.model_version === 'offline-demo-v1');
          const formattedProbs = formatModelProbabilities(mlResult.probabilities);
          const probRows = [
            { riskClass: 'sedang', pctText: formattedProbs.sedangPct, probVal: formattedProbs.sedangProb },
            { riskClass: 'tinggi', pctText: formattedProbs.tinggiPct, probVal: formattedProbs.tinggiProb },
          ];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem', animation: 'slideUp .25s ease' }}>
              <ValidationNotice offline={isOffline} />
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${riskBorder(cls, darkMode)}` }}>
                <div style={{ padding: '.65rem 1rem', background: riskBg(cls, darkMode), display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.68rem', fontWeight: '700', color: t.textSec, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.15rem' }}>
                      {isOffline ? OFFLINE_ESTIMATE_LABEL : `Prediksi Random Forest (${mlResult.kelurahan_name || mlResult.kelurahan || mlPickedKelurahan?.kelurahan || 'Kelurahan'})`}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: riskColor(cls, darkMode), lineHeight: 1 }}>{riskLabel(cls)}</div>
                    {(mlResult.kelurahan_id || mlPickedKelurahan?.kelurahan_id) && (
                      <div style={{ fontSize: '.65rem', color: t.muted, marginTop: '.2rem' }}>
                        ID: <code>{mlResult.kelurahan_id || mlPickedKelurahan?.kelurahan_id}</code>
                      </div>
                    )}
                  </div>
                  <div
                    title="Indeks turunan berbobot linear: 60×P(sedang) + 100×P(tinggi). Bukan probabilitas atau ukuran risiko aktual."
                    style={{ textAlign: 'center', padding: '.4rem .7rem', background: t.cardBg, borderRadius: '9px', border: `1px solid ${riskBorder(cls, darkMode)}` }}
                  >
                    <div style={{ fontSize: '.58rem', color: t.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: '.1rem' }}>Indeks Turunan</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '700', color: riskColor(cls, darkMode), lineHeight: 1 }}>{mlResult.risk_score}</div>
                    <div style={{ fontSize: '.68rem', color: t.muted, fontWeight: '600' }}>/ 100</div>
                  </div>
                </div>
                <div style={{ padding: '.65rem 1rem', background: t.cardBg, borderTop: `1px solid ${riskBorder(cls, darkMode)}` }}>
                  <div style={{ fontSize: '.68rem', fontWeight: '700', color: t.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.45rem' }}>
                    Probabilitas keluaran model
                  </div>
                  {probRows.map(({ riskClass, pctText, probVal }) => (
                    <div key={riskClass} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                      <span style={{ width: '48px', fontSize: '.7rem', color: t.textSec, textTransform: 'capitalize', flexShrink: 0 }}>{riskClass}</span>
                      <div style={{ flex: 1, height: '5px', background: darkMode ? '#334155' : '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(probVal * 100).toFixed(0)}%`, background: riskColor(riskClass, darkMode), borderRadius: '99px', transition: 'width .6s ease' }} />
                      </div>
                      <span style={{ width: '40px', fontSize: '.7rem', fontWeight: '700', color: riskColor(riskClass, darkMode), textAlign: 'right', flexShrink: 0 }}>{pctText}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                {mlDerived.hospital && (
                  <div style={{ padding: '.6rem .65rem', background: t.cardBg, borderRadius: '10px', border: `1px solid ${t.border}`, minWidth: 0 }}>
                    <div style={{ fontSize: '.65rem', fontWeight: '700', color: t.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.3rem' }}>RS Terdekat</div>
                    <div style={{ fontSize: '.76rem', fontWeight: '700', color: t.text, marginBottom: '.15rem', lineHeight: '1.3', overflowWrap: 'anywhere' }}>{mlDerived.hospital.name}</div>
                    <div style={{ fontSize: '.75rem', fontWeight: '700', color: t.accent }}>{mlDerived.hospital.dist.toFixed(2)} km</div>
                  </div>
                )}
                <div style={{ padding: '.6rem .65rem', background: t.cardBg, borderRadius: '10px', border: `1px solid ${t.border}`, minWidth: 0 }}>
                  <div style={{ fontSize: '.65rem', fontWeight: '700', color: t.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.3rem' }}>Estimasi Surut</div>
                  <div style={{ fontSize: '.75rem', fontWeight: '700', color: t.text, lineHeight: '1.35' }}>{mlDerived.duration}</div>
                </div>
              </div>

              <div style={{ padding: '.65rem .75rem', borderRadius: '10px', background: riskBg(cls, darkMode), border: `1px solid ${riskBorder(cls, darkMode)}` }}>
                <div style={{ fontSize: '.72rem', fontWeight: '700', color: riskColor(cls, darkMode), marginBottom: '.3rem', letterSpacing: '.02em' }}>{mlDerived.advice.urgency}</div>
                <div style={{ fontSize: '.74rem', color: t.textSec, lineHeight: '1.5' }}>{mlDerived.advice.text}</div>
              </div>
            </div>
          );
        })()}

        <div style={{ marginTop: '.3rem', paddingTop: '.8rem', borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0ea5e9', color: 'white', fontSize: '.68rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
            <span style={{ fontSize: '.8rem', fontWeight: '700', color: t.text }}>Batch Prediksi Per Kelurahan Kota Bekasi</span>
          </div>
          <div style={{ fontSize: '.68rem', color: t.muted, marginBottom: '.55rem' }}>
            Setiap kelurahan diprediksi menggunakan 9 fitur spasial & topografi aktualnya masing-masing.
          </div>

          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.55rem' }}>
            <select
              value={mlBatchScope}
              onChange={(e) => onMlBatchScopeChange(e.target.value)}
              style={{
                flex: 1,
                padding: '.48rem .6rem',
                borderRadius: '8px',
                border: `1px solid ${t.border}`,
                fontSize: '.76rem',
                color: t.text,
                background: t.cardBg,
              }}
            >
              <option value="all">Semua Kelurahan Kota Bekasi ({totalKelurahanCount})</option>
              <option value="labeled">Kelurahan Berlabel Banjir ({labeledKelurahanCount})</option>
              <option value="filtered">Kelurahan Terfilter ({filteredKelurahanCount})</option>
            </select>
            <button
              onClick={() => { if (mlBatchStatus !== 'loading') onAnalyzeBatch(); }}
              disabled={mlBatchStatus === 'loading'}
              style={{
                padding: '.48rem .75rem',
                borderRadius: '8px',
                border: 'none',
                background: mlBatchStatus === 'loading' ? '#e2e8f0' : '#0284c7',
                color: mlBatchStatus === 'loading' ? '#94a3b8' : '#fff',
                fontSize: '.76rem',
                fontWeight: '700',
                cursor: mlBatchStatus === 'loading' ? 'not-allowed' : 'pointer',
                minWidth: '105px',
              }}
            >
              {mlBatchStatus === 'loading' ? 'Proses...' : 'Run Batch'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.45rem', marginBottom: '.55rem' }}>
            <select
              value={mlBatchRiskFilter}
              onChange={(e) => onMlBatchRiskFilterChange(e.target.value)}
              style={{
                padding: '.46rem .55rem',
                borderRadius: '8px',
                border: `1px solid ${t.border}`,
                fontSize: '.74rem',
                color: t.text,
                background: t.cardBg,
              }}
            >
              <option value="all">Semua Kelas</option>
              <option value="tinggi">Risiko Tinggi</option>
              <option value="sedang">Risiko Sedang</option>
            </select>
            <select
              value={mlBatchSortBy}
              onChange={(e) => onMlBatchSortByChange(e.target.value)}
              style={{
                padding: '.46rem .55rem',
                borderRadius: '8px',
                border: `1px solid ${t.border}`,
                fontSize: '.74rem',
                color: t.text,
                background: t.cardBg,
              }}
            >
              <option value="priority">Sort: Prioritas</option>
              <option value="risk_score">Sort: Risk Score</option>
              <option value="confidence">Sort: Confidence</option>
              <option value="jumlah_titik">Sort: Jumlah Titik</option>
            </select>
          </div>

          {mlBatchStatus === 'error' && (
            <div style={{ padding: '.55rem .65rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '.74rem', color: '#991b1b' }}>
              {mlBatchErrorMessage || ML_ERROR_MESSAGES.PREDICTION_FAILED}
            </div>
          )}

          {mlBatchStatus === 'no-api' && (
            <div style={{ padding: '.55rem .65rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '.74rem', color: '#92400e' }}>
              <b>{ML_ERROR_MESSAGES.SERVICE_UNAVAILABLE}</b> Jalankan API backend lalu ulangi batch.
            </div>
          )}

          {mlBatchStatus === 'done' && mlBatchSummary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              <ValidationNotice offline={false} />
              <div style={{ display: 'flex', gap: '.45rem' }}>
                <button
                  onClick={onExportBatchResultsCsv}
                  style={{
                    border: '1px solid #bae6fd',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    borderRadius: '8px',
                    padding: '.4rem .55rem',
                    fontSize: '.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.3rem',
                  }}
                >
                  <Download size={12} /> Export CSV
                </button>
                <button
                  onClick={onExportBatchSummary}
                  style={{
                    border: '1px solid #bae6fd',
                    background: '#f8fafc',
                    color: '#0f172a',
                    borderRadius: '8px',
                    padding: '.4rem .55rem',
                    fontSize: '.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.3rem',
                  }}
                >
                  <Download size={12} /> Export Ringkasan
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.4rem' }}>
                {[
                  ['Total Kel.', mlBatchSummary.total, '#0ea5e9'],
                  ['Sukses', mlBatchSummary.success, '#16a34a'],
                  ['Gagal/Kurang', mlBatchSummary.failed, '#dc2626'],
                  ['Tinggi', mlBatchSummary.high, '#dc2626'],
                  ['Sedang', mlBatchSummary.medium, '#d97706'],
                  ['Rata2 Skor', mlBatchSummary.avgRiskScore, '#0284c7'],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ padding: '.45rem .5rem', border: `1px solid ${t.border}`, borderRadius: '8px', background: t.cardBg }}>
                    <div style={{ fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.05em', color: '#94a3b8', fontWeight: '700' }}>{label}</div>
                    <div style={{ fontSize: '.95rem', fontWeight: '800', color, marginTop: '.1rem' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ maxHeight: '240px', overflow: 'auto', border: `1px solid ${t.border}`, borderRadius: '10px', background: t.cardBg }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.71rem' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: t.secBg, zIndex: 1 }}>
                      <th style={{ textAlign: 'left', padding: '.45rem .5rem', borderBottom: `1px solid ${t.border}`, color: t.text }}>Kelurahan</th>
                      <th style={{ textAlign: 'left', padding: '.45rem .5rem', borderBottom: `1px solid ${t.border}`, color: t.text }}>Kelas</th>
                      <th style={{ textAlign: 'right', padding: '.45rem .5rem', borderBottom: `1px solid ${t.border}`, color: t.text }}>Prob (S/T)</th>
                      <th style={{ textAlign: 'right', padding: '.45rem .5rem', borderBottom: `1px solid ${t.border}`, color: t.text }}>Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBatchResults.map((row, index) => {
                      const probs = formatModelProbabilities(row.probabilities);
                      return (
                        <tr key={`${row.kelurahan_id || row.kelurahan}-${index}`} style={{ borderBottom: `1px solid ${t.border}` }}>
                          <td style={{ padding: '.42rem .5rem', color: t.text, fontWeight: '600' }}>
                            <div>{row.kelurahan || '-'}</div>
                            <div style={{ fontSize: '.63rem', color: t.muted, fontWeight: 400 }}>
                              Kec. {row.kecamatan || '-'} {!row.has_flood_label ? '• Tanpa label historis' : `• ${row.jumlah_titik || 0} titik`}
                            </div>
                          </td>
                          <td style={{ padding: '.42rem .5rem' }}>
                            {row.success ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 6px',
                                borderRadius: '999px',
                                fontWeight: '700',
                                fontSize: '.67rem',
                                textTransform: 'capitalize',
                                color: row.predicted_class === 'tinggi' ? '#b91c1c' : '#b45309',
                                background: row.predicted_class === 'tinggi' ? '#fee2e2' : '#fef3c7',
                              }}>
                                {row.predicted_class}
                              </span>
                            ) : (
                              <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '.66rem' }} title={row.error}>
                                {row.error || ML_ERROR_MESSAGES.INCOMPLETE_FEATURES}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '.42rem .5rem', textAlign: 'right', fontSize: '.66rem', color: t.textSec }}>
                            {row.success ? `${probs.sedangPct}% / ${probs.tinggiPct}%` : '-'}
                          </td>
                          <td style={{ padding: '.42rem .5rem', textAlign: 'right', fontWeight: '700', color: t.text }}>
                            {row.success ? row.risk_score?.toFixed?.(1) ?? row.risk_score : '-'}
                          </td>
                        </tr>
                      );
                    })}
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
