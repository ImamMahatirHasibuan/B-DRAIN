#!/usr/bin/env node

/**
 * Skrip generator GeoJSON risiko banjir genangan dari data CSV BPBD Provinsi Jawa Barat.
 *
 * Input:
 * - public/data/delineasi-indeks-risiko-banjir.csv (pemisah titik koma ";", baris pertama adalah header).
 *   Kolom yang dibaca: FID, Kelas, Shape_Area, dan Catatan (opsional).
 *
 * Alur proses:
 * 1. Membaca dan mengurai CSV menjadi array record.
 * 2. Membuat koordinat sintetis untuk setiap record dengan pola grid deterministik.
 * 3. Membuat poligon persegi kecil di sekitar koordinat tersebut.
 * 4. Menyusun FeatureCollection dan menulisnya ke public/data/flood-risk-genangan.geojson.
 *
 * Output: public/data/flood-risk-genangan.geojson (indentasi 2 spasi). Berkas ini juga dihasilkan
 * oleh generate-admin-risk-geojson.js, sehingga menjalankan salah satu skrip akan menimpa hasil skrip lainnya.
 * Koordinat pada output bersifat sintetis dan tidak berasal dari geometri sumber.
 *
 * Cara menjalankan: node generate-geojson.js (dari root proyek).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Path absolut berkas skrip ini dan folder root proyek (ESM tidak memiliki __dirname bawaan).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV semicolon-separated values
/**
 * Mengurai teks CSV dengan pemisah titik koma menjadi array objek.
 * Kunci setiap objek diambil dari baris header. Nilai yang tidak ada diisi undefined.
 * Pemisahan baris memakai /\r?\n/ agar akhir baris CRLF tidak menyisakan karakter "\r" di nama kolom atau nilai terakhir.
 *
 * @param {string} csvText - Isi berkas CSV mentah.
 * @returns {Array<Object<string, string>>} Daftar record, satu objek per baris data.
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
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
/**
 * Membuat koordinat sintetis di area Kota Bekasi berdasarkan indeks record.
 * Susunan grid berisi 10 kolom. Hasil selalu sama untuk indeks yang sama.
 *
 * @param {number} index - Indeks record (dimulai dari 0).
 * @param {number} [offsetLat=0] - Pergeseran tambahan pada lintang.
 * @param {number} [offsetLon=0] - Pergeseran tambahan pada bujur.
 * @returns {[number, number]} Pasangan [bujur, lintang] sesuai urutan GeoJSON.
 */
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
/**
 * Membuat poligon persegi kecil yang berpusat pada koordinat tertentu.
 * Setengah sisi persegi dihitung dari akar kuadrat luas dikali 0.5.
 * Poligon ditutup dengan mengulang titik pertama di akhir.
 *
 * @param {[number, number]} centerCoord - Pusat poligon dalam format [bujur, lintang].
 * @param {number} areaMultiplier - Nilai luas (Shape_Area) dalam derajat persegi.
 * @returns {Array<[number, number]>} Cincin koordinat poligon (5 titik, termasuk penutup).
 */
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
/**
 * Mengubah record CSV menjadi FeatureCollection GeoJSON bertipe Polygon.
 * Properti yang ditulis: FID, Kelas, Shape_Area, Metadata (tetap "BPBD Provinsi Jawa Barat"),
 * dan Catatan (jika kosong diisi "BPBD Provinsi Jawa Barat").
 *
 * Catatan: parameter "filename" diterima tetapi tidak dipakai di dalam fungsi.
 *
 * @param {Array<Object<string, string>>} records - Record hasil parseCSV.
 * @param {string} filename - Nama berkas (saat ini tidak dipakai).
 * @param {number} [offsetLat=0] - Pergeseran tambahan pada lintang.
 * @param {number} [offsetLon=0] - Pergeseran tambahan pada bujur.
 * @returns {{type: "FeatureCollection", features: Array<Object>}} Objek FeatureCollection siap ditulis ke berkas.
 */
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
/**
 * Menjalankan alur generator: membaca CSV sumber, membuat GeoJSON, dan menulis hasilnya.
 * Jika terjadi error, pesan dicetak ke konsol dan proses keluar dengan kode 1.
 *
 * @returns {Promise<void>}
 */
async function main() {
  try {
    const projectPath = path.resolve(__dirname);
    
    // Read source CSV for the generated flood-risk GeoJSON
    // Nama berkas CSV disusun dari potongan: delineasi-indeks-risiko-banjir.csv.
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
