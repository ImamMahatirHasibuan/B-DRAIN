/**
 * Skrip generator layer risiko banjir genangan berbasis batas administrasi desa/kelurahan.
 *
 * Input:
 * - Batas administrasi desa: public/data/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson
 *   atau ml/topo/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson (dipilih yang pertama ditemukan).
 * - Data banjir historis: public/data/data_banjir.geojson atau ml/data_banjir.geojson
 *   (dipilih yang pertama ditemukan). Field yang dibaca: properties.kecamatan dan properties.severity.
 *
 * Alur proses:
 * 1. Memastikan berkas input tersedia.
 * 2. Memfilter fitur batas administrasi dengan WADMKK yang mengandung kata "bekasi".
 * 3. Membuat peta severity tertinggi per kecamatan dari data banjir (kunci dinormalisasi: huruf besar, tanpa spasi).
 * 4. Menetapkan Kelas risiko per fitur: high menjadi "tinggi", medium menjadi "sedang", low atau tidak ada data menjadi "rendah".
 * 5. Menulis hasil ke public/data/flood-risk-genangan.geojson (FeatureCollection, indentasi 2 spasi).
 *
 * Output: public/data/flood-risk-genangan.geojson. Berkas ini juga dihasilkan oleh generate-geojson.js,
 * sehingga menjalankan salah satu skrip akan menimpa hasil skrip lainnya.
 *
 * Cara menjalankan: node generate-admin-risk-geojson.js (dari root proyek).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Path absolut berkas skrip ini dan folder root proyek (ESM tidak memiliki __dirname bawaan).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mengembalikan path pertama dari daftar kandidat yang benar-benar ada di disk.
 *
 * @param {string[]} candidates - Daftar path kandidat, diprioritaskan dari awal.
 * @returns {string} Path pertama yang ditemukan.
 * @throws {Error} Jika tidak ada satu pun kandidat yang ditemukan.
 */
function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`File tidak ditemukan. Coba salah satu path: ${candidates.join(', ')}`);
}

// Kandidat path batas administrasi desa. Catatan: kandidat pertama mengarah ke
// public/data/geojson_kota_bekasi/ tanpa subfolder kedua, sedangkan berkas sebenarnya berada
// di public/data/geojson_kota_bekasi/geojson_kota_bekasi/. Kandidat kedua (ml/topo) yang berlaku saat ini.
const adminGeoJsonPath = resolveExistingPath([
  path.join(__dirname, 'public/data/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson'),
  path.join(__dirname, 'ml/topo/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson'),
]);

// Kandidat path data banjir historis.
const banjirGeoJsonPath = resolveExistingPath([
  path.join(__dirname, 'public/data/data_banjir.geojson'),
  path.join(__dirname, 'ml/data_banjir.geojson'),
]);

// Load administrative boundary data
const adminData = JSON.parse(
  fs.readFileSync(
    adminGeoJsonPath,
    'utf-8'
  )
);

console.log(`Loaded ${adminData.features.length} administrative boundaries`);

// Filter only Bekasi features
const bekasiFeatures = adminData.features.filter(f => 
  f.properties.WADMKK && f.properties.WADMKK.toLowerCase().includes('bekasi')
);

console.log(`Found ${bekasiFeatures.length} Bekasi administrative boundaries`);

// Load historical flood data to map severity by kecamatan
const banjirData = JSON.parse(
  fs.readFileSync(
    banjirGeoJsonPath,
    'utf-8'
  )
);

// Pemetaan severity ke peringkat numerik untuk membandingkan tingkat keparahan.
const severityRank = {
  low: 1,
  medium: 2,
  high: 3,
};

// Kebalikan dari severityRank: peringkat numerik kembali ke label severity.
const rankToSeverity = {
  1: 'low',
  2: 'medium',
  3: 'high',
};

/**
 * Menormalkan nama kecamatan agar pencocokan tidak sensitif terhadap huruf besar/kecil dan spasi.
 *
 * @param {*} value - Nama kecamatan mentah.
 * @returns {string} Nama dalam huruf besar tanpa spasi. Mengembalikan string kosong jika nilai kosong.
 */
function normalizeKecamatan(value) {
  return String(value || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '');
}

// Create severity mapping by kecamatan using the highest historical severity
// so the result matches the training notebook aggregation logic.
const severityByKecamatan = {};
banjirData.features.forEach(feature => {
  const rawKecamatan = feature?.properties?.kecamatan;
  const kecamatan = normalizeKecamatan(rawKecamatan);
  const severity = String(feature?.properties?.severity || 'low').toLowerCase();

  // Lewati fitur tanpa nama kecamatan.
  if (!kecamatan) {
    return;
  }

  // Simpan severity tertinggi yang pernah tercatat untuk setiap kecamatan.
  const currentRank = severityRank[severity] || severityRank.low;
  const existingRank = severityByKecamatan[kecamatan]
    ? severityRank[severityByKecamatan[kecamatan]] || severityRank.low
    : 0;

  if (!severityByKecamatan[kecamatan] || currentRank > existingRank) {
    severityByKecamatan[kecamatan] = rankToSeverity[currentRank] || 'low';
  }
});

console.log(`Loaded severity data for ${Object.keys(severityByKecamatan).length} kecamatan`);

// Convert severity to risk class
/**
 * Mengonversi label severity menjadi kelas risiko berbahasa Indonesia.
 *
 * @param {string} severity - Label severity: "high", "medium", atau "low".
 * @returns {string} "tinggi", "sedang", atau "rendah". Nilai tidak dikenal menjadi "sedang".
 */
function severityToRiskClass(severity) {
  const map = {
    'high': 'tinggi',
    'medium': 'sedang',
    'low': 'rendah'
  };
  return map[severity] || 'sedang'; // default to sedang if unknown
}

// Create flood risk delineation (Banjir Genangan)
// Setiap fitur batas administrasi diberi kelas risiko dari severity kecamatannya,
// lalu properti asli dipertahankan dan ditambah field baru.
const floodRiskData = {
  type: 'FeatureCollection',
  features: bekasiFeatures.map((feature) => {
    const kecamatan = normalizeKecamatan(feature?.properties?.WADMKC);
    const severity = severityByKecamatan[kecamatan] || 'low';
    return {
      ...feature,
      properties: {
        ...feature.properties,
        // Field baru: Kelas (tinggi/sedang/rendah), Severity, RiskType, serta nama kelurahan, kecamatan, dan kota.
        Kelas: severityToRiskClass(severity),
        Severity: severity,
        RiskType: 'Banjir Genangan',
        Kelurahan: feature.properties.NAMOBJ,
        Kecamatan: feature.properties.WADMKC,
        Kota: feature.properties.WADMKK
      }
    };
  })
};


// Save the generated flood-risk layer
// Menulis hasil ke public/data/flood-risk-genangan.geojson dengan indentasi 2 spasi.
fs.writeFileSync(
  path.join(__dirname, 'public/data/flood-risk-genangan.geojson'),
  JSON.stringify(floodRiskData, null, 2)
);

// Print statistics
// Menghitung jumlah fitur per kelas risiko untuk ditampilkan di konsol.
const floodStats = {
  tinggi: floodRiskData.features.filter(f => f.properties.Kelas === 'tinggi').length,
  sedang: floodRiskData.features.filter(f => f.properties.Kelas === 'sedang').length,
  rendah: floodRiskData.features.filter(f => f.properties.Kelas === 'rendah').length
};

console.log('\n=== Banjir Genangan Statistics ===');
console.log(`Tinggi: ${floodStats.tinggi}`);
console.log(`Sedang: ${floodStats.sedang}`);
console.log(`Rendah: ${floodStats.rendah}`);

console.log('\n✓ GeoJSON files created successfully with administrative boundaries!');
