import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`File tidak ditemukan. Coba salah satu path: ${candidates.join(', ')}`);
}

const adminGeoJsonPath = resolveExistingPath([
  path.join(__dirname, 'public/data/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson'),
  path.join(__dirname, 'ml/topo/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson'),
]);

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

const severityRank = {
  low: 1,
  medium: 2,
  high: 3,
};

const rankToSeverity = {
  1: 'low',
  2: 'medium',
  3: 'high',
};

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

  if (!kecamatan) {
    return;
  }

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
function severityToRiskClass(severity) {
  const map = {
    'high': 'tinggi',
    'medium': 'sedang',
    'low': 'rendah'
  };
  return map[severity] || 'sedang'; // default to sedang if unknown
}

// Create flood risk delineation (Banjir Genangan)
const floodRiskData = {
  type: 'FeatureCollection',
  features: bekasiFeatures.map((feature) => {
    const kecamatan = normalizeKecamatan(feature?.properties?.WADMKC);
    const severity = severityByKecamatan[kecamatan] || 'low';
    return {
      ...feature,
      properties: {
        ...feature.properties,
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
fs.writeFileSync(
  path.join(__dirname, 'public/data/flood-risk-genangan.geojson'),
  JSON.stringify(floodRiskData, null, 2)
);

// Print statistics
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
