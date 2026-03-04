#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV semicolon-separated values
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(';');
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx];
    });
    records.push(record);
  }
  
  return records;
}

// Deterministic pseudo-random using modulo arithmetic - guaranteed to be in [0, 1)
function getSeededRandom(index, prime) {
  return ((index * prime) % 10007) / 10007;
}

// Generate random coordinates in Kota Bekasi area with deterministic positioning
// Bekasi: latitude (-6.4 to -6.2), longitude (106.9 to 107.2)
function generateRandomCoord(index, offsetLat = 0, offsetLon = 0) {
  // Two independent pseudo-random values
  const rand1 = getSeededRandom(index, 37);
  const rand2 = getSeededRandom(index, 73);
  
  // Position within Bekasi bounds + offset
  const lat = -6.4 + rand1 * 0.2 + offsetLat;  // -6.4 to -6.2, then add offset
  const lon = 106.9 + rand2 * 0.3 + offsetLon; // 106.9 to 107.2, then add offset
  return [lon, lat];
}

// Create a small polygon (square) around a center point
// Size based on shape area (already in square degrees)
function createPolygon(centerCoord, areaMultiplier) {
  const [lon, lat] = centerCoord;
  // Scale: area is in square degrees, so offset = sqrt(area)
  // Use 0.5 as multiplier to make reasonable-sized polygons
  const offset = Math.sqrt(areaMultiplier) * 0.5;
  
  return [
    [lon - offset, lat - offset],
    [lon + offset, lat - offset],
    [lon + offset, lat + offset],
    [lon - offset, lat + offset],
    [lon - offset, lat - offset] // Close the polygon
  ];
}

// Create GeoJSON Feature Collection
function createGeoJSON(records, filename, offsetLat = 0, offsetLon = 0) {
  const features = records.map((record, idx) => {
    const fid = parseInt(record.FID);
    const kelas = record.Kelas;
    const shapeArea = parseFloat(record.Shape_Area);
    
    // Generate synthetic coordinates and polygon using index for consistency
    const center = generateRandomCoord(idx, offsetLat, offsetLon);
    const polygon = createPolygon(center, shapeArea);  // Use shape area directly, no multiplier
    
    return {
      type: "Feature",
      id: fid,
      properties: {
        FID: fid,
        Kelas: kelas,
        Shape_Area: shapeArea,
        Metadata: "BPBD Provinsi Jawa Barat",
        Catatan: record.Catatan || "BPBD Provinsi Jawa Barat"
      },
      geometry: {
        type: "Polygon",
        coordinates: [polygon]
      }
    };
  });
  
  const geojson = {
    type: "FeatureCollection",
    features: features
  };
  
  return geojson;
}

// Main execution
async function main() {
  try {
    const projectPath = path.resolve(__dirname);
    
    // Read both CSV files
    const csv1Path = path.join(projectPath, 'public/data/delineasi-indeks-risiko-banjir.csv');
    const csv2Path = path.join(projectPath, 'public/data/delineasi-indeks-risiko-banjir-bandang.csv');
    
    const csv1Text = fs.readFileSync(csv1Path, 'utf-8');
    const csv2Text = fs.readFileSync(csv2Path, 'utf-8');
    
    console.log('✓ CSV files read successfully');
    
    // Parse CSVs
    const records1 = parseCSV(csv1Text);
    const records2 = parseCSV(csv2Text);
    
    console.log(`✓ Parsed ${records1.length} records from delineasi-indeks-risiko-banjir.csv`);
    console.log(`✓ Parsed ${records2.length} records from delineasi-indeks-risiko-banjir-bandang.csv`);
    
    // Generate GeoJSONs
    // Flood risk at normal position
    const geojson1 = createGeoJSON(records1, 'flood', 0, 0);
    // Flash flood risk offset significantly east and south to make layers clearly separate
    const geojson2 = createGeoJSON(records2, 'flashflood', -0.08, 0.1);
    
    // Write GeoJSON files
    const output1Path = path.join(projectPath, 'public/data/delineasi-indeks-risiko-banjir.geojson');
    const output2Path = path.join(projectPath, 'public/data/delineasi-indeks-risiko-banjir-bandang.geojson');
    
    fs.writeFileSync(output1Path, JSON.stringify(geojson1, null, 2));
    fs.writeFileSync(output2Path, JSON.stringify(geojson2, null, 2));
    
    console.log(`\n✓ Generated ${output1Path}`);
    console.log(`✓ Generated ${output2Path}`);
    
    console.log('\n✅ GeoJSON generation complete!');
    console.log(`\nFiles created:`);
    console.log(`  - delineasi-indeks-risiko-banjir.geojson (${geojson1.features.length} features)`);
    console.log(`  - delineasi-indeks-risiko-banjir-bandang.geojson (${geojson2.features.length} features)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
