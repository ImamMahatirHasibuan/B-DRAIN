import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Seeded random function for consistent results
function getSeededRandom(seed, max = 100) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

// Load administrative boundary data
const adminData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'public/data/geojson_kota_bekasi/ADMINISTRASIDESA_AR_25K.geojson'),
    'utf-8'
  )
);

console.log(`Loaded ${adminData.features.length} administrative boundaries`);

// Filter only Bekasi features
const bekasiFeatures = adminData.features.filter(f => 
  f.properties.WADMKK && f.properties.WADMKK.toLowerCase().includes('bekasi')
);

console.log(`Found ${bekasiFeatures.length} Bekasi administrative boundaries`);

// Function to assign risk class based on seeded random
function assignRiskClass(index, offset = 0) {
  const seed = (index + offset) * 137; // prime number for distribution
  const value = getSeededRandom(seed, 100);
  
  // Distribution: ~70% tinggi, ~20% sedang, ~10% rendah
  if (value < 70) return 'tinggi';
  if (value < 90) return 'sedang';
  return 'rendah';
}

// Create flood risk delineation (Banjir Genangan)
const floodRiskData = {
  type: 'FeatureCollection',
  features: bekasiFeatures.map((feature, index) => ({
    ...feature,
    properties: {
      ...feature.properties,
      Kelas: assignRiskClass(index, 0),
      RiskType: 'Banjir Genangan',
      Kelurahan: feature.properties.NAMOBJ,
      Kecamatan: feature.properties.WADMKC,
      Kota: feature.properties.WADMKK
    }
  }))
};

// Create flash flood risk delineation (Banjir Bandang)
const flashFloodRiskData = {
  type: 'FeatureCollection',
  features: bekasiFeatures.map((feature, index) => ({
    ...feature,
    properties: {
      ...feature.properties,
      Kelas: assignRiskClass(index, 1000), // Different offset for variety
      RiskType: 'Banjir Bandang',
      Kelurahan: feature.properties.NAMOBJ,
      Kecamatan: feature.properties.WADMKC,
      Kota: feature.properties.WADMKK
    }
  }))
};

// Save files
fs.writeFileSync(
  path.join(__dirname, 'public/data/delineasi-indeks-risiko-banjir.geojson'),
  JSON.stringify(floodRiskData, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, 'public/data/delineasi-indeks-risiko-banjir-bandang.geojson'),
  JSON.stringify(flashFloodRiskData, null, 2)
);

// Print statistics
const floodStats = {
  tinggi: floodRiskData.features.filter(f => f.properties.Kelas === 'tinggi').length,
  sedang: floodRiskData.features.filter(f => f.properties.Kelas === 'sedang').length,
  rendah: floodRiskData.features.filter(f => f.properties.Kelas === 'rendah').length
};

const flashStats = {
  tinggi: flashFloodRiskData.features.filter(f => f.properties.Kelas === 'tinggi').length,
  sedang: flashFloodRiskData.features.filter(f => f.properties.Kelas === 'sedang').length,
  rendah: flashFloodRiskData.features.filter(f => f.properties.Kelas === 'rendah').length
};

console.log('\n=== Banjir Genangan Statistics ===');
console.log(`Tinggi: ${floodStats.tinggi}`);
console.log(`Sedang: ${floodStats.sedang}`);
console.log(`Rendah: ${floodStats.rendah}`);

console.log('\n=== Banjir Bandang Statistics ===');
console.log(`Tinggi: ${flashStats.tinggi}`);
console.log(`Sedang: ${flashStats.sedang}`);
console.log(`Rendah: ${flashStats.rendah}`);

console.log('\n✓ GeoJSON files created successfully with administrative boundaries!');
