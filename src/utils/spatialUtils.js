/**
 * Utilitas analisis spasial dan geometri untuk B-DRAIN.
 *
 * Seluruh perhitungan jarak spasial (Buffer Analysis dan Proximity Analysis) ditransformasikan
 * ke sistem koordinat proyeksi metrik EPSG:32748 (WGS 84 / UTM Zone 48S) dalam satuan meter,
 * konsisten dengan pipeline ekstraksi fitur geospasial pada model Random Forest.
 *
 * Mendukung:
 * 1. Transformasi koordinat WGS 84 (EPSG:4326) <-> WGS 84 / UTM Zone 48S (EPSG:32748, meter).
 * 2. Perhitungan jarak metrik Euclidean pada bidang UTM 48S serta Haversine sebagai fallback global.
 * 3. Perhitungan jarak terpendek titik ke segmen garis (LineString, MultiLineString, GeometryCollection)
 *    pada bidang EPSG:32748 yang invarian terhadap urutan koordinat dan kerapatan vertex.
 * 4. Validasi geometri (menolak geometri kosong, null, koordinat non-finite/out-of-bounds, dan
 *    mendeduplikasi geometri sungai identik) serta spatial indexing berbasis bounding box UTM.
 * 5. Buffer Analysis terhadap jaringan sungai (EPSG:32748, meter).
 * 6. Proximity Analysis terhadap jaringan sungai beserta koordinat titik terdekat pada segmen.
 * 7. Priority Area Scoring dengan validasi kelengkapan data dan pemisahan hasil Buffer vs Proximity.
 * 8. Pemeriksaan Point-in-Polygon (Polygon & MultiPolygon) untuk pencocokan 48 Kelurahan Kota Bekasi.
 */

export const SPATIAL_CRS = 'EPSG:32748';
export const SOURCE_GEOJSON_CRS = 'EPSG:4326';

export const PROXIMITY_THRESHOLD_NOTE =
  'Ambang kategori jarak (< 200 m: Sangat Dekat, 200–499 m: Dekat, 500–999 m: Sedang, ≥ 1000 m: Jauh) merupakan parameter operasional aplikasi untuk eksplorasi spasial, bukan standar baku risiko banjir yang telah divalidasi lapangan.';

export const PRIORITY_SCORING_NOTE =
  'Bobot skor prioritas (Frekuensi Titik Banjir maks 40, Keparahan Historis maks 30, Cakupan Buffer Sungai maks 30) merupakan parameter operasional aplikasi untuk penentuan prioritas eksploratif.';

// Konstanta elipsoid WGS 84 & proyeksi Transverse Mercator UTM Zone 48S (EPSG:32748)
const WGS84_A = 6378137.0;
const WGS84_F = 1.0 / 298.257223563;
const UTM_K0 = 0.9996;
const UTM_ZONE_48_LON0_RAD = (105.0 * Math.PI) / 180.0;
const UTM_FE = 500000.0;
const UTM_FN_SOUTH = 10000000.0;
const WGS84_E2 = 2.0 * WGS84_F - WGS84_F * WGS84_F;
const WGS84_EP2 = WGS84_E2 / (1.0 - WGS84_E2);
const WGS84_E4 = WGS84_E2 * WGS84_E2;
const WGS84_E6 = WGS84_E4 * WGS84_E2;

/**
 * Memeriksa apakah nilai numerik valid (number berhingga dan bukan boolean).
 *
 * @param {unknown} val Nilai yang diuji.
 * @returns {boolean}
 */
export const isFiniteNumber = (val) =>
  typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val);

/**
 * Memeriksa apakah pasangan koordinat (lat, lng) merupakan koordinat geografis WGS 84 yang valid.
 *
 * @param {unknown} lat Lintang (derajat desimal, -90 s.d. 90).
 * @param {unknown} lng Bujur (derajat desimal, -180 s.d. 180).
 * @returns {boolean}
 */
export const isValidWgs84Coord = (lat, lng) =>
  isFiniteNumber(lat) &&
  isFiniteNumber(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

/**
 * Mentransformasikan koordinat geografis WGS 84 (lat, lng dalam derajat desimal, EPSG:4326)
 * ke koordinat proyeksi metrik WGS 84 / UTM Zone 48S (x, y dalam meter, EPSG:32748).
 *
 * Menggunakan persamaan Transverse Mercator Snyder/Redfearn dengan akurasi < 1 mm terhadap PROJ/pyproj.
 *
 * @param {number} lat Lintang (derajat desimal).
 * @param {number} lng Bujur (derajat desimal).
 * @returns {{x: number, y: number, crs: string}|null} Koordinat meter pada EPSG:32748, atau null jika tidak valid.
 */
export const wgs84ToUtm48S = (lat, lng) => {
  if (!isValidWgs84Coord(lat, lng)) return null;

  const phi = (lat * Math.PI) / 180.0;
  const lam = (lng * Math.PI) / 180.0;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = WGS84_A / Math.sqrt(1.0 - WGS84_E2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = WGS84_EP2 * cosPhi * cosPhi;
  const A = cosPhi * (lam - UTM_ZONE_48_LON0_RAD);

  const M =
    WGS84_A *
    ((1.0 - WGS84_E2 / 4.0 - (3.0 * WGS84_E4) / 64.0 - (5.0 * WGS84_E6) / 256.0) * phi -
      ((3.0 * WGS84_E2) / 8.0 + (3.0 * WGS84_E4) / 32.0 + (45.0 * WGS84_E6) / 1024.0) *
        Math.sin(2.0 * phi) +
      ((15.0 * WGS84_E4) / 256.0 + (45.0 * WGS84_E6) / 1024.0) * Math.sin(4.0 * phi) -
      ((35.0 * WGS84_E6) / 3072.0) * Math.sin(6.0 * phi));

  const A2 = A * A;
  const A3 = A2 * A;
  const A4 = A2 * A2;
  const A5 = A4 * A;
  const A6 = A4 * A2;

  const x =
    UTM_FE +
    UTM_K0 *
      N *
      (A +
        ((1.0 - T + C) * A3) / 6.0 +
        ((5.0 - 18.0 * T + T * T + 72.0 * C - 58.0 * WGS84_EP2) * A5) / 120.0);

  const y =
    UTM_FN_SOUTH +
    UTM_K0 *
      (M +
        N *
          tanPhi *
          (A2 / 2.0 +
            ((5.0 - T + 9.0 * C + 4.0 * C * C) * A4) / 24.0 +
            ((61.0 - 58.0 * T + T * T + 600.0 * C - 330.0 * WGS84_EP2) * A6) / 720.0));

  return { x, y, crs: SPATIAL_CRS };
};

/**
 * Mentransformasikan kembali koordinat metrik EPSG:32748 (x, y dalam meter pada UTM Zone 48S)
 * ke koordinat geografis WGS 84 (lat, lng dalam derajat desimal, EPSG:4326) untuk rendering Leaflet.
 *
 * @param {number} x Easting (meter, EPSG:32748).
 * @param {number} y Northing (meter, EPSG:32748).
 * @returns {{lat: number, lng: number}|null}
 */
export const utm48SToWgs84 = (x, y) => {
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  const e1 = (1.0 - Math.sqrt(1.0 - WGS84_E2)) / (1.0 + Math.sqrt(1.0 - WGS84_E2));
  const e1_2 = e1 * e1;
  const e1_3 = e1_2 * e1;
  const e1_4 = e1_2 * e1_2;

  const M = (y - UTM_FN_SOUTH) / UTM_K0;
  const mu =
    M /
    (WGS84_A * (1.0 - WGS84_E2 / 4.0 - (3.0 * WGS84_E4) / 64.0 - (5.0 * WGS84_E6) / 256.0));

  const phi1 =
    mu +
    ((3.0 * e1) / 2.0 - (27.0 * e1_3) / 32.0) * Math.sin(2.0 * mu) +
    ((21.0 * e1_2) / 16.0 - (55.0 * e1_4) / 32.0) * Math.sin(4.0 * mu) +
    ((151.0 * e1_3) / 96.0) * Math.sin(6.0 * mu) +
    ((1097.0 * e1_4) / 512.0) * Math.sin(8.0 * mu);

  const sinP1 = Math.sin(phi1);
  const cosP1 = Math.cos(phi1);
  const tanP1 = Math.tan(phi1);

  const N1 = WGS84_A / Math.sqrt(1.0 - WGS84_E2 * sinP1 * sinP1);
  const T1 = tanP1 * tanP1;
  const C1 = WGS84_EP2 * cosP1 * cosP1;
  const R1 = (WGS84_A * (1.0 - WGS84_E2)) / Math.pow(1.0 - WGS84_E2 * sinP1 * sinP1, 1.5);
  const D = (x - UTM_FE) / (N1 * UTM_K0);

  const D2 = D * D;
  const D3 = D2 * D;
  const D4 = D2 * D2;
  const D5 = D4 * D;
  const D6 = D4 * D2;

  const latRad =
    phi1 -
    ((N1 * tanP1) / R1) *
      (D2 / 2.0 -
        ((5.0 + 3.0 * T1 + 10.0 * C1 - 4.0 * C1 * C1 - 9.0 * WGS84_EP2) * D4) / 24.0 +
        ((61.0 + 90.0 * T1 + 298.0 * C1 + 45.0 * T1 * T1 - 252.0 * WGS84_EP2 - 3.0 * C1 * C1) *
          D6) /
          720.0);

  const lonRad =
    UTM_ZONE_48_LON0_RAD +
    (D -
      ((1.0 + 2.0 * T1 + C1) * D3) / 6.0 +
      ((5.0 - 2.0 * C1 + 28.0 * T1 - 3.0 * C1 * C1 + 8.0 * WGS84_EP2 + 24.0 * T1 * T1) * D5) /
        120.0) /
      cosP1;

  let lat = (latRad * 180.0) / Math.PI;
  let lng = (lonRad * 180.0) / Math.PI;

  // Satu langkah koreksi Newton-Raphson terhadap wgs84ToUtm48S agar inversi mencapai presisi < 1e-10 meter
  const fwd0 = wgs84ToUtm48S(lat, lng);
  if (fwd0) {
    const errX = x - fwd0.x;
    const errY = y - fwd0.y;
    if (Math.hypot(errX, errY) > 1e-11) {
      const dDeg = 1e-7;
      const fwdLat = wgs84ToUtm48S(lat + dDeg, lng);
      const fwdLng = wgs84ToUtm48S(lat, lng + dDeg);
      if (fwdLat && fwdLng) {
        const dxdLat = (fwdLat.x - fwd0.x) / dDeg;
        const dydLat = (fwdLat.y - fwd0.y) / dDeg;
        const dxdLng = (fwdLng.x - fwd0.x) / dDeg;
        const dydLng = (fwdLng.y - fwd0.y) / dDeg;
        const det = dxdLat * dydLng - dydLat * dxdLng;
        if (Math.abs(det) > 1e-12) {
          lat += (errX * dydLng - errY * dxdLng) / det;
          lng += (dxdLat * errY - dydLat * errX) / det;
        }
      }
    }
  }

  return {
    lat,
    lng,
  };
};

/**
 * Menghitung jarak metrik dalam satuan meter antara dua koordinat.
 * Menggunakan bidang proyeksi EPSG:32748 (UTM Zone 48S) untuk wilayah sekitar zona UTM 48S,
 * dan fallback ke rumus Haversine jika berada jauh di luar domain zona UTM 48S.
 *
 * @param {number} lat1 Lintang titik pertama (derajat desimal).
 * @param {number} lon1 Bujur titik pertama (derajat desimal).
 * @param {number} lat2 Lintang titik kedua (derajat desimal).
 * @param {number} lon2 Bujur titik kedua (derajat desimal).
 * @returns {number} Jarak dalam satuan meter (atau NaN jika input tidak valid).
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!isValidWgs84Coord(lat1, lon1) || !isValidWgs84Coord(lat2, lon2)) {
    return NaN;
  }

  // Gunakan jarak planar EPSG:32748 untuk domain sekitar Indonesia Barat / UTM 48S
  if (lon1 >= 96 && lon1 <= 114 && lon2 >= 96 && lon2 <= 114 && lat1 >= -15 && lat1 <= 5 && lat2 >= -15 && lat2 <= 5) {
    const p1 = wgs84ToUtm48S(lat1, lon1);
    const p2 = wgs84ToUtm48S(lat2, lon2);
    if (p1 && p2) {
      return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
  }

  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Mengekstrak seluruh daftar koordinat garis yang valid dari geometri GeoJSON
 * bertipe LineString, MultiLineString, maupun GeometryCollection (secara rekursif).
 *
 * Menyaring titik koordinat yang tidak valid (bukan angka berhingga atau di luar batas WGS 84).
 *
 * @param {object|null} geometry Objek geometri GeoJSON.
 * @returns {Array<Array<number[]>>} Array berisi rangkaian koordinat garis [lng, lat] yang valid.
 */
export const extractLineCoordinateArrays = (geometry) => {
  if (!geometry || typeof geometry !== 'object') return [];

  if (geometry.type === 'GeometryCollection') {
    if (!Array.isArray(geometry.geometries)) return [];
    const collected = [];
    for (const subGeom of geometry.geometries) {
      const subLines = extractLineCoordinateArrays(subGeom);
      for (const line of subLines) {
        collected.push(line);
      }
    }
    return collected;
  }

  if (!Array.isArray(geometry.coordinates)) return [];

  const filterValidCoords = (lineCoords) => {
    if (!Array.isArray(lineCoords)) return [];
    return lineCoords.filter(
      (pt) =>
        Array.isArray(pt) &&
        pt.length >= 2 &&
        isValidWgs84Coord(pt[1], pt[0])
    );
  };

  if (geometry.type === 'LineString') {
    const valid = filterValidCoords(geometry.coordinates);
    return valid.length > 0 ? [valid] : [];
  }

  if (geometry.type === 'MultiLineString') {
    const lines = [];
    for (const rawLine of geometry.coordinates) {
      const valid = filterValidCoords(rawLine);
      if (valid.length > 0) {
        lines.push(valid);
      }
    }
    return lines;
  }

  return [];
};

/**
 * Menghitung titik terdekat pada segmen garis AB dari titik P pada bidang metrik EPSG:32748.
 * Ujung segmen A dan B diurutkan secara kanonik sebelum proyeksi agar hasil 100% invarian
 * terhadap arah/urutan koordinat segmen (AB vs BA).
 *
 * @param {number} px Easting titik P (meter, EPSG:32748).
 * @param {number} py Northing titik P (meter, EPSG:32748).
 * @param {number} ax Easting ujung A (meter, EPSG:32748).
 * @param {number} ay Northing ujung A (meter, EPSG:32748).
 * @param {number} bx Easting ujung B (meter, EPSG:32748).
 * @param {number} by Northing ujung B (meter, EPSG:32748).
 * @returns {{x: number, y: number, distance: number, t: number}}
 */
export const closestPointOnSegmentUtm = (px, py, ax, ay, bx, by) => {
  // Urutan kanonik (x1, y1) -> (x2, y2) agar invarian terhadap pembalikan arah segmen
  const swap = ax > bx || (ax === bx && ay > by);
  const x1 = swap ? bx : ax;
  const y1 = swap ? by : ay;
  const x2 = swap ? ax : bx;
  const y2 = swap ? ay : by;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq <= 1e-12) {
    const distance = Math.hypot(px - x1, py - y1);
    return {
      x: x1,
      y: y1,
      distance,
      t: 0,
    };
  }

  const rawT = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  const clampedT = Math.max(0, Math.min(1, rawT));
  const cx = x1 + clampedT * dx;
  const cy = y1 + clampedT * dy;
  const distance = Math.hypot(px - cx, py - cy);
  const t = swap ? 1 - clampedT : clampedT;

  return {
    x: cx,
    y: cy,
    distance,
    t,
  };
};

/**
 * Menghitung titik terdekat pada segmen garis AB dari titik P(pointLat, pointLng)
 * beserta jarak terpendek dalam satuan meter menggunakan transformasi ke EPSG:32748 (UTM Zone 48S).
 *
 * @param {number} pointLat Lintang titik uji (WGS 84).
 * @param {number} pointLng Bujur titik uji (WGS 84).
 * @param {number} lat1 Lintang ujung A segmen (WGS 84).
 * @param {number} lng1 Bujur ujung A segmen (WGS 84).
 * @param {number} lat2 Lintang ujung B segmen (WGS 84).
 * @param {number} lng2 Bujur ujung B segmen (WGS 84).
 * @returns {{lat: number, lng: number, distance: number, t: number, utm?: {x: number, y: number, crs: string}}}
 */
export const closestPointOnSegment = (pointLat, pointLng, lat1, lng1, lat2, lng2) => {
  const pUtm = wgs84ToUtm48S(pointLat, pointLng);
  const aUtm = wgs84ToUtm48S(lat1, lng1);
  const bUtm = wgs84ToUtm48S(lat2, lng2);

  if (pUtm && aUtm && bUtm) {
    const segUtm = closestPointOnSegmentUtm(pUtm.x, pUtm.y, aUtm.x, aUtm.y, bUtm.x, bUtm.y);
    const wgs = utm48SToWgs84(segUtm.x, segUtm.y) || {
      lat: lat1 + segUtm.t * (lat2 - lat1),
      lng: lng1 + segUtm.t * (lng2 - lng1),
    };
    return {
      lat: wgs.lat,
      lng: wgs.lng,
      distance: segUtm.distance,
      t: segUtm.t,
      utm: { x: segUtm.x, y: segUtm.y, crs: SPATIAL_CRS },
    };
  }

  return {
    lat: NaN,
    lng: NaN,
    distance: NaN,
    t: 0,
  };
};

/**
 * Membentuk tanda tangan (signature) geometri kanonik yang invarian terhadap pembalikan arah garis
 * (AB vs BA) dan urutan sub-garis pada MultiLineString, tanpa pembulatan koordinat yang berisiko
 * menggabungkan dua sungai berbeda yang berdekatan (hampir identik).
 *
 * @param {Array<Array<number[]>>} lines Array koordinat garis yang valid.
 * @returns {string} Signature string.
 */
const buildCanonicalGeometrySignature = (lines) => {
  const lineSigs = lines.map((line) => {
    const forward = line.map(([lng, lat]) => `${Number(lng)},${Number(lat)}`).join(';');
    const backward = [...line]
      .reverse()
      .map(([lng, lat]) => `${Number(lng)},${Number(lat)}`)
      .join(';');
    return forward <= backward ? forward : backward;
  });
  lineSigs.sort();
  return lineSigs.join('|');
};

/**
 * Menghitung jarak minimum Euclidean dari titik (px, py) ke kotak pembatas (bounding box) pada EPSG:32748.
 * Digunakan sebagai lower-bound eksak untuk mempercepat pencarian fitur sungai terdekat (spatial indexing).
 *
 * @param {number} px Easting titik.
 * @param {number} py Northing titik.
 * @param {{minX: number, minY: number, maxX: number, maxY: number}} bbox Bounding box fitur pada UTM 48S.
 * @returns {number} Jarak minimum ke bounding box dalam meter.
 */
const distanceToBboxUtm = (px, py, bbox) => {
  const dx = px < bbox.minX ? bbox.minX - px : px > bbox.maxX ? px - bbox.maxX : 0;
  const dy = py < bbox.minY ? bbox.minY - py : py > bbox.maxY ? py - bbox.maxY : 0;
  return Math.hypot(dx, dy);
};

// Cache spatial index berbasis WeakMap agar dataset sungai tidak perlu diproyeksikan berulang kali
const preparedDrainageCache = new WeakMap();

/**
 * Memvalidasi, mendeduplikasi, dan memproyeksikan fitur-fitur sungai ke EPSG:32748
 * beserta indeks bounding box metriknya.
 *
 * @param {object} drainageData Objek FeatureCollection GeoJSON sungai.
 * @returns {Array<object>} Daftar fitur sungai terindeks pada EPSG:32748.
 */
export const prepareDrainageFeatures = (drainageData) => {
  if (!drainageData || typeof drainageData !== 'object' || !Array.isArray(drainageData.features)) {
    return [];
  }
  if (preparedDrainageCache.has(drainageData)) {
    return preparedDrainageCache.get(drainageData);
  }

  const prepared = [];
  const seenSignatures = new Set();

  drainageData.features.forEach((feature, idx) => {
    const lines = extractLineCoordinateArrays(feature?.geometry);
    if (!lines.length) return;

    const sig = buildCanonicalGeometrySignature(lines);
    if (seenSignatures.has(sig)) {
      return;
    }
    seenSignatures.add(sig);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const utmLines = [];

    for (const line of lines) {
      const utmPts = [];
      for (const [lng, lat] of line) {
        const u = wgs84ToUtm48S(lat, lng);
        if (!u) continue;
        if (u.x < minX) minX = u.x;
        if (u.x > maxX) maxX = u.x;
        if (u.y < minY) minY = u.y;
        if (u.y > maxY) maxY = u.y;
        utmPts.push({ x: u.x, y: u.y, lat, lng });
      }
      if (utmPts.length > 0) {
        utmLines.push(utmPts);
      }
    }

    if (!utmLines.length || !Number.isFinite(minX)) return;

    const props = feature?.properties || {};
    const riverType = props.NAMOBJ || props.REMARK || props.name || props.waterway || 'Sungai Utama';
    const riverName = props.NAMOBJ || props.name || props.REMARK || 'Alur Sungai';
    const riverRemark = props.REMARK || props.waterway || 'Sungai';
    const featureId =
      props.id ||
      props.FID ||
      props.OBJECTID ||
      `SUNGAI_${idx + 1}_${String(riverType).replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}`;

    prepared.push({
      featureIndex: idx,
      featureId: String(featureId),
      type: riverType,
      name: riverName,
      remark: riverRemark,
      geometryType: feature?.geometry?.type || 'LineString',
      bbox: { minX, minY, maxX, maxY },
      utmLines,
      feature,
    });
  });

  preparedDrainageCache.set(drainageData, prepared);
  return prepared;
};

/**
 * Menghitung jarak metrik terpendek pada EPSG:32748 dari titik UTM (px, py)
 * ke sebuah fitur sungai yang telah dipreparasi.
 *
 * @param {number} px Easting titik banjir (meter, EPSG:32748).
 * @param {number} py Northing titik banjir (meter, EPSG:32748).
 * @param {object} preparedFeature Fitur sungai hasil `prepareDrainageFeatures`.
 * @returns {{distance: number, coords: {lat: number, lng: number}, utmCoords: {x: number, y: number, crs: string}, type: string, name: string, remark: string, geometryType: string, id: string}|null}
 */
const distanceToPreparedRiverUtm = (px, py, preparedFeature) => {
  let minDist = Infinity;
  let bestUtm = null;

  for (const utmLine of preparedFeature.utmLines) {
    if (utmLine.length === 1) {
      const pt = utmLine[0];
      const d = Math.hypot(px - pt.x, py - pt.y);
      if (d < minDist) {
        minDist = d;
        bestUtm = { x: pt.x, y: pt.y };
      }
      continue;
    }

    for (let i = 0; i < utmLine.length - 1; i += 1) {
      const a = utmLine[i];
      const b = utmLine[i + 1];
      const seg = closestPointOnSegmentUtm(px, py, a.x, a.y, b.x, b.y);
      if (seg.distance < minDist) {
        minDist = seg.distance;
        bestUtm = { x: seg.x, y: seg.y };
      }
    }
  }

  if (!Number.isFinite(minDist) || !bestUtm) return null;
  const wgs = utm48SToWgs84(bestUtm.x, bestUtm.y);
  if (!wgs) return null;

  return {
    id: preparedFeature.featureId,
    distance: minDist,
    coords: wgs,
    utmCoords: { x: bestUtm.x, y: bestUtm.y, crs: SPATIAL_CRS },
    type: preparedFeature.type,
    name: preparedFeature.name,
    remark: preparedFeature.remark,
    geometryType: preparedFeature.geometryType,
  };
};

/**
 * Menghitung jarak terpendek dari titik (pointLat, pointLng) ke sebuah fitur sungai
 * yang dapat bertipe LineString, MultiLineString, maupun GeometryCollection
 * menggunakan proyeksi metrik EPSG:32748 (UTM Zone 48S).
 *
 * @param {number} pointLat Lintang titik banjir.
 * @param {number} pointLng Bujur titik banjir.
 * @param {object} feature Fitur GeoJSON sungai/drainase.
 * @returns {{distance: number, coords: {lat: number, lng: number}, utmCoords: {x: number, y: number, crs: string}, type: string, name: string, remark: string, geometryType: string}|null}
 */
export const distanceToRiverFeature = (pointLat, pointLng, feature) => {
  const pUtm = wgs84ToUtm48S(pointLat, pointLng);
  if (!pUtm) return null;

  const lines = extractLineCoordinateArrays(feature?.geometry);
  if (!lines.length) return null;

  let minDist = Infinity;
  let bestUtm = null;

  for (const line of lines) {
    if (line.length === 1) {
      const [lng, lat] = line[0];
      const vUtm = wgs84ToUtm48S(lat, lng);
      if (vUtm) {
        const d = Math.hypot(pUtm.x - vUtm.x, pUtm.y - vUtm.y);
        if (d < minDist) {
          minDist = d;
          bestUtm = { x: vUtm.x, y: vUtm.y };
        }
      }
      continue;
    }

    for (let i = 0; i < line.length - 1; i += 1) {
      const [lng1, lat1] = line[i];
      const [lng2, lat2] = line[i + 1];
      const aUtm = wgs84ToUtm48S(lat1, lng1);
      const bUtm = wgs84ToUtm48S(lat2, lng2);
      if (!aUtm || !bUtm) continue;

      const seg = closestPointOnSegmentUtm(pUtm.x, pUtm.y, aUtm.x, aUtm.y, bUtm.x, bUtm.y);
      if (seg.distance < minDist) {
        minDist = seg.distance;
        bestUtm = { x: seg.x, y: seg.y };
      }
    }
  }

  if (!Number.isFinite(minDist) || !bestUtm) return null;
  const bestCoords = utm48SToWgs84(bestUtm.x, bestUtm.y);
  if (!bestCoords) return null;

  const props = feature?.properties || {};
  const riverType = props.NAMOBJ || props.REMARK || props.name || props.waterway || 'Sungai Utama';
  const riverName = props.NAMOBJ || props.name || props.REMARK || 'Alur Sungai';
  const riverRemark = props.REMARK || props.waterway || 'Sungai';

  return {
    distance: minDist,
    coords: bestCoords,
    utmCoords: { x: bestUtm.x, y: bestUtm.y, crs: SPATIAL_CRS },
    type: riverType,
    name: riverName,
    remark: riverRemark,
    geometryType: feature?.geometry?.type || 'LineString',
  };
};

/**
 * Menjalankan Buffer Analysis untuk seluruh titik banjir terhadap jaringan sungai
 * pada sistem koordinat EPSG:32748 (UTM Zone 48S) dalam satuan meter.
 *
 * Mendukung LineString, MultiLineString, dan GeometryCollection, mendeduplikasi geometri identik,
 * serta memvalidasi radius buffer (harus angka berhingga > 0) dan koordinat titik banjir.
 *
 * @param {Array<object>} floodPoints Daftar titik banjir.
 * @param {object} drainageData Objek GeoJSON jaringan sungai.
 * @param {number} bufferRadius Radius buffer dalam meter (harus > 0).
 * @returns {Array<object>} Hasil Buffer Analysis per titik banjir.
 */
export const runBufferAnalysis = (floodPoints, drainageData, bufferRadius) => {
  if (!Array.isArray(floodPoints) || floodPoints.length === 0) return [];
  if (typeof bufferRadius === 'boolean' || bufferRadius === null || bufferRadius === undefined || bufferRadius === '') {
    return [];
  }
  const radius = Number(bufferRadius);
  if (!isFiniteNumber(radius) || radius <= 0) {
    return [];
  }

  const preparedRivers = prepareDrainageFeatures(drainageData);

  return floodPoints.map((point) => {
    const pUtm = wgs84ToUtm48S(point?.lat, point?.lng);
    if (!pUtm) {
      return {
        ...point,
        analysisType: 'buffer',
        crs: SPATIAL_CRS,
        validPoint: false,
        bufferRadiusUsed: radius,
        drainageInBuffer: 0,
        riversInBuffer: [],
        nearestRiverDistance: null,
        nearestDrainage: null,
        coverage: 'Koordinat Tidak Valid',
      };
    }

    let drainageCount = 0;
    let nearestDrainage = null;
    let minDist = Infinity;
    const riversInBuffer = [];

    for (const prep of preparedRivers) {
      const bboxDist = distanceToBboxUtm(pUtm.x, pUtm.y, prep.bbox);
      // Jika kita sudah punya nearestDrainage dan bbox > radius serta bbox >= minDist, lewati segmen
      if (bboxDist > radius && bboxDist >= minDist) {
        continue;
      }

      const res = distanceToPreparedRiverUtm(pUtm.x, pUtm.y, prep);
      if (!res) continue;

      if (res.distance <= radius + 1e-7) {
        drainageCount += 1;
        riversInBuffer.push({
          id: res.id,
          type: res.type,
          name: res.name,
          geometryType: res.geometryType,
          distance: res.distance.toFixed(0),
          distanceMeters: Number(res.distance.toFixed(2)),
        });
      }

      if (res.distance < minDist - 1e-7) {
        minDist = res.distance;
        nearestDrainage = {
          id: res.id,
          distance: res.distance.toFixed(0),
          distanceMeters: Number(res.distance.toFixed(2)),
          type: res.type,
          name: res.name,
          remark: res.remark,
          geometryType: res.geometryType,
          coords: res.coords,
          utmCoords: res.utmCoords,
        };
      }
    }

    return {
      ...point,
      analysisType: 'buffer',
      crs: SPATIAL_CRS,
      validPoint: true,
      bufferRadiusUsed: radius,
      drainageInBuffer: drainageCount,
      riversInBuffer,
      nearestRiverDistance: nearestDrainage ? Number(nearestDrainage.distance) : null,
      nearestDrainage,
      coverage: drainageCount > 0 ? 'Terlayani' : 'Tidak Terlayani',
    };
  });
};

/**
 * Mengklasifikasikan kategori aksesibilitas/kedekatan jarak titik banjir terhadap segmen sungai.
 * - Sangat Dekat: 0 <= d < 200 m
 * - Dekat: 200 <= d < 500 m
 * - Sedang: 500 <= d < 1000 m
 * - Jauh: d >= 1000 m
 *
 * Catatan: Ambang ini adalah parameter operasional aplikasi untuk eksplorasi spasial.
 *
 * @param {number} distanceMeters Jarak dalam meter (EPSG:32748).
 * @returns {string} Label kategori jarak.
 */
export const classifyProximityCategory = (distanceMeters) => {
  if (!isFiniteNumber(distanceMeters) || distanceMeters < 0) return 'Data Tidak Tersedia';
  if (distanceMeters < 200) return 'Sangat Dekat';
  if (distanceMeters < 500) return 'Dekat';
  if (distanceMeters < 1000) return 'Sedang';
  return 'Jauh';
};

/**
 * Mengklasifikasikan skor kedekatan sungai untuk pewarnaan garis proximity di peta.
 * - Baik: 0 <= d < 500 m
 * - Sedang: 500 <= d < 1000 m
 * - Buruk: d >= 1000 m
 *
 * @param {number} distanceMeters Jarak dalam meter (EPSG:32748).
 * @returns {'Baik'|'Sedang'|'Buruk'|'N/A'}
 */
export const classifyProximityScore = (distanceMeters) => {
  if (!isFiniteNumber(distanceMeters) || distanceMeters < 0) return 'N/A';
  if (distanceMeters < 500) return 'Baik';
  if (distanceMeters < 1000) return 'Sedang';
  return 'Buruk';
};

/**
 * Menjalankan Proximity Analysis untuk seluruh titik banjir terhadap jaringan sungai
 * menggunakan jarak segmen metrik terpendek pada EPSG:32748 (UTM Zone 48S) dalam satuan meter.
 *
 * Catatan penting:
 * 1. Mengukur jarak titik kejadian banjir (`data_banjir.geojson`) ke segmen sungai terdekat
 *    (`SUNGAI_LN_25K.geojson`), BUKAN jarak centroid kelurahan ke sungai (`dist_to_river`).
 * 2. Fungsi ini TIDAK mengisi properti `drainageInBuffer` agar hasilnya tidak disalahgunakan
 *    sebagai komponen buffer pada Priority Area Scoring.
 *
 * @param {Array<object>} floodPoints Daftar titik banjir.
 * @param {object} drainageData Objek GeoJSON jaringan sungai.
 * @returns {Array<object>} Hasil Proximity Analysis per titik banjir.
 */
export const runProximityAnalysis = (floodPoints, drainageData) => {
  if (!Array.isArray(floodPoints) || floodPoints.length === 0) return [];
  const preparedRivers = prepareDrainageFeatures(drainageData);

  return floodPoints.map((point) => {
    const pUtm = wgs84ToUtm48S(point?.lat, point?.lng);
    if (!pUtm) {
      return {
        ...point,
        analysisType: 'proximity',
        crs: SPATIAL_CRS,
        distanceType: 'flood_point_to_river_segment',
        thresholdNote: PROXIMITY_THRESHOLD_NOTE,
        validPoint: false,
        nearestDrainage: null,
        proximityScore: 'N/A',
      };
    }

    let minDist = Infinity;
    let info = null;

    // Urutkan kandidat fitur berdasarkan jarak ke bounding box UTM untuk pruning cepat dan deterministik
    const candidates = preparedRivers
      .map((prep) => ({
        prep,
        bboxDist: distanceToBboxUtm(pUtm.x, pUtm.y, prep.bbox),
      }))
      .sort((a, b) => {
        if (a.bboxDist !== b.bboxDist) return a.bboxDist - b.bboxDist;
        return a.prep.featureIndex - b.prep.featureIndex;
      });

    for (const { prep, bboxDist } of candidates) {
      // Jika jarak ke bounding box lebih besar dari minDist terbaik, tidak mungkin ada segmen lebih dekat
      if (bboxDist > minDist + 1e-7) {
        break;
      }

      const res = distanceToPreparedRiverUtm(pUtm.x, pUtm.y, prep);
      if (!res) continue;

      // Tie-breaking deterministik: jika jarak sama dalam toleransi 1e-7 m, pilih fitur dengan featureIndex lebih kecil
      const isStrictlyCloser = res.distance < minDist - 1e-7;
      const isTieWithEarlierIndex =
        Math.abs(res.distance - minDist) <= 1e-7 &&
        info &&
        prep.featureIndex < info.featureIndex;

      if (isStrictlyCloser || isTieWithEarlierIndex) {
        minDist = res.distance;
        info = {
          id: res.id,
          featureIndex: prep.featureIndex,
          distance: res.distance.toFixed(0),
          distanceMeters: Number(res.distance.toFixed(2)),
          type: res.type,
          name: res.name,
          remark: res.remark,
          geometryType: res.geometryType,
          coords: res.coords,
          utmCoords: res.utmCoords,
          accessibility: classifyProximityCategory(res.distance),
          crs: SPATIAL_CRS,
        };
      }
    }

    return {
      ...point,
      analysisType: 'proximity',
      crs: SPATIAL_CRS,
      distanceType: 'flood_point_to_river_segment',
      thresholdNote: PROXIMITY_THRESHOLD_NOTE,
      validPoint: true,
      nearestDrainage: info,
      proximityScore: classifyProximityScore(minDist),
    };
  });
};

/**
 * Menghitung skor prioritas penanganan banjir untuk setiap titik banjir.
 *
 * Rumus dan Bobot (Parameter Operasional Eksploratif):
 * 1. Komponen Jumlah Titik Banjir (maks 40 poin):
 *    - >= 20 titik: 40 poin
 *    - 12 s.d. 19 titik: 25 poin
 *    - 1 s.d. 11 titik: 10 poin
 * 2. Komponen Tingkat Keparahan / Severity (maks 30 poin):
 *    - 'high': 30 poin
 *    - 'medium': 20 poin
 *    - 'low': 10 poin
 * 3. Komponen Hasil Buffer Analysis (maks 30 poin, HANYA jika data Buffer Analysis valid tersedia):
 *    - drainageInBuffer === 0 (atau boolean false): 30 poin (belum terjangkau sungai dalam radius buffer)
 *    - drainageInBuffer === 1 (< 2): 20 poin
 *    - drainageInBuffer >= 2 (atau boolean true): 10 poin
 *    Jika Buffer Analysis belum dijalankan (atau input berasal dari Proximity Analysis yang tidak
 *    memiliki `drainageInBuffer`), komponen buffer TIDAK diberi skor default (0 poin) dan
 *    skor maksimum tercatat sebesar 70 poin.
 *
 * Validasi Input:
 * - Menolak jumlah_titik <= 0, negatif, NaN, Infinity, null, undefined, atau boolean sebagai 'Data Tidak Lengkap'.
 * - Menolak severity di luar {'high', 'medium', 'low'} sebagai 'Data Tidak Lengkap'.
 *
 * Kategori Prioritas:
 * - Skor >= 80: 'Sangat Mendesak'
 * - Skor 60 s.d. 79: 'Mendesak'
 * - Skor 40 s.d. 59: 'Perlu Perhatian'
 * - Skor < 40: 'Monitor'
 *
 * @param {Array<object>} floodPoints Daftar titik banjir.
 * @param {Array<object>|null} bufferResults Hasil Buffer Analysis (opsional).
 * @returns {{allScored: Array<object>, topPriorityAreas: Array<object>, bufferComponentUsed: boolean, scoringNote: string}}
 */
export const runPriorityScoring = (floodPoints, bufferResults = null) => {
  if (!Array.isArray(floodPoints) || floodPoints.length === 0) {
    return {
      allScored: [],
      topPriorityAreas: [],
      bufferComponentUsed: false,
      scoringNote: PRIORITY_SCORING_NOTE,
    };
  }

  const validSeverities = new Set(['high', 'medium', 'low']);
  const hasBufferArray = Array.isArray(bufferResults) && bufferResults.length > 0;
  let anyBufferUsed = false;

  const allScored = floodPoints.map((p) => {
    const rawCount = p?.jumlah_titik;
    const isCountNumeric =
      rawCount !== null &&
      rawCount !== undefined &&
      rawCount !== '' &&
      typeof rawCount !== 'boolean' &&
      isFiniteNumber(Number(rawCount));
    const jumlahTitik = isCountNumeric ? Number(rawCount) : NaN;
    const sev = typeof p?.severity === 'string' ? p.severity.toLowerCase().trim() : '';
    const isDataComplete = isFiniteNumber(jumlahTitik) && jumlahTitik > 0 && validSeverities.has(sev);

    const realDisplayName = p?.kelurahan_spasial
      ? `${p.kelurahan_spasial} (${p.kecamatan_spasial || p.nama_kecamatan || p.kecamatan})`
      : p?.nama_kecamatan || p?.kecamatan || '-';

    if (!isDataComplete) {
      return {
        ...p,
        dataComplete: false,
        floodCountScore: null,
        severityScore: null,
        bufferScore: null,
        priorityScore: null,
        maxPossibleScore: 0,
        bufferComponentIncluded: false,
        priorityLevel: 'Data Tidak Lengkap',
        displayAreaName: realDisplayName,
      };
    }

    let floodCountScore = 10;
    if (jumlahTitik >= 20) floodCountScore = 40;
    else if (jumlahTitik >= 12) floodCountScore = 25;

    let severityScore = 10;
    if (sev === 'high') severityScore = 30;
    else if (sev === 'medium') severityScore = 20;

    let bufferScore = 0;
    let bufferComponentIncluded = false;
    let drainageInBufferValue = null;

    if (hasBufferArray) {
      const r = bufferResults.find((item) => item && item.id === p.id);
      if (r) {
        if (typeof r.drainageInBuffer === 'number' && isFiniteNumber(r.drainageInBuffer) && r.drainageInBuffer >= 0) {
          bufferComponentIncluded = true;
          anyBufferUsed = true;
          drainageInBufferValue = r.drainageInBuffer;
          if (r.drainageInBuffer === 0) bufferScore = 30;
          else if (r.drainageInBuffer < 2) bufferScore = 20;
          else bufferScore = 10;
        } else if (typeof r.drainageInBuffer === 'boolean') {
          bufferComponentIncluded = true;
          anyBufferUsed = true;
          drainageInBufferValue = r.drainageInBuffer ? 1 : 0;
          bufferScore = r.drainageInBuffer ? 10 : 30;
        }
      }
    }

    const maxPossibleScore = bufferComponentIncluded ? 100 : 70;
    const rawTotal = floodCountScore + severityScore + bufferScore;
    const totalScore = Math.max(0, Math.min(maxPossibleScore, rawTotal));

    let priorityLevel = 'Monitor';
    if (totalScore >= 80) priorityLevel = 'Sangat Mendesak';
    else if (totalScore >= 60) priorityLevel = 'Mendesak';
    else if (totalScore >= 40) priorityLevel = 'Perlu Perhatian';

    return {
      ...p,
      dataComplete: true,
      floodCountScore,
      severityScore,
      bufferScore: bufferComponentIncluded ? bufferScore : null,
      drainageInBuffer: drainageInBufferValue,
      bufferComponentIncluded,
      maxPossibleScore,
      priorityScore: totalScore,
      priorityLevel,
      scoringNote: PRIORITY_SCORING_NOTE,
      originalNamaKecamatan: p.nama_kecamatan || p.kecamatan,
      originalKecamatan: p.kecamatan,
      displayAreaName: realDisplayName,
    };
  });

  const topPriorityAreas = allScored
    .filter((item) => item.dataComplete && isFiniteNumber(item.priorityScore))
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      if ((b.jumlah_titik || 0) !== (a.jumlah_titik || 0)) {
        return (b.jumlah_titik || 0) - (a.jumlah_titik || 0);
      }
      const numIdA = Number(a.id);
      const numIdB = Number(b.id);
      if (isFiniteNumber(numIdA) && isFiniteNumber(numIdB) && numIdA !== numIdB) {
        return numIdA - numIdB;
      }
      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    })
    .slice(0, 5);

  return {
    allScored,
    topPriorityAreas,
    bufferComponentUsed: anyBufferUsed,
    scoringNote: PRIORITY_SCORING_NOTE,
  };
};

/**
 * Menguji apakah titik (lat, lng) berada di dalam satu ring poligon tertutup
 * menggunakan algoritma ray-casting.
 *
 * @param {number} lat Lintang titik.
 * @param {number} lng Bujur titik.
 * @param {Array<number[]>} ring Array koordinat [lng, lat].
 * @returns {boolean}
 */
const isPointInRing = (lat, lng, ring) => {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0];
    const yi = ring[i]?.[1];
    const xj = ring[j]?.[0];
    const yj = ring[j]?.[1];
    if (!isValidWgs84Coord(yi, xi) || !isValidWgs84Coord(yj, xj)) continue;

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-16) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Menguji apakah titik (lat, lng) berada di dalam poligon tunggal (termasuk lubang/interior rings).
 *
 * @param {number} lat Lintang titik.
 * @param {number} lng Bujur titik.
 * @param {Array<Array<number[]>>} polygonRings Array ring poligon ([outerRing, ...holeRings]).
 * @returns {boolean}
 */
const isPointInPolygonRings = (lat, lng, polygonRings) => {
  if (!Array.isArray(polygonRings) || polygonRings.length === 0) return false;
  if (!isPointInRing(lat, lng, polygonRings[0])) return false;
  for (let k = 1; k < polygonRings.length; k += 1) {
    if (isPointInRing(lat, lng, polygonRings[k])) return false;
  }
  return true;
};

/**
 * Menguji apakah titik (lat, lng) berada di dalam geometri GeoJSON Polygon atau MultiPolygon.
 *
 * @param {number} lat Lintang titik.
 * @param {number} lng Bujur titik.
 * @param {object} geometry Objek geometri GeoJSON.
 * @returns {boolean}
 */
export const isPointInGeometry = (lat, lng, geometry) => {
  if (!isValidWgs84Coord(lat, lng) || !geometry || !Array.isArray(geometry.coordinates)) {
    return false;
  }
  if (geometry.type === 'Polygon') {
    return isPointInPolygonRings(lat, lng, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polyRings) => isPointInPolygonRings(lat, lng, polyRings));
  }
  return false;
};

/**
 * Mencari poligon kelurahan Kota Bekasi yang memuat titik koordinat (lat, lng).
 * Hanya memproses fitur yang berada di wilayah administratif Kota Bekasi (WADMKK === 'Kota Bekasi').
 *
 * @param {number} lat Lintang titik yang dipilih.
 * @param {number} lng Bujur titik yang dipilih.
 * @param {object} kelurahanGeoJson FeatureCollection kelurahan.
 * @returns {object|null} Properti kelurahan yang cocok beserta fitur spasialnya, atau null jika di luar Kota Bekasi.
 */
export const findKotaBekasiKelurahanByPoint = (lat, lng, kelurahanGeoJson) => {
  if (!isValidWgs84Coord(lat, lng) || !kelurahanGeoJson?.features?.length) {
    return null;
  }

  for (const feature of kelurahanGeoJson.features) {
    const props = feature?.properties || {};
    if (props.WADMKK && props.WADMKK !== 'Kota Bekasi') {
      continue;
    }
    if (isPointInGeometry(lat, lng, feature.geometry)) {
      return props;
    }
  }
  return null;
};
