/**
 * Daftar 9 fitur wajib model Random Forest B-DRAIN sesuai urutan di backend Flask (ml/api.py).
 */
export const ML_FEATURE_COLUMNS = [
  "shape_area",
  "shape_leng",
  "compactness",
  "elev_mean",
  "elev_min",
  "sungai_density",
  "dist_to_river",
  "pct_pemukiman",
  "pct_sawah",
];

/**
 * Label resmi untuk membedakan estimasi lokal saat server API tidak aktif.
 */
export const OFFLINE_ESTIMATE_LABEL = "Estimasi Offline — Bukan Hasil Random Forest";

/**
 * Status validasi model yang ditampilkan di panel ML dan dashboard GIS.
 * Harus selaras dengan MODEL_VALIDATION_STATUS di ml/api.py.
 */
export const ML_VALIDATION_STATUS = "Prototipe — Belum Tervalidasi";
export const ML_VALIDATION_STATUS_UPPER = "PROTOTIPE — BELUM TERVALIDASI";

/** Catatan resmi yang menyertai status validasi pada seluruh hasil klasifikasi dan informasi model. */
export const ML_VALIDATION_NOTE =
  "Model Random Forest ini merupakan prototipe penelitian yang menggunakan data dan label keparahan dengan keterbatasan dokumentasi sumber. Hasil prediksi digunakan untuk kebutuhan eksplorasi dan analisis, bukan sebagai kepastian kejadian banjir.";

/** Pesan kesalahan standar yang ramah pengguna (Section 8). */
export const ML_ERROR_MESSAGES = {
  SERVICE_UNAVAILABLE: "Layanan prediksi tidak tersedia. Periksa koneksi ke server.",
  INCOMPLETE_FEATURES: "Data fitur kelurahan belum lengkap.",
  PREDICTION_FAILED: "Prediksi gagal diproses. Silakan coba kembali.",
  NO_RESULT: "Hasil prediksi belum tersedia untuk kelurahan ini.",
};

/**
 * Menormalisasi ID atau nama kelurahan ke format ID deterministik `KEL_<NAMA_UPPERCASE>`.
 * Menangani perbedaan kapitalisasi, spasi berlebih, dan awalan `KEL_`.
 *
 * @param {string|null|undefined} rawIdOrName ID atau nama kelurahan.
 * @returns {string} ID kelurahan terstandarisasi (contoh: "KEL_JATIKARYA"), atau string kosong jika tidak valid.
 */
export const normalizeKelurahanId = (rawIdOrName) => {
  if (rawIdOrName === null || rawIdOrName === undefined) return "";
  let raw = String(rawIdOrName).trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("KEL_")) {
    raw = raw.slice(4).trim();
  }
  const cleaned = raw.replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned ? `KEL_${cleaned}` : "";
};

/**
 * Mencari data kelurahan dari daftar 48 kelurahan Kota Bekasi berdasarkan `kelurahan_id` atau nama kelurahan.
 * Menangani perbedaan huruf besar/kecil, spasi, maupun penulisan gabungan kata.
 *
 * @param {Array<object>} kelurahanList Daftar objek kelurahan (dari kelurahan_features_48.json).
 * @param {string} idOrName `kelurahan_id` (misal "KEL_JATIKARYA") atau nama kelurahan (misal "Jatikarya").
 * @param {string} [kecamatan] Opsional nama kecamatan untuk disambiguasi.
 * @returns {object|null} Objek kelurahan yang cocok, atau null jika tidak ditemukan.
 */
export const findKelurahanByIdOrName = (kelurahanList, idOrName, kecamatan = "") => {
  if (!Array.isArray(kelurahanList) || !kelurahanList.length || !idOrName) return null;
  const targetId = normalizeKelurahanId(idOrName);
  if (!targetId) return null;
  const targetCompact = targetId.replace(/^KEL_/, "").replace(/_/g, "");
  const normKec = String(kecamatan || "").trim().toLowerCase();

  // 1. Pencocokan utama berdasarkan kelurahan_id yang ternormalisasi
  const exactMatches = kelurahanList.filter((item) => {
    const itemId = normalizeKelurahanId(item?.kelurahan_id || item?.id || item?.kelurahan || item?.NAMOBJ);
    return itemId === targetId;
  });

  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1 && normKec) {
    const byKec = exactMatches.find(
      (item) => String(item?.kecamatan || item?.WADMKC || "").trim().toLowerCase() === normKec
    );
    if (byKec) return byKec;
  }
  if (exactMatches.length > 0) return exactMatches[0];

  // 2. Pencocokan toleran spasi/tanda hubung (contoh "Jati Karya" -> "JATIKARYA")
  const compactMatches = kelurahanList.filter((item) => {
    const itemId = normalizeKelurahanId(item?.kelurahan_id || item?.id || item?.kelurahan || item?.NAMOBJ);
    const itemCompact = itemId.replace(/^KEL_/, "").replace(/_/g, "");
    return itemCompact && itemCompact === targetCompact;
  });

  if (compactMatches.length === 1) return compactMatches[0];
  if (compactMatches.length > 1 && normKec) {
    const byKec = compactMatches.find(
      (item) => String(item?.kecamatan || item?.WADMKC || "").trim().toLowerCase() === normKec
    );
    if (byKec) return byKec;
  }
  return compactMatches[0] || null;
};

/**
 * Memformat probabilitas keluaran model (`sedang` dan `tinggi`) ke dalam persentase yang konsisten.
 *
 * @param {{sedang?: number, tinggi?: number}|null|undefined} probabilities Objek probabilitas dari API.
 * @returns {{sedangProb: number, tinggiProb: number, sedangPct: string, tinggiPct: string, totalPct: number}}
 */
export const formatModelProbabilities = (probabilities) => {
  const rawSedang = Number(probabilities?.sedang);
  const rawTinggi = Number(probabilities?.tinggi);
  const sedangProb = Number.isFinite(rawSedang) && rawSedang >= 0 ? rawSedang : 0;
  const tinggiProb = Number.isFinite(rawTinggi) && rawTinggi >= 0 ? rawTinggi : 0;
  const sum = sedangProb + tinggiProb;
  const normSedang = sum > 0 ? (sedangProb / sum) * 100 : 0;
  const normTinggi = sum > 0 ? (tinggiProb / sum) * 100 : 0;
  return {
    sedangProb: sum > 0 ? sedangProb / sum : 0,
    tinggiProb: sum > 0 ? tinggiProb / sum : 0,
    sedangPct: normSedang.toFixed(1),
    tinggiPct: normTinggi.toFixed(1),
    totalPct: Number((normSedang + normTinggi).toFixed(1)),
  };
};

/**
 * Menghitung jarak lingkaran besar (great-circle) antara dua titik koordinat
 * menggunakan rumus haversine.
 *
 * @param {number} lat1 - Lintang titik pertama (derajat desimal).
 * @param {number} lon1 - Bujur titik pertama (derajat desimal).
 * @param {number} lat2 - Lintang titik kedua (derajat desimal).
 * @param {number} lon2 - Bujur titik kedua (derajat desimal).
 * @returns {number} Jarak antar kedua titik dalam kilometer (radius bumi 6371 km).
 */
export const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Mencari rumah sakit terdekat dari sebuah titik dalam kumpulan fitur GeoJSON.
 *
 * @param {number} lat - Lintang titik acuan.
 * @param {number} lon - Bujur titik acuan.
 * @param {{features: Array<{geometry: {coordinates: number[]}, properties: object}>}} hospitalGeoJson - FeatureCollection rumah sakit.
 * @returns {{name: string, address: string, dist: number}|null} Rumah sakit terdekat beserta jarak dalam kilometer, atau null jika data kosong.
 */
export const getNearestHospital = (lat, lon, hospitalGeoJson) => {
  if (!hospitalGeoJson?.features?.length) return null;

  let best = null;
  let bestDist = Infinity;

  for (const feature of hospitalGeoJson.features) {
    const [hLon, hLat] = feature.geometry.coordinates;
    const distance = haversine(lat, lon, hLat, hLon);
    if (distance < bestDist) {
      bestDist = distance;
      const properties = feature.properties;
      best = {
        name: properties.nama || properties.NAMA || properties.name || "Rumah Sakit",
        address: properties.alamat || properties.ALAMAT || properties.address || "",
        dist: bestDist,
      };
    }
  }

  return best;
};

/**
 * Memperkirakan durasi genangan berdasarkan kelas risiko dan elevasi.
 *
 * @param {string} riskClass - Kelas risiko: "tinggi", "sedang", atau nilai lain.
 * @param {number} elev - Elevasi rata-rata (elev_mean) dalam meter.
 * @returns {string} Estimasi durasi genangan dalam teks Bahasa Indonesia.
 */
export const getFloodDuration = (riskClass, elev) => {
  if (riskClass === "tinggi") {
    if (elev <= 5) return "3-7 hari (sangat lambat surut)";
    if (elev <= 12) return "2-5 hari";
    return "1-3 hari";
  }

  if (riskClass === "sedang") {
    if (elev <= 5) return "12-36 jam";
    return "6-24 jam";
  }

  return "Biasanya < 6 jam, surut cepat";
};

/**
 * Menyusun saran evakuasi beserta tingkat urgensi dan warna tampilan berdasarkan kelas risiko.
 *
 * @param {string} riskClass - Kelas risiko: "tinggi", "sedang", atau nilai lain.
 * @returns {{urgency: string, text: string, color: string, bg: string}}
 */
export const getEvacuationAdvice = (riskClass) => {
  if (riskClass === "tinggi") {
    return {
      urgency: "SEGERA EVAKUASI",
      text: "Tinggalkan area sebelum banjir tiba. Bawa dokumen penting, obat-obatan, dan kebutuhan darurat. Menuju ke shelter atau lantai atas gedung terdekat.",
      color: "#ef4444",
      bg: "#fee2e2",
    };
  }

  if (riskClass === "sedang") {
    return {
      urgency: "WASPADA TINGGI",
      text: "Pantau informasi BPBD setempat. Siapkan tas darurat dan pastikan jalur evakuasi bersih. Pindahkan barang berharga ke tempat lebih tinggi.",
      color: "#f59e0b",
      bg: "#fef3c7",
    };
  }

  return {
    urgency: "SIAGA NORMAL",
    text: "Risiko rendah, namun tetap waspada saat hujan deras. Pastikan Sungai Utama dan saluran air di sekitar rumah tidak tersumbat.",
    color: "#22c55e",
    bg: "#f0fdf4",
  };
};

/**
 * Mengonversi tingkat severity menjadi skor numerik.
 *
 * @param {string} severity - Tingkat severity: "high", "medium", atau "low".
 * @returns {number} 3 untuk "high", 2 untuk "medium", dan 1 untuk nilai lainnya.
 */
export const severityToScore = (severity) =>
  severity === "high" ? 3 : severity === "medium" ? 2 : 1;

/**
 * Mengembalikan warna penanda peta untuk kelas risiko tertentu.
 *
 * @param {string} riskClass - Kelas risiko: "tinggi", "sedang", atau nilai lain.
 * @returns {string} Kode warna heksadesimal.
 */
export const classColor = (riskClass) => {
  if (riskClass === "tinggi") return "#dc2626";
  if (riskClass === "sedang") return "#d97706";
  return "#16a34a";
};

/**
 * Mengekstrak 9 fitur spasial & topografi dari objek data kelurahan Kota Bekasi.
 * Tidak menggunakan nilai konstanta palsu apabila fitur tidak tersedia.
 *
 * @param {object|null} kelurahanObj Objek kelurahan dari kelurahan_kota_bekasi_48.geojson atau kelurahan_features_48.json.
 * @returns {object|null} Objek berisi 9 fitur numerik jika lengkap, atau null jika tidak lengkap.
 */
export const extractKelurahanFeatures = (kelurahanObj) => {
  if (!kelurahanObj || typeof kelurahanObj !== "object") return null;
  const source = kelurahanObj.features && typeof kelurahanObj.features === "object"
    ? kelurahanObj.features
    : kelurahanObj;

  const extracted = {};
  for (const col of ML_FEATURE_COLUMNS) {
    const raw = source[col];
    if (raw === undefined || raw === null || raw === "") {
      return null;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      return null;
    }
    extracted[col] = num;
  }
  return extracted;
};

/**
 * Memvalidasi apakah sebuah payload prediksi ML memiliki seluruh 9 fitur yang valid.
 *
 * @param {object|null} payload Objek payload fitur.
 * @returns {{valid: boolean, missingFields: string[]}}
 */
export const validateMlPayloadCompleteness = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { valid: false, missingFields: [...ML_FEATURE_COLUMNS] };
  }
  const missingFields = ML_FEATURE_COLUMNS.filter((col) => {
    const val = payload[col];
    return val === undefined || val === null || val === "" || !Number.isFinite(Number(val));
  });
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Menyusun payload 9 fitur untuk dikirim ke endpoint prediksi ML (/api/predict atau /api/predict/batch)
 * berdasarkan data fitur aktual kelurahan di Kota Bekasi (bukan konstanta statis).
 *
 * Jika `overrideElevation` diaktifkan (misalnya pada simulasi titik tunggal ketika pengguna mengubah
 * nilai `elev_mean` di form), maka `elev_mean` mengikuti input pengguna dan `elev_min` disesuaikan
 * secara proporsional tanpa mengubah 7 fitur spasial asli kelurahan tersebut.
 *
 * Jika `kelurahanProps` tidak tersedia atau tidak memiliki 9 fitur lengkap, fungsi mengembalikan `null`
 * agar pemanggil tidak mengirimkan nilai konstanta palsu ke backend.
 *
 * @param {object} params Parameter pembentukan payload.
 * @param {object|null} params.kelurahanProps Objek properti/fitur kelurahan Kota Bekasi.
 * @param {{elev_mean?: number}} [params.mlForm] Input form pengguna (opsional untuk override elevasi).
 * @param {boolean} [params.overrideElevation=false] Jika true, gunakan mlForm.elev_mean bila berbeda dari data dasar.
 * @returns {object|null} Payload lengkap 9 fitur + identitas kelurahan, atau null jika fitur tidak tersedia.
 */
export const buildMlPayload = ({ kelurahanProps, mlForm, overrideElevation = false } = {}) => {
  const baseFeatures = extractKelurahanFeatures(kelurahanProps);
  if (!baseFeatures) {
    return null;
  }

  let elevMean = baseFeatures.elev_mean;
  let elevMin = baseFeatures.elev_min;

  if (
    overrideElevation &&
    mlForm &&
    typeof mlForm.elev_mean === "number" &&
    Number.isFinite(mlForm.elev_mean) &&
    mlForm.elev_mean >= 0
  ) {
    const delta = mlForm.elev_mean - baseFeatures.elev_mean;
    elevMean = Number(mlForm.elev_mean);
    elevMin = Math.max(0, Math.min(elevMean, Number((baseFeatures.elev_min + delta).toFixed(4))));
  }

  const kelurahanName =
    kelurahanProps?.kelurahan ||
    kelurahanProps?.kelurahan_name ||
    kelurahanProps?.NAMOBJ ||
    kelurahanProps?.kel_key ||
    "";
  const kelurahanId = normalizeKelurahanId(
    kelurahanProps?.kelurahan_id || kelurahanProps?.id || kelurahanName
  );
  const kecamatanName =
    kelurahanProps?.kecamatan ||
    kelurahanProps?.WADMKC ||
    "";
  const wadmkkName =
    kelurahanProps?.wadmkk ||
    kelurahanProps?.WADMKK ||
    "Kota Bekasi";

  return {
    ...(kelurahanId ? { kelurahan_id: kelurahanId } : {}),
    ...(kelurahanName ? { kelurahan: String(kelurahanName), kelurahan_name: String(kelurahanName) } : {}),
    ...(kecamatanName ? { kecamatan: String(kecamatanName) } : {}),
    ...(wadmkkName ? { wadmkk: String(wadmkkName) } : {}),
    shape_area: baseFeatures.shape_area,
    shape_leng: baseFeatures.shape_leng,
    compactness: baseFeatures.compactness,
    elev_mean: elevMean,
    elev_min: elevMin,
    sungai_density: baseFeatures.sungai_density,
    dist_to_river: baseFeatures.dist_to_river,
    pct_pemukiman: baseFeatures.pct_pemukiman,
    pct_sawah: baseFeatures.pct_sawah,
  };
};

/**
 * Menghitung estimasi risiko banjir secara lokal (offline) ketika server backend Flask tidak aktif.
 *
 * PENTING: Hasil fungsi ini BUKAN keluaran model Random Forest, melainkan rumus heuristik lokal
 * yang diberi label eksplisit "Estimasi Offline — Bukan Hasil Random Forest".
 *
 * @param {object} payload Payload fitur kelurahan (dalam satuan meter UTM dan rasio [0,1]).
 * @returns {object} Objek hasil estimasi offline dengan penanda `is_offline: true`.
 */
export const buildOfflineRiskEstimate = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  const bounded = (v, min, max) => Math.min(max, Math.max(min, v));

  // Skala sesuai satuan fitur kelurahan Kota Bekasi:
  // elev_mean ~ 6 - 70 m dpl, pct_pemukiman ~ 0.1 - 0.97, sungai_density ~ 0.0004 - 0.008 m/m2, dist_to_river ~ 4 - 1022 m
  const elevMean = Number(payload.elev_mean ?? 25);
  const pctPemukiman = Number(payload.pct_pemukiman ?? 0.5);
  const sungaiDensity = Number(payload.sungai_density ?? 0.0015);
  const distToRiver = Number(payload.dist_to_river ?? 300);

  const elevComponent = bounded((35 - elevMean) * 1.2, 0, 38);
  const pemukimanComponent = bounded(pctPemukiman * 35, 0, 32);
  const densityComponent = bounded(sungaiDensity * 4500, 0, 18);
  const proximityComponent = bounded(((600 - distToRiver) / 600) * 12, 0, 12);

  const scoreRaw = elevComponent + pemukimanComponent + densityComponent + proximityComponent;
  const riskScore = Math.round(bounded(scoreRaw, 1, 100));
  const predictedClass = riskScore >= 55 ? "tinggi" : "sedang";

  const high = bounded((riskScore - 25) / 55, 0.05, 0.95);
  const medium = bounded(1 - high, 0.05, 0.95);
  const total = high + medium || 1;

  return {
    predicted_class: predictedClass,
    risk_score: riskScore,
    confidence: Number(((0.55 + bounded(Math.abs(riskScore - 55) / 150, 0, 0.3)) * 100).toFixed(1)),
    probabilities: {
      sedang: Number((medium / total).toFixed(3)),
      tinggi: Number((high / total).toFixed(3)),
    },
    is_offline: true,
    source_label: OFFLINE_ESTIMATE_LABEL,
    model_version: "offline-demo-v1",
    validation_status: OFFLINE_ESTIMATE_LABEL,
  };
};

/**
 * Memperkaya hasil batch prediksi dari backend dengan metadata kelurahan serta
 * memastikan tidak ada `kelurahan_id` duplikat yang sukses dua kali atau menimpa hasil
 * secara diam-diam dalam satu permintaan batch.
 *
 * Jika satu `kelurahan_id` muncul lebih dari satu kali dalam satu batch:
 * - Kemunculan pertama tetap diproses sesuai statusnya.
 * - Kemunculan berikutnya ditandai `success: false` dengan `code: "DUPLICATE_KELURAHAN_ID"`
 *   dan pesan error eksplisit.
 *
 * @param {Array<object>} rawResults Array `results` dari respons `/api/predict/batch`.
 * @param {Array<object>} targetKelurahan Daftar kelurahan sumber.
 * @returns {Array<object>} Daftar hasil batch yang telah diperkaya dan dideduplikasi.
 */
export const enrichAndDeduplicateBatchResults = (rawResults, targetKelurahan = []) => {
  if (!Array.isArray(rawResults)) return [];
  const seenKelurahanIds = new Map();

  return rawResults.map((row, idx) => {
    const sourceIndex = typeof row?.index === "number" ? row.index : idx;
    const sourceKel =
      findKelurahanByIdOrName(
        targetKelurahan,
        row?.kelurahan_id || row?.id || row?.kelurahan,
        row?.kecamatan
      ) || {};
    const kelId = normalizeKelurahanId(
      row?.kelurahan_id || sourceKel.kelurahan_id || row?.id || sourceKel.kelurahan
    );
    const lat = Number(sourceKel.centroid_lat ?? row?.lat);
    const lng = Number(sourceKel.centroid_lng ?? row?.lng);
    const jumlahTitik = Number(sourceKel.jumlah_titik_akumulasi ?? 0);

    let isSuccess = Boolean(row?.success);
    let errorMsg = row?.error || null;
    let errorCode = row?.code || null;
    let duplicateOfIndex = row?.duplicate_of_index ?? null;

    if (kelId) {
      if (seenKelurahanIds.has(kelId)) {
        const firstIdx = seenKelurahanIds.get(kelId);
        isSuccess = false;
        errorCode = "DUPLICATE_KELURAHAN_ID";
        duplicateOfIndex = firstIdx;
        errorMsg =
          row?.code === "DUPLICATE_KELURAHAN_ID" && row?.error
            ? row.error
            : `ID kelurahan duplikat dalam satu permintaan batch: '${kelId}' (sudah ada pada indeks ${firstIdx}). Hanya kemunculan pertama yang diproses.`;
      } else {
        seenKelurahanIds.set(kelId, sourceIndex);
      }
    }

    const priorityScore = isSuccess
      ? ((row?.risk_score || 0) * 0.65) + ((row?.confidence || 0) * 0.2) + (jumlahTitik * 0.15)
      : 0;

    return {
      ...row,
      success: isSuccess,
      ...(errorMsg ? { error: errorMsg } : {}),
      ...(errorCode ? { code: errorCode } : {}),
      ...(duplicateOfIndex !== null ? { duplicate_of_index: duplicateOfIndex } : {}),
      ...(isSuccess ? {} : { predicted_class: undefined, risk_score: undefined, probabilities: undefined }),
      index: sourceIndex,
      id: kelId || row?.id || `item-${sourceIndex}`,
      kelurahan_id: kelId,
      kelurahan_name: row?.kelurahan_name || row?.kelurahan || sourceKel.kelurahan || "-",
      kelurahan: row?.kelurahan || row?.kelurahan_name || sourceKel.kelurahan || "-",
      kecamatan: row?.kecamatan || sourceKel.kecamatan || "-",
      nama_kecamatan: sourceKel.kecamatan || row?.kecamatan || "-",
      lat,
      lng,
      jumlah_titik: jumlahTitik,
      n_points: sourceKel.n_points || 0,
      has_flood_label: Boolean(sourceKel.has_flood_label),
      label_status: sourceKel.label_status || "",
      historical_class: sourceKel.label_B || sourceKel.severity_max_raw || "Tidak Berlabel",
      priority_score: Number(priorityScore.toFixed(2)),
    };
  });
};

/**
 * Menghitung ringkasan hasil prediksi batch tanpa menghitung ganda kelurahan duplikat atau item gagal.
 *
 * @param {Array<object>} enrichedResults Hasil dari `enrichAndDeduplicateBatchResults`.
 * @returns {{total: number, success: number, failed: number, high: number, medium: number, avgRiskScore: string}}
 */
export const summarizeBatchResults = (enrichedResults = []) => {
  const rows = Array.isArray(enrichedResults) ? enrichedResults : [];
  const successRows = rows.filter((r) => r && r.success);
  const highCount = successRows.filter((r) => r.predicted_class === "tinggi").length;
  const mediumCount = successRows.filter((r) => r.predicted_class === "sedang").length;
  const avgRiskScore = successRows.length
    ? (successRows.reduce((sum, row) => sum + (Number(row.risk_score) || 0), 0) / successRows.length).toFixed(1)
    : "0.0";

  return {
    total: rows.length,
    success: successRows.length,
    failed: rows.length - successRows.length,
    high: highCount,
    medium: mediumCount,
    avgRiskScore,
  };
};

