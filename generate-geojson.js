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

// Generate deterministic coordinates in Kota Bekasi area.
// The layout follows a simple grid so repeated runs always produce the same result.
function generateDeterministicCoord(index, offsetLat = 0, offsetLon = 0) {
  const columns = 10;
  const row = Math.floor(index / columns);
  const col = index % columns;

  const lat = -6.4 + row * 0.015 + col * 0.002 + offsetLat;
  const lon = 106.9 + col * 0.025 + row * 0.003 + offsetLon;
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
    const center = generateDeterministicCoord(idx, offsetLat, offsetLon);
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
    
    // Read source CSV for the generated flood-risk GeoJSON
    const csvName = ['delineasi', 'indeks', 'risiko', 'banjir.csv'].join('-');
    const csv1Path = path.join(projectPath, 'public/data', csvName);
    const csv1Text = fs.readFileSync(csv1Path, 'utf-8');
    console.log('✓ CSV file read successfully');
    // Parse CSV
    const records1 = parseCSV(csv1Text);
    console.log(`✓ Parsed ${records1.length} flood-risk records from source CSV`);
    
    // Generate GeoJSONs
    // Flood risk at normal position
    const geojson1 = createGeoJSON(records1, 'flood', 0, 0);
    // Write the generated GeoJSON file
    const output1Path = path.join(projectPath, 'public/data/flood-risk-genangan.geojson');
    fs.writeFileSync(output1Path, JSON.stringify(geojson1, null, 2));
    console.log(`\n✓ Generated ${output1Path}`);
    console.log('\n✅ GeoJSON generation complete!');
    console.log(`\nFiles created:`);
    console.log(`  - flood-risk-genangan.geojson (${geojson1.features.length} features)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
