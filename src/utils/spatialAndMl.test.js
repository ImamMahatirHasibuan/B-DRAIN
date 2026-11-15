import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import MlAnalysisPanel from '../components/MlAnalysisPanel';
import SpatialAnalysisPanel from '../components/SpatialAnalysisPanel';
import {
  SPATIAL_CRS,
  wgs84ToUtm48S,
  utm48SToWgs84,
  closestPointOnSegment,
  extractLineCoordinateArrays,
  distanceToRiverFeature,
  runBufferAnalysis,
  runProximityAnalysis,
  runPriorityScoring,
  classifyProximityCategory,
  classifyProximityScore,
  findKotaBekasiKelurahanByPoint,
} from './spatialUtils';
import {
  buildMlPayload,
  buildOfflineRiskEstimate,
  enrichAndDeduplicateBatchResults,
  findKelurahanByIdOrName,
  formatModelProbabilities,
  ML_ERROR_MESSAGES,
  ML_FEATURE_COLUMNS,
  ML_VALIDATION_NOTE,
  ML_VALIDATION_STATUS_UPPER,
  normalizeKelurahanId,
  OFFLINE_ESTIMATE_LABEL,
  summarizeBatchResults,
} from './mlRiskUtils';
import kelurahanFeaturesJson from '../../public/data/kelurahan_features_48.json';

const kelurahanGeoJson48 = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), 'public/data/kelurahan_kota_bekasi_48.geojson'),
    'utf-8'
  )
);

const realFloodGeoJson = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), 'public/data/data_banjir.geojson'),
    'utf-8'
  )
);

const realRiverGeoJson = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), 'public/data/export.geojson'),
    'utf-8'
  )
);

/**
 * Helper untuk membuat segmen sungai lurus horizontal pada EPSG:32748 yang berjarak tepat `offsetMeters`
 * di sebelah utara dari titik referensi (baseLat, baseLng).
 */
const buildUtmOffsetRiverFeature = (baseLat, baseLng, offsetMeters, props = {}, geomType = 'LineString') => {
  const pUtm = wgs84ToUtm48S(baseLat, baseLng);
  const west = utm48SToWgs84(pUtm.x - 500, pUtm.y + offsetMeters);
  const east = utm48SToWgs84(pUtm.x + 500, pUtm.y + offsetMeters);
  const segCoords = [
    [west.lng, west.lat],
    [east.lng, east.lat],
  ];
  return {
    type: 'Feature',
    properties: { NAMOBJ: 'Sungai Uji UTM', REMARK: 'Sungai', ...props },
    geometry:
      geomType === 'MultiLineString'
        ? { type: 'MultiLineString', coordinates: [segCoords] }
        : { type: 'LineString', coordinates: segCoords },
  };
};

describe('EPSG:32748 Coordinate Projection & Spatial Analysis Utilities', () => {
  const sampleFloodPoint = {
    id: 1,
    lat: -6.2400,
    lng: 106.9900,
    kecamatan: 'BEKASI SELATAN',
    nama_kecamatan: 'Bekasi Selatan',
    kelurahan_spasial: 'Margajaya',
    kecamatan_spasial: 'Bekasi Selatan',
    jumlah_titik: 25,
    severity: 'high',
  };

  const longLineStringRiver = {
    type: 'Feature',
    properties: { NAMOBJ: 'Kali Bekasi Segmen Lurus', REMARK: 'Sungai' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [106.9780, -6.2402],
        [107.0020, -6.2402],
      ],
    },
  };

  const multiLineStringRiver = {
    type: 'Feature',
    properties: { NAMOBJ: 'Sungai Cikeas Percabangan', REMARK: 'Sungai' },
    geometry: {
      type: 'MultiLineString',
      coordinates: [
        [
          [106.9500, -6.2800],
          [106.9600, -6.2800],
        ],
        [
          [106.9895, -6.2401],
          [106.9905, -6.2401],
        ],
      ],
    },
  };

  it('transforms WGS84 <-> EPSG:32748 (UTM Zone 48S) with sub-millimeter precision against PROJ', () => {
    const utm = wgs84ToUtm48S(-6.2642, 106.9869);
    expect(utm).not.toBeNull();
    expect(utm.crs).toBe('EPSG:32748');
    // Nilai referensi pyproj EPSG:32748 untuk (106.9869, -6.2642): (719824.21659, 9307174.03359)
    expect(utm.x).toBeCloseTo(719824.2166, 3);
    expect(utm.y).toBeCloseTo(9307174.0336, 3);

    const inv = utm48SToWgs84(utm.x, utm.y);
    expect(inv).not.toBeNull();
    expect(inv.lat).toBeCloseTo(-6.2642, 7);
    expect(inv.lng).toBeCloseTo(106.9869, 7);
  });

  it('extracts coordinate arrays from LineString, MultiLineString, and GeometryCollection', () => {
    const geomCollection = {
      type: 'GeometryCollection',
      geometries: [longLineStringRiver.geometry, multiLineStringRiver.geometry],
    };
    expect(extractLineCoordinateArrays(longLineStringRiver.geometry)).toHaveLength(1);
    expect(extractLineCoordinateArrays(multiLineStringRiver.geometry)).toHaveLength(2);
    expect(extractLineCoordinateArrays(geomCollection)).toHaveLength(3);
  });

  it('is 100% invariant to segment coordinate direction (AB vs BA) and vertex density', () => {
    const segForward = closestPointOnSegment(
      sampleFloodPoint.lat,
      sampleFloodPoint.lng,
      -6.2402,
      106.9780,
      -6.2402,
      107.0020
    );
    const segBackward = closestPointOnSegment(
      sampleFloodPoint.lat,
      sampleFloodPoint.lng,
      -6.2402,
      107.0020,
      -6.2402,
      106.9780
    );
    expect(segForward.distance).toBe(segBackward.distance);
    expect(segForward.lat).toBe(segBackward.lat);
    expect(segForward.lng).toBe(segBackward.lng);

    // Sungai dengan 2 vertex vs sungai dengan 6 vertex kolinear pada garis UTM yang sama
    const pUtm = wgs84ToUtm48S(sampleFloodPoint.lat, sampleFloodPoint.lng);
    const twoVertexCoords = [-500, 500].map((dx) => {
      const w = utm48SToWgs84(pUtm.x + dx, pUtm.y + 120);
      return [w.lng, w.lat];
    });
    const denseVertexCoords = [-500, -300, -100, 100, 300, 500].map((dx) => {
      const w = utm48SToWgs84(pUtm.x + dx, pUtm.y + 120);
      return [w.lng, w.lat];
    });

    const d2 = distanceToRiverFeature(sampleFloodPoint.lat, sampleFloodPoint.lng, {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: twoVertexCoords },
    });
    const dDense = distanceToRiverFeature(sampleFloodPoint.lat, sampleFloodPoint.lng, {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: denseVertexCoords },
    });
    expect(d2.distance).toBeCloseTo(120, 4);
    expect(dDense.distance).toBeCloseTo(120, 4);
    expect(Math.abs(d2.distance - dDense.distance)).toBeLessThan(1e-6);
  });

  it('resolves point in Kota Bekasi polygon and ignores non-Kota Bekasi polygon', () => {
    const mockGeojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { NAMOBJ: 'Margajaya', WADMKC: 'Bekasi Selatan', WADMKK: 'Kota Bekasi' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [106.980, -6.250],
              [107.000, -6.250],
              [107.000, -6.230],
              [106.980, -6.230],
              [106.980, -6.250],
            ]],
          },
        },
        {
          type: 'Feature',
          properties: { NAMOBJ: 'Cibitung', WADMKC: 'Cibitung', WADMKK: 'Kabupaten Bekasi' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [107.050, -6.250],
              [107.100, -6.250],
              [107.100, -6.200],
              [107.050, -6.200],
              [107.050, -6.250],
            ]],
          },
        },
      ],
    };
    const found = findKotaBekasiKelurahanByPoint(-6.240, 106.990, mockGeojson);
    expect(found).not.toBeNull();
    expect(found.NAMOBJ).toBe('Margajaya');

    const outsideKotaBekasi = findKotaBekasiKelurahanByPoint(-6.225, 107.075, mockGeojson);
    expect(outsideKotaBekasi).toBeNull();
  });
});

describe('Section 10.A — 10 Kasus Uji Wajib Buffer Analysis (EPSG:32748)', () => {
  const basePoint = {
    id: 101,
    lat: -6.2500,
    lng: 106.9800,
    kecamatan: 'BEKASI SELATAN',
    nama_kecamatan: 'Bekasi Selatan',
    kelurahan_spasial: 'Kayuringinjaya',
    kecamatan_spasial: 'Bekasi Selatan',
    jumlah_titik: 15,
    severity: 'medium',
  };

  it('A.1 Titik tepat di atas sungai (jarak = 0 m)', () => {
    const river0m = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 0, { NAMOBJ: 'Sungai Tepat 0m' });
    const res = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [river0m] }, 350);
    expect(res).toHaveLength(1);
    expect(res[0].crs).toBe(SPATIAL_CRS);
    expect(res[0].drainageInBuffer).toBe(1);
    expect(res[0].coverage).toBe('Terlayani');
    expect(res[0].nearestDrainage.distanceMeters).toBeCloseTo(0, 2);
  });

  it('A.2 Titik sangat dekat sungai (< 50 m)', () => {
    const river25m = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 25, { NAMOBJ: 'Sungai 25m' });
    const res = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [river25m] }, 100);
    expect(res[0].drainageInBuffer).toBe(1);
    expect(res[0].coverage).toBe('Terlayani');
    expect(res[0].nearestDrainage.distanceMeters).toBeCloseTo(25, 1);
  });

  it('A.3 Titik tepat di batas radius (distance === bufferRadius) dan sedikit di dalam radius (349.9 m)', () => {
    const river350m = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 350, { NAMOBJ: 'Sungai Batas 350m' });
    const resExact = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [river350m] }, 350);
    expect(resExact[0].drainageInBuffer).toBe(1);
    expect(resExact[0].coverage).toBe('Terlayani');
    expect(resExact[0].nearestDrainage.distanceMeters).toBeCloseTo(350, 2);

    const river349_9m = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 349.9, { NAMOBJ: 'Sungai Dalam 349.9m' });
    const resInside = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [river349_9m] }, 350);
    expect(resInside[0].drainageInBuffer).toBe(1);
    expect(resInside[0].coverage).toBe('Terlayani');
    expect(resInside[0].nearestDrainage.distanceMeters).toBeCloseTo(349.9, 2);
  });

  it('A.4 Titik sedikit di luar radius (distance = 351 m > radius 350 m)', () => {
    const river351m = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 351, { NAMOBJ: 'Sungai Luar 351m' });
    const res = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [river351m] }, 350);
    expect(res[0].drainageInBuffer).toBe(0);
    expect(res[0].coverage).toBe('Tidak Terlayani');
    expect(res[0].nearestDrainage.distanceMeters).toBeCloseTo(351, 1);
  });

  it('A.5 Titik jauh dari sungai (> 1000 m)', () => {
    const river1500m = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 1500, { NAMOBJ: 'Sungai Jauh 1500m' });
    const res = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [river1500m] }, 500);
    expect(res[0].drainageInBuffer).toBe(0);
    expect(res[0].coverage).toBe('Tidak Terlayani');
    expect(res[0].nearestDrainage.distanceMeters).toBeCloseTo(1500, 1);
  });

  it('A.6 Sungai LineString (segmen lurus melewati dekat titik, vertex jauh > 1 km)', () => {
    const pUtm = wgs84ToUtm48S(basePoint.lat, basePoint.lng);
    const farWest = utm48SToWgs84(pUtm.x - 1500, pUtm.y + 40);
    const farEast = utm48SToWgs84(pUtm.x + 1500, pUtm.y + 40);
    const lineRiver = {
      type: 'Feature',
      properties: { NAMOBJ: 'Kali Bekasi LineString' },
      geometry: { type: 'LineString', coordinates: [[farWest.lng, farWest.lat], [farEast.lng, farEast.lat]] },
    };
    const res = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [lineRiver] }, 100);
    expect(res[0].drainageInBuffer).toBe(1);
    expect(res[0].nearestDrainage.distanceMeters).toBeCloseTo(40, 1);
  });

  it('A.7 Sungai MultiLineString dan GeometryCollection', () => {
    const multiRiver = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 80, { NAMOBJ: 'Sungai Multi' }, 'MultiLineString');
    const geomCollectionRiver = {
      type: 'Feature',
      properties: { NAMOBJ: 'Sungai Koleksi' },
      geometry: {
        type: 'GeometryCollection',
        geometries: [buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 120).geometry],
      },
    };
    const res = runBufferAnalysis(
      [basePoint],
      { type: 'FeatureCollection', features: [multiRiver, geomCollectionRiver] },
      150
    );
    expect(res[0].drainageInBuffer).toBe(2);
    expect(res[0].coverage).toBe('Terlayani');
  });

  it('A.8 Radius kecil (100 m) hanya menghitung sungai dalam 100 m', () => {
    const r80 = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 80, { NAMOBJ: 'Sungai 80m' });
    const r250 = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 250, { NAMOBJ: 'Sungai 250m' });
    const res = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [r80, r250] }, 100);
    expect(res[0].drainageInBuffer).toBe(1);
    expect(res[0].riversInBuffer).toHaveLength(1);
    expect(res[0].riversInBuffer[0].name).toBe('Sungai 80m');
  });

  it('A.9 Radius besar (2000 m) mencakup seluruh sungai dalam 2000 m', () => {
    const r80 = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 80, { NAMOBJ: 'Sungai 80m' });
    const r250 = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 250, { NAMOBJ: 'Sungai 250m' });
    const r1800 = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 1800, { NAMOBJ: 'Sungai 1800m' });
    const res = runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [r80, r250, r1800] }, 2000);
    expect(res[0].drainageInBuffer).toBe(3);
    expect(res[0].coverage).toBe('Terlayani');
  });

  it('A.10 Geometri kosong / tidak valid / duplikat dan radius tidak valid ditangani dengan aman', () => {
    const validRiver = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 90, { NAMOBJ: 'Sungai Valid' });
    const duplicateRiver = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 90, { NAMOBJ: 'Sungai Duplikat' });
    const emptyRiver = { type: 'Feature', properties: { NAMOBJ: 'Kosong' }, geometry: { type: 'LineString', coordinates: [] } };
    const nullGeomRiver = { type: 'Feature', properties: { NAMOBJ: 'Null' }, geometry: null };
    const badCoordRiver = {
      type: 'Feature',
      properties: { NAMOBJ: 'BadCoord' },
      geometry: { type: 'LineString', coordinates: [[NaN, -6.25], [999, -99]] },
    };

    const res = runBufferAnalysis(
      [basePoint],
      { type: 'FeatureCollection', features: [validRiver, duplicateRiver, emptyRiver, nullGeomRiver, badCoordRiver] },
      200
    );
    // Sungai duplikat identik tidak dihitung dua kali; geometri rusak diabaikan tanpa error
    expect(res).toHaveLength(1);
    expect(res[0].drainageInBuffer).toBe(1);

    // Radius <= 0, NaN, atau null harus ditolak (mengembalikan array kosong)
    expect(runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [validRiver] }, 0)).toEqual([]);
    expect(runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [validRiver] }, -200)).toEqual([]);
    expect(runBufferAnalysis([basePoint], { type: 'FeatureCollection', features: [validRiver] }, NaN)).toEqual([]);
  });

  it('A.11 Segmen dengan panjang nol, titik dekat vertex vs tengah segmen, dan deduplikasi geometri presisi (Section 5.C & 5.D)', () => {
    const pUtm = wgs84ToUtm48S(basePoint.lat, basePoint.lng);
    const vZero = utm48SToWgs84(pUtm.x + 60, pUtm.y + 80); // jarak tepat sqrt(60^2 + 80^2) = 100 m
    const zeroLengthSegRiver = {
      type: 'Feature',
      properties: { NAMOBJ: 'Sungai Segmen Nol' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [vZero.lng, vZero.lat],
          [vZero.lng, vZero.lat],
        ],
      },
    };
    const resZeroSeg = runBufferAnalysis(
      [basePoint],
      { type: 'FeatureCollection', features: [zeroLengthSegRiver] },
      105
    );
    expect(resZeroSeg[0].drainageInBuffer).toBe(1);
    expect(resZeroSeg[0].nearestDrainage.distanceMeters).toBeCloseTo(100, 2);

    // Uji deduplikasi arah terbalik (AB vs BA), MultiLineString urutan bagian berbeda,
    // dan pastikan geometri hampir identik (bergeser 0.05 m / ~5e-7 deg) TIDAK terhapus sebagai duplikat
    const ptA = utm48SToWgs84(pUtm.x - 100, pUtm.y + 50);
    const ptB = utm48SToWgs84(pUtm.x, pUtm.y + 50);
    const ptC = utm48SToWgs84(pUtm.x + 100, pUtm.y + 90);
    const ptA_near = utm48SToWgs84(pUtm.x - 100, pUtm.y + 50.05);
    const ptB_near = utm48SToWgs84(pUtm.x, pUtm.y + 50.05);

    const riverForward = {
      type: 'Feature',
      properties: { NAMOBJ: 'Sungai Maju' },
      geometry: { type: 'LineString', coordinates: [[ptA.lng, ptA.lat], [ptB.lng, ptB.lat], [ptC.lng, ptC.lat]] },
    };
    const riverBackward = {
      type: 'Feature',
      properties: { NAMOBJ: 'Sungai Mundur Identik' },
      geometry: { type: 'LineString', coordinates: [[ptC.lng, ptC.lat], [ptB.lng, ptB.lat], [ptA.lng, ptA.lat]] },
    };
    const riverPermutedDistinct = {
      type: 'Feature',
      properties: { NAMOBJ: 'Sungai Urutan Vertex Berbeda' },
      geometry: { type: 'LineString', coordinates: [[ptA.lng, ptA.lat], [ptC.lng, ptC.lat], [ptB.lng, ptB.lat]] },
    };
    const riverAlmostIdentical = {
      type: 'Feature',
      properties: { NAMOBJ: 'Sungai Hampir Identik (+5 cm)' },
      geometry: { type: 'LineString', coordinates: [[ptA_near.lng, ptA_near.lat], [ptB_near.lng, ptB_near.lat], [ptC.lng, ptC.lat]] },
    };
    const multiPart12 = {
      type: 'Feature',
      properties: { NAMOBJ: 'Multi 1-2' },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[ptA.lng, ptA.lat], [ptB.lng, ptB.lat]],
          [[ptB.lng, ptB.lat], [ptC.lng, ptC.lat]],
        ],
      },
    };
    const multiPart21 = {
      type: 'Feature',
      properties: { NAMOBJ: 'Multi 2-1 Duplikat' },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[ptB.lng, ptB.lat], [ptC.lng, ptC.lat]],
          [[ptA.lng, ptA.lat], [ptB.lng, ptB.lat]],
        ],
      },
    };

    const resDedup = runBufferAnalysis(
      [basePoint],
      {
        type: 'FeatureCollection',
        // riverBackward mendeduplikasi riverForward; multiPart21 mendeduplikasi multiPart12.
        // Tersisa 4 geometri unik: riverForward, riverPermutedDistinct, riverAlmostIdentical, multiPart12
        features: [riverForward, riverBackward, riverPermutedDistinct, riverAlmostIdentical, multiPart12, multiPart21],
      },
      200
    );
    expect(resDedup[0].drainageInBuffer).toBe(4);
  });
});

describe('Section 10.B — 10 Kasus Uji Wajib Proximity Analysis (EPSG:32748)', () => {
  const basePoint = {
    id: 201,
    lat: -6.2500,
    lng: 106.9800,
    kecamatan: 'BEKASI TIMUR',
    nama_kecamatan: 'Bekasi Timur',
    kelurahan_spasial: 'Margahayu',
    kecamatan_spasial: 'Bekasi Timur',
    jumlah_titik: 18,
    severity: 'medium',
  };

  const runSingleProximityAtOffset = (offsetMeters) => {
    const river = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, offsetMeters, {
      NAMOBJ: `Sungai_${offsetMeters}m`,
    });
    const res = runProximityAnalysis([basePoint], { type: 'FeatureCollection', features: [river] });
    return res[0];
  };

  it('B.1 Jarak 0 m -> Sangat Dekat & Skor Baik', () => {
    const r = runSingleProximityAtOffset(0);
    expect(r.nearestDrainage.distanceMeters).toBeCloseTo(0, 2);
    expect(r.nearestDrainage.accessibility).toBe('Sangat Dekat');
    expect(r.proximityScore).toBe('Baik');
    expect(r.drainageInBuffer).toBeUndefined();
  });

  it('B.2 Jarak < 200 m (150 m) -> Sangat Dekat & Skor Baik', () => {
    const r = runSingleProximityAtOffset(150);
    expect(r.nearestDrainage.distanceMeters).toBeCloseTo(150, 1);
    expect(r.nearestDrainage.accessibility).toBe('Sangat Dekat');
    expect(r.proximityScore).toBe('Baik');
  });

  it('B.3 Jarak tepat pada boundary 0 m, 199.999 m, 200 m, 499.999 m, 500 m, 999.999 m, 1000 m deterministik', () => {
    expect(classifyProximityCategory(0)).toBe('Sangat Dekat');
    expect(classifyProximityCategory(199.999)).toBe('Sangat Dekat');
    expect(classifyProximityCategory(200)).toBe('Dekat');
    expect(classifyProximityCategory(499.999)).toBe('Dekat');
    expect(classifyProximityCategory(500)).toBe('Sedang');
    expect(classifyProximityCategory(999.999)).toBe('Sedang');
    expect(classifyProximityCategory(1000)).toBe('Jauh');

    expect(classifyProximityScore(0)).toBe('Baik');
    expect(classifyProximityScore(199.999)).toBe('Baik');
    expect(classifyProximityScore(200)).toBe('Baik');
    expect(classifyProximityScore(499.999)).toBe('Baik');
    expect(classifyProximityScore(500)).toBe('Sedang');
    expect(classifyProximityScore(999.999)).toBe('Sedang');
    expect(classifyProximityScore(1000)).toBe('Buruk');

    const r = runSingleProximityAtOffset(200);
    expect(r.nearestDrainage.accessibility).toBe('Dekat');
    expect(r.proximityScore).toBe('Baik');
  });

  it('B.4 Jarak 200–500 m (350 m) -> Dekat & Skor Baik', () => {
    const r = runSingleProximityAtOffset(350);
    expect(r.nearestDrainage.distanceMeters).toBeCloseTo(350, 1);
    expect(r.nearestDrainage.accessibility).toBe('Dekat');
    expect(r.proximityScore).toBe('Baik');
  });

  it('B.5 Jarak tepat 500 m -> Sedang (boundary 500 m deterministik)', () => {
    expect(classifyProximityCategory(500)).toBe('Sedang');
    expect(classifyProximityScore(500)).toBe('Sedang');
    const r = runSingleProximityAtOffset(500.05);
    expect(r.nearestDrainage.accessibility).toBe('Sedang');
    expect(r.proximityScore).toBe('Sedang');
  });

  it('B.6 Jarak 500–1000 m (750 m) -> Sedang & Skor Sedang', () => {
    const r = runSingleProximityAtOffset(750);
    expect(r.nearestDrainage.distanceMeters).toBeCloseTo(750, 1);
    expect(r.nearestDrainage.accessibility).toBe('Sedang');
    expect(r.proximityScore).toBe('Sedang');
  });

  it('B.7 Jarak tepat 1000 m -> Jauh & Skor Buruk (boundary 1000 m deterministik)', () => {
    expect(classifyProximityCategory(1000)).toBe('Jauh');
    expect(classifyProximityScore(1000)).toBe('Buruk');
    const r = runSingleProximityAtOffset(1000.05);
    expect(r.nearestDrainage.accessibility).toBe('Jauh');
    expect(r.proximityScore).toBe('Buruk');
  });

  it('B.8 Jarak > 1000 m (1450 m) -> Jauh & Skor Buruk', () => {
    const r = runSingleProximityAtOffset(1450);
    expect(r.nearestDrainage.distanceMeters).toBeCloseTo(1450, 1);
    expect(r.nearestDrainage.accessibility).toBe('Jauh');
    expect(r.proximityScore).toBe('Buruk');
  });

  it('B.9 Dua sungai dengan jarak hampir sama / sama persis memiliki tie-breaking deterministik', () => {
    // Sungai Utara (+250m) dan Sungai Selatan (-250m) memiliki jarak metrik yang sama persis
    const riverNorth = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, 250, { NAMOBJ: 'Sungai Utara 250m' });
    const riverSouth = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, -250, { NAMOBJ: 'Sungai Selatan 250m' });

    const res1 = runProximityAnalysis([basePoint], {
      type: 'FeatureCollection',
      features: [riverNorth, riverSouth],
    });
    const res2 = runProximityAnalysis([basePoint], {
      type: 'FeatureCollection',
      features: [riverNorth, riverSouth],
    });
    expect(res1[0].nearestDrainage.name).toBe('Sungai Utara 250m');
    expect(res2[0].nearestDrainage.name).toBe('Sungai Utara 250m');

    // Jika salah satu sungai sedikit lebih dekat (249.5m vs 250m), sungai yang lebih dekat selalu terpilih
    const riverSlightlyCloser = buildUtmOffsetRiverFeature(basePoint.lat, basePoint.lng, -249.5, {
      NAMOBJ: 'Sungai Selatan 249.5m',
    });
    const resCloser = runProximityAnalysis([basePoint], {
      type: 'FeatureCollection',
      features: [riverNorth, riverSlightlyCloser],
    });
    expect(resCloser[0].nearestDrainage.name).toBe('Sungai Selatan 249.5m');
  });

  it('B.10 Mendukung sungai MultiLineString dan mengembalikan koordinat titik terdekat pada segmen', () => {
    const multiRiver = buildUtmOffsetRiverFeature(
      basePoint.lat,
      basePoint.lng,
      125,
      { NAMOBJ: 'Kali Cakung MultiLine' },
      'MultiLineString'
    );
    const res = runProximityAnalysis([basePoint], {
      type: 'FeatureCollection',
      features: [multiRiver],
    });
    expect(res).toHaveLength(1);
    expect(res[0].nearestDrainage.type).toBe('Kali Cakung MultiLine');
    expect(res[0].nearestDrainage.geometryType).toBe('MultiLineString');
    expect(res[0].nearestDrainage.distanceMeters).toBeCloseTo(125, 1);
    expect(res[0].nearestDrainage.coords.lat).toBeGreaterThan(basePoint.lat);
    expect(res[0].nearestDrainage.coords.lng).toBeCloseTo(basePoint.lng, 5);
  });
});

describe('Section 10.C — 10 Kasus Uji Wajib Priority Area Scoring', () => {
  const makePoint = (overrides = {}) => ({
    id: 1,
    lat: -6.2400,
    lng: 106.9900,
    kecamatan: 'BEKASI SELATAN',
    nama_kecamatan: 'Bekasi Selatan',
    kelurahan_spasial: 'Margajaya',
    kecamatan_spasial: 'Bekasi Selatan',
    jumlah_titik: 10,
    severity: 'low',
    ...overrides,
  });

  it('C.1 Semua komponen rendah -> skor 30/100 (Monitor)', () => {
    const pt = makePoint({ jumlah_titik: 3, severity: 'low' });
    const buf = [{ id: 1, drainageInBuffer: 3 }];
    const { allScored } = runPriorityScoring([pt], buf);
    expect(allScored[0].floodCountScore).toBe(10);
    expect(allScored[0].severityScore).toBe(10);
    expect(allScored[0].bufferScore).toBe(10);
    expect(allScored[0].priorityScore).toBe(30);
    expect(allScored[0].maxPossibleScore).toBe(100);
    expect(allScored[0].priorityLevel).toBe('Monitor');
  });

  it('C.2 Semua komponen sedang -> skor 65/100 (Mendesak)', () => {
    const pt = makePoint({ jumlah_titik: 15, severity: 'medium' });
    const buf = [{ id: 1, drainageInBuffer: 1 }];
    const { allScored } = runPriorityScoring([pt], buf);
    expect(allScored[0].floodCountScore).toBe(25);
    expect(allScored[0].severityScore).toBe(20);
    expect(allScored[0].bufferScore).toBe(20);
    expect(allScored[0].priorityScore).toBe(65);
    expect(allScored[0].priorityLevel).toBe('Mendesak');
  });

  it('C.3 Semua komponen tinggi -> skor 100/100 (Sangat Mendesak)', () => {
    const pt = makePoint({ jumlah_titik: 25, severity: 'high' });
    const buf = [{ id: 1, drainageInBuffer: 0 }];
    const { allScored } = runPriorityScoring([pt], buf);
    expect(allScored[0].floodCountScore).toBe(40);
    expect(allScored[0].severityScore).toBe(30);
    expect(allScored[0].bufferScore).toBe(30);
    expect(allScored[0].priorityScore).toBe(100);
    expect(allScored[0].priorityLevel).toBe('Sangat Mendesak');
  });

  it('C.4 Kombinasi ekstrem tinggi-rendah -> skor 60/100 (Mendesak)', () => {
    const pt = makePoint({ jumlah_titik: 25, severity: 'low' });
    const buf = [{ id: 1, drainageInBuffer: 2 }];
    const { allScored } = runPriorityScoring([pt], buf);
    expect(allScored[0].floodCountScore).toBe(40);
    expect(allScored[0].severityScore).toBe(10);
    expect(allScored[0].bufferScore).toBe(10);
    expect(allScored[0].priorityScore).toBe(60);
    expect(allScored[0].priorityLevel).toBe('Mendesak');
  });

  it('C.5 drainageInBuffer boolean (true vs false) maupun numerik ditangani secara konsisten', () => {
    const pt = makePoint({ jumlah_titik: 20, severity: 'high' });
    const resFalse = runPriorityScoring([pt], [{ id: 1, drainageInBuffer: false }]);
    const resTrue = runPriorityScoring([pt], [{ id: 1, drainageInBuffer: true }]);

    expect(resFalse.bufferComponentUsed).toBe(true);
    expect(resFalse.allScored[0].bufferScore).toBe(30);
    expect(resFalse.allScored[0].priorityScore).toBe(100);

    expect(resTrue.bufferComponentUsed).toBe(true);
    expect(resTrue.allScored[0].bufferScore).toBe(10);
    expect(resTrue.allScored[0].priorityScore).toBe(80);
  });

  it('C.6 Input 0 pada jumlah_titik ditolak sebagai Data Tidak Lengkap', () => {
    const ptZero = makePoint({ jumlah_titik: 0, severity: 'high' });
    const { allScored, topPriorityAreas } = runPriorityScoring([ptZero], [{ id: 1, drainageInBuffer: 0 }]);
    expect(allScored[0].dataComplete).toBe(false);
    expect(allScored[0].priorityScore).toBeNull();
    expect(allScored[0].priorityLevel).toBe('Data Tidak Lengkap');
    expect(topPriorityAreas).toHaveLength(0);
  });

  it('C.7 Input negatif pada jumlah_titik atau drainageInBuffer ditangani tanpa menghasilkan skor tidak valid', () => {
    const ptNeg = makePoint({ jumlah_titik: -10, severity: 'high' });
    const resNegCount = runPriorityScoring([ptNeg], [{ id: 1, drainageInBuffer: 0 }]);
    expect(resNegCount.allScored[0].dataComplete).toBe(false);
    expect(resNegCount.allScored[0].priorityScore).toBeNull();

    // Jika drainageInBuffer negatif (-1), komponen buffer diabaikan (maxPossibleScore = 70)
    const ptValid = makePoint({ jumlah_titik: 20, severity: 'high' });
    const resNegBuf = runPriorityScoring([ptValid], [{ id: 1, drainageInBuffer: -1 }]);
    expect(resNegBuf.bufferComponentUsed).toBe(false);
    expect(resNegBuf.allScored[0].maxPossibleScore).toBe(70);
    expect(resNegBuf.allScored[0].priorityScore).toBe(70);
  });

  it('C.8 Input NaN / null / undefined ditandai sebagai Data Tidak Lengkap', () => {
    const invalidPoints = [
      makePoint({ id: 1, jumlah_titik: NaN, severity: 'high' }),
      makePoint({ id: 2, jumlah_titik: null, severity: 'medium' }),
      makePoint({ id: 3, jumlah_titik: undefined, severity: 'low' }),
      makePoint({ id: 4, jumlah_titik: 15, severity: null }),
      makePoint({ id: 5, jumlah_titik: 15, severity: 'invalid_severity' }),
    ];
    const { allScored, topPriorityAreas } = runPriorityScoring(invalidPoints, null);
    for (const item of allScored) {
      expect(item.dataComplete).toBe(false);
      expect(item.priorityScore).toBeNull();
      expect(item.priorityLevel).toBe('Data Tidak Lengkap');
    }
    expect(topPriorityAreas).toHaveLength(0);
  });

  it('C.9 Input ekstrem besar (jumlah_titik = 999999, drainageInBuffer = 9999) tetap berada pada rentang [0, 100]', () => {
    const ptExtreme = makePoint({ jumlah_titik: 999999, severity: 'high' });
    const { allScored } = runPriorityScoring([ptExtreme], [{ id: 1, drainageInBuffer: 9999 }]);
    expect(allScored[0].floodCountScore).toBe(40);
    expect(allScored[0].severityScore).toBe(30);
    expect(allScored[0].bufferScore).toBe(10);
    expect(allScored[0].priorityScore).toBe(80);
    expect(allScored[0].priorityScore).toBeLessThanOrEqual(100);
    expect(allScored[0].priorityScore).toBeGreaterThanOrEqual(0);
  });

  it('C.10 Urutan prioritas beberapa kelurahan/titik banjir konsisten dari tertinggi ke terendah', () => {
    const points = [
      makePoint({ id: 1, kelurahan_spasial: 'Kelurahan A', jumlah_titik: 5, severity: 'low' }),     // 10+10+10 = 30
      makePoint({ id: 2, kelurahan_spasial: 'Kelurahan B', jumlah_titik: 25, severity: 'high' }),   // 40+30+30 = 100
      makePoint({ id: 3, kelurahan_spasial: 'Kelurahan C', jumlah_titik: 15, severity: 'medium' }), // 25+20+20 = 65
      makePoint({ id: 4, kelurahan_spasial: 'Kelurahan D', jumlah_titik: 20, severity: 'high' }),   // 40+30+20 = 90
      makePoint({ id: 5, kelurahan_spasial: 'Kelurahan E', jumlah_titik: 12, severity: 'low' }),    // 25+10+10 = 45
      makePoint({ id: 6, kelurahan_spasial: 'Kelurahan F', jumlah_titik: 2, severity: 'low' }),     // 10+10+10 = 30
    ];
    const buffers = [
      { id: 1, drainageInBuffer: 2 },
      { id: 2, drainageInBuffer: 0 },
      { id: 3, drainageInBuffer: 1 },
      { id: 4, drainageInBuffer: 1 },
      { id: 5, drainageInBuffer: 3 },
      { id: 6, drainageInBuffer: 2 },
    ];
    const { topPriorityAreas } = runPriorityScoring(points, buffers);
    expect(topPriorityAreas).toHaveLength(5);
    expect(topPriorityAreas.map((a) => a.id)).toEqual([2, 4, 3, 5, 1]);
    expect(topPriorityAreas.map((a) => a.priorityScore)).toEqual([100, 90, 65, 45, 30]);
  });
});

describe('Section 10.D — End-to-End Spatial Analysis Integration on Real Kota Bekasi Datasets', () => {
  afterEach(() => {
    cleanup();
  });

  it('executes Buffer -> Proximity -> Priority Scoring on all 70 flood points and 185 river features in EPSG:32748', () => {
    const normalizedFloodPoints = realFloodGeoJson.features.map((f, idx) => ({
      id: f.properties.id ?? idx + 1,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      kecamatan: f.properties.kecamatan || f.properties.nama_kecamatan || '-',
      nama_kecamatan: f.properties.nama_kecamatan || f.properties.kecamatan || '-',
      jumlah_titik: Number(f.properties.jumlah_titik_banjir ?? f.properties.jumlah_titik ?? 0),
      severity: f.properties.severity || 'low',
    }));

    expect(normalizedFloodPoints).toHaveLength(70);
    expect(realRiverGeoJson.features).toHaveLength(185);

    // 1. Jalankan Buffer Analysis (radius 350m)
    const bufferResults = runBufferAnalysis(normalizedFloodPoints, realRiverGeoJson, 350);
    expect(bufferResults).toHaveLength(70);
    for (const r of bufferResults) {
      expect(r.crs).toBe('EPSG:32748');
      expect(r.validPoint).toBe(true);
      expect(Number.isInteger(r.drainageInBuffer)).toBe(true);
      expect(r.drainageInBuffer).toBeGreaterThanOrEqual(0);
      expect(['Terlayani', 'Tidak Terlayani']).toContain(r.coverage);
      expect(r.nearestDrainage).not.toBeNull();
      expect(r.nearestDrainage.distanceMeters).toBeGreaterThanOrEqual(0);
    }

    // 2. Jalankan Proximity Analysis & verifikasi ekuivalensi 100% terhadap Brute-Force
    const proximityResults = runProximityAnalysis(normalizedFloodPoints, realRiverGeoJson);
    expect(proximityResults).toHaveLength(70);
    for (let i = 0; i < 70; i += 1) {
      const prox = proximityResults[i];
      const buf = bufferResults[i];
      const pt = normalizedFloodPoints[i];
      expect(prox.crs).toBe('EPSG:32748');
      expect(prox.drainageInBuffer).toBeUndefined();
      // Jarak sungai terdekat pada Buffer Analysis dan Proximity Analysis harus konsisten 100%
      expect(prox.nearestDrainage.distanceMeters).toBe(buf.nearestDrainage.distanceMeters);
      expect(['Sangat Dekat', 'Dekat', 'Sedang', 'Jauh']).toContain(prox.nearestDrainage.accessibility);
      expect(['Baik', 'Sedang', 'Buruk']).toContain(prox.proximityScore);

      // Verifikasi hasil optimasi bounding-box pruning identik dengan perhitungan brute-force murni
      let bruteForceMin = Infinity;
      let bruteForceCount350 = 0;
      for (const rf of realRiverGeoJson.features) {
        const dRes = distanceToRiverFeature(pt.lat, pt.lng, rf);
        if (!dRes) continue;
        if (dRes.distance <= 350 + 1e-7) bruteForceCount350 += 1;
        if (dRes.distance < bruteForceMin) bruteForceMin = dRes.distance;
      }
      expect(prox.nearestDrainage.distanceMeters).toBeCloseTo(Number(bruteForceMin.toFixed(2)), 2);
      expect(buf.drainageInBuffer).toBe(bruteForceCount350);
    }

    // 3. Jalankan Priority Area Scoring dengan hasil Buffer Analysis
    const priorityWithBuffer = runPriorityScoring(normalizedFloodPoints, bufferResults);
    expect(priorityWithBuffer.bufferComponentUsed).toBe(true);
    expect(priorityWithBuffer.allScored).toHaveLength(70);
    expect(priorityWithBuffer.topPriorityAreas).toHaveLength(5);
    for (const top of priorityWithBuffer.topPriorityAreas) {
      expect(top.bufferComponentIncluded).toBe(true);
      expect(top.maxPossibleScore).toBe(100);
      expect(top.priorityScore).toBeGreaterThanOrEqual(0);
      expect(top.priorityScore).toBeLessThanOrEqual(100);
    }

    // 4. Render SpatialAnalysisPanel untuk memastikan tabel Buffer, Proximity, dan Priority tampil tanpa error
    const dummyIcon = 'icon.png';
    const baseSpatialProps = {
      activeTab: 'spatial',
      analysisResults: bufferResults.slice(0, 5),
      selectedAnalysis: 'buffer',
      priorityAreas: priorityWithBuffer.topPriorityAreas,
      priorityBufferUsed: true,
      exportPriorityAreasCsv: () => {},
      exportPrioritySummary: () => {},
      kecamatanData: [],
      darkMode: false,
      renderPieLabel: () => null,
      bufferRadius: 350,
      setBufferRadius: () => {},
      performBufferAnalysis: () => {},
      performProximityAnalysis: () => {},
      identifyPriorityAreas: () => {},
      mapFlagIcon: dummyIcon,
      analysisIcon: dummyIcon,
      satelliteDishIcon: dummyIcon,
      clipboardIcon: dummyIcon,
      emergencyIcon: dummyIcon,
      shoppingIcon: dummyIcon,
      stats: { total: 70, avgPerKecamatan: 5.8, highRisk: 10, totalKecamatan: 12 },
      radarData: [],
      floodPoints: normalizedFloodPoints,
      hospitalData: { features: [] },
      drainageData: realRiverGeoJson,
    };

    const { rerender } = render(React.createElement(SpatialAnalysisPanel, baseSpatialProps));
    expect(screen.getByText(/EPSG:32748 \(WGS 84 \/ UTM Zone 48S, meter\)/i)).toBeInTheDocument();

    rerender(
      React.createElement(SpatialAnalysisPanel, {
        ...baseSpatialProps,
        selectedAnalysis: 'proximity',
        analysisResults: proximityResults.slice(0, 5),
      })
    );
    expect(screen.getByText(/Jarak Titik Kejadian Banjir ke Segmen Sungai Terdekat/i)).toBeInTheDocument();

    rerender(
      React.createElement(SpatialAnalysisPanel, {
        ...baseSpatialProps,
        selectedAnalysis: 'priority',
      })
    );
    expect(screen.getByText(/Top 5 Area Prioritas/i)).toBeInTheDocument();
    expect(screen.getByText(/Komponen Buffer Analysis aktif: Skor Maksimum = 100/i)).toBeInTheDocument();
  });
});

describe('Step 1 Closeout & ML Payload / Duplicate Kelurahan ID Verification', () => {
  afterEach(() => {
    cleanup();
  });

  it('builds ML payload from real 9 kelurahan features and returns null when incomplete', () => {
    const validRecord = {
      kelurahan: 'Margajaya',
      kecamatan: 'Bekasi Selatan',
      wadmkk: 'Kota Bekasi',
      shape_area: 1945000.5,
      shape_leng: 6820.2,
      compactness: 0.5254,
      elev_mean: 19.5,
      elev_min: 14.0,
      sungai_density: 0.00215,
      dist_to_river: 85.4,
      pct_pemukiman: 0.72,
      pct_sawah: 0.0,
    };
    const payload = buildMlPayload({ kelurahanProps: validRecord });
    expect(payload).not.toBeNull();
    expect(payload.wadmkk).toBe('Kota Bekasi');
    expect(payload.shape_area).toBeCloseTo(1945000.5);
    expect(payload.dist_to_river).toBeCloseTo(85.4);

    const incompleteRecord = { ...validRecord, elev_mean: null };
    expect(buildMlPayload({ kelurahanProps: incompleteRecord })).toBeNull();
  });

  it('labels offline fallback explicitly as Estimasi Offline — Bukan Hasil Random Forest', () => {
    const validForm = {
      shape_area: 1945000.5,
      shape_leng: 6820.2,
      compactness: 0.5254,
      elev_mean: 19.5,
      elev_min: 14.0,
      sungai_density: 0.00215,
      dist_to_river: 85.4,
      pct_pemukiman: 0.72,
      pct_sawah: 0.0,
    };
    const offline = buildOfflineRiskEstimate(validForm);
    expect(offline).not.toBeNull();
    expect(offline.is_offline).toBe(true);
    expect(offline.source_label).toBe(OFFLINE_ESTIMATE_LABEL);
    expect(offline.validation_status).toBe(OFFLINE_ESTIMATE_LABEL);
    expect(['sedang', 'tinggi']).toContain(offline.predicted_class);
  });

  it('loads 48 Kota Bekasi kelurahan with unique kelurahan_id matching between JSON and GeoJSON', () => {
    const kelList = kelurahanFeaturesJson.kelurahan;
    expect(kelList).toHaveLength(48);
    expect(kelurahanGeoJson48.features).toHaveLength(48);

    const jsonIds = new Set(kelList.map((k) => k.kelurahan_id));
    const geoIds = new Set(kelurahanGeoJson48.features.map((f) => f.properties.kelurahan_id));
    expect(jsonIds.size).toBe(48);
    expect(geoIds.size).toBe(48);
    for (const id of jsonIds) {
      expect(geoIds.has(id)).toBe(true);
    }

    const labeledCount = kelList.filter((k) => k.has_flood_label).length;
    const unlabeledCount = kelList.filter((k) => !k.has_flood_label).length;
    expect(labeledCount).toBe(33);
    expect(unlabeledCount).toBe(15);
  });

  it('normalizes kelurahan_id and matches kelurahan regardless of case or whitespace', () => {
    const kelList = kelurahanFeaturesJson.kelurahan;
    expect(normalizeKelurahanId('Jatikarya')).toBe('KEL_JATIKARYA');
    expect(normalizeKelurahanId('  kel_jatikarya  ')).toBe('KEL_JATIKARYA');

    const byId = findKelurahanByIdOrName(kelList, 'KEL_JATIKARYA');
    const byLowerName = findKelurahanByIdOrName(kelList, '  jatikarya ');
    const bySpacedName = findKelurahanByIdOrName(kelList, 'Jati Karya');
    expect(byId.kelurahan_id).toBe('KEL_JATIKARYA');
    expect(byLowerName.kelurahan_id).toBe('KEL_JATIKARYA');
    expect(bySpacedName.kelurahan_id).toBe('KEL_JATIKARYA');
  });

  it('builds distinct 9-feature payloads with kelurahan_id for single and batch prediction', () => {
    const kelList = kelurahanFeaturesJson.kelurahan;
    const jatikarya = findKelurahanByIdOrName(kelList, 'KEL_JATIKARYA');
    const harapanjaya = findKelurahanByIdOrName(kelList, 'KEL_HARAPANJAYA');

    const payload1 = buildMlPayload({ kelurahanProps: jatikarya });
    const payload2 = buildMlPayload({ kelurahanProps: harapanjaya });

    expect(payload1.kelurahan_id).toBe('KEL_JATIKARYA');
    expect(payload2.kelurahan_id).toBe('KEL_HARAPANJAYA');
    for (const col of ML_FEATURE_COLUMNS) {
      expect(typeof payload1[col]).toBe('number');
      expect(Number.isFinite(payload1[col])).toBe(true);
      expect(typeof payload2[col]).toBe('number');
      expect(Number.isFinite(payload2[col])).toBe(true);
    }
    expect(payload1.elev_mean).not.toBe(payload2.elev_mean);
    expect(payload1.shape_area).not.toBe(payload2.shape_area);
  });

  it('detects duplicate kelurahan_id in batch results without overwriting or double-counting', () => {
    const kelList = kelurahanFeaturesJson.kelurahan;
    const rawBatchResponse = [
      {
        index: 0,
        kelurahan_id: 'KEL_JATIKARYA',
        kelurahan: 'Jatikarya',
        kecamatan: 'Jatisampurna',
        success: true,
        predicted_class: 'sedang',
        risk_score: 68.0,
        probabilities: { sedang: 0.8, tinggi: 0.2 },
        confidence: 80.0,
      },
      {
        index: 1,
        kelurahan_id: 'KEL_JATIKARYA',
        kelurahan: 'Jatikarya',
        kecamatan: 'Jatisampurna',
        success: true, // Simulasi bahkan jika response mentah menandai true, frontend tetap menolak duplikat
        predicted_class: 'tinggi',
        risk_score: 96.0,
        probabilities: { sedang: 0.1, tinggi: 0.9 },
        confidence: 90.0,
      },
      {
        index: 2,
        kelurahan_id: 'KEL_HARAPANJAYA',
        kelurahan: 'Harapanjaya',
        kecamatan: 'Bekasi Utara',
        success: true,
        predicted_class: 'tinggi',
        risk_score: 88.0,
        probabilities: { sedang: 0.3, tinggi: 0.7 },
        confidence: 70.0,
      },
    ];

    const enriched = enrichAndDeduplicateBatchResults(rawBatchResponse, kelList);
    expect(enriched).toHaveLength(3);
    expect(enriched[0].success).toBe(true);
    expect(enriched[0].predicted_class).toBe('sedang');

    // Kemunculan kedua KEL_JATIKARYA ditandai gagal dengan kode DUPLICATE_KELURAHAN_ID
    expect(enriched[1].success).toBe(false);
    expect(enriched[1].code).toBe('DUPLICATE_KELURAHAN_ID');
    expect(enriched[1].duplicate_of_index).toBe(0);
    expect(enriched[1].predicted_class).toBeUndefined();
    expect(enriched[1].error).toMatch(/duplikat/i);

    expect(enriched[2].success).toBe(true);
    expect(enriched[2].predicted_class).toBe('tinggi');

    // Ringkasan batch hanya menghitung 2 sukses (1 sedang, 1 tinggi) dan 1 gagal
    const summary = summarizeBatchResults(enriched);
    expect(summary.total).toBe(3);
    expect(summary.success).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(1);
    expect(summary.avgRiskScore).toBe('78.0');
  });

  it('formats model output probabilities consistently and enforces prototype validation status', () => {
    const formatted = formatModelProbabilities({ sedang: 0.425, tinggi: 0.575 });
    expect(formatted.sedangPct).toBe('42.5');
    expect(formatted.tinggiPct).toBe('57.5');
    expect(formatted.totalPct).toBeCloseTo(100.0, 1);

    expect(ML_VALIDATION_STATUS_UPPER).toBe('PROTOTIPE — BELUM TERVALIDASI');
    expect(ML_VALIDATION_NOTE).toContain('prototipe penelitian');
    expect(ML_ERROR_MESSAGES.SERVICE_UNAVAILABLE).toBe(
      'Layanan prediksi tidak tersedia. Periksa koneksi ke server.'
    );
  });

  it('renders single prediction, unlabeled kelurahan notice, duplicate batch error, and disables offline fallback button when API is offline', () => {
    const kelList = kelurahanFeaturesJson.kelurahan;
    const unlabeledKel = kelList.find((k) => !k.has_flood_label);

    const baseProps = {
      darkMode: false,
      mlModelInfo: { status: 'ok', model_loaded: true, inference_ready: true, model_version: 'rf-logo-bekasi-v2', training_samples: 33 },
      mlModelMetadata: { algorithm: 'RandomForestClassifier', model_version: 'rf-logo-bekasi-v2', total_kelurahan_kota_bekasi: 48 },
      mlPickMode: false,
      onTogglePickMode: () => {},
      mlPickedPoint: { lat: unlabeledKel.centroid_lat, lng: unlabeledKel.centroid_lng },
      mlPickedKelurahan: unlabeledKel,
      kelurahanList: kelList,
      onSelectKelurahanByName: () => {},
      onClearPickedPoint: () => {},
      mlForm: { elev_mean: unlabeledKel.features.elev_mean },
      onMlFormChange: () => {},
      mlStatus: 'done',
      mlErrorMessage: '',
      onAnalyzeSingle: () => {},
      mlResult: {
        kelurahan_id: unlabeledKel.kelurahan_id,
        kelurahan_name: unlabeledKel.kelurahan,
        kelurahan: unlabeledKel.kelurahan,
        predicted_class: 'sedang',
        risk_score: 71.2,
        probabilities: { sedang: 0.72, tinggi: 0.28 },
        confidence: 72.0,
        model_status: 'PROTOTIPE — BELUM TERVALIDASI',
      },
      mlDerived: {
        hospital: { name: 'RS Umum Bekasi', dist: 1.45 },
        duration: '6-24 jam',
        advice: { urgency: 'WASPADA TINGGI', text: 'Pantau informasi BPBD setempat.' },
      },
      mlBatchScope: 'all',
      onMlBatchScopeChange: () => {},
      mlBatchStatus: 'done',
      mlBatchErrorMessage: '',
      onAnalyzeBatch: () => {},
      mlBatchRiskFilter: 'all',
      onMlBatchRiskFilterChange: () => {},
      mlBatchSortBy: 'priority',
      onMlBatchSortByChange: () => {},
      mlBatchSummary: { total: 2, success: 1, failed: 1, high: 0, medium: 1, avgRiskScore: '71.2' },
      sortedBatchResults: [
        {
          kelurahan_id: 'KEL_JATIKARYA',
          kelurahan: 'Jatikarya',
          kecamatan: 'Jatisampurna',
          success: true,
          predicted_class: 'sedang',
          risk_score: 71.2,
          probabilities: { sedang: 0.72, tinggi: 0.28 },
          has_flood_label: false,
        },
        {
          kelurahan_id: 'KEL_JATIKARYA',
          kelurahan: 'Jatikarya',
          kecamatan: 'Jatisampurna',
          success: false,
          code: 'DUPLICATE_KELURAHAN_ID',
          error: "ID kelurahan duplikat dalam satu permintaan batch: 'KEL_JATIKARYA' (sudah ada pada indeks 0).",
          has_flood_label: false,
        },
      ],
      filteredKelurahanCount: 48,
      labeledKelurahanCount: 33,
      totalKelurahanCount: 48,
      onExportBatchResultsCsv: () => {},
      onExportBatchSummary: () => {},
    };

    const { rerender } = render(React.createElement(MlAnalysisPanel, baseProps));

    expect(screen.getByText(/termasuk 15 kelurahan tanpa catatan titik banjir historis/i)).toBeInTheDocument();
    expect(screen.getByText(/Probabilitas keluaran model/i)).toBeInTheDocument();
    expect(screen.getByText(/Indeks Turunan/i)).toBeInTheDocument();
    expect(screen.getByText(/ID kelurahan duplikat dalam satu permintaan batch/i)).toBeInTheDocument();

    rerender(
      React.createElement(MlAnalysisPanel, {
        ...baseProps,
        mlModelInfo: null,
        mlModelMetadata: null,
        mlStatus: 'no-api',
        mlResult: null,
        mlDerived: null,
        mlBatchStatus: 'no-api',
      })
    );

    expect(screen.getAllByText(/Layanan prediksi tidak tersedia\. Periksa koneksi ke server\./i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: /Gunakan Estimasi Offline/i })).not.toBeInTheDocument();
  });
});
