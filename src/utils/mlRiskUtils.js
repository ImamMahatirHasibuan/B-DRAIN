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
  // Konversi derajat ke radian.
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
 * Koordinat setiap fitur dibaca sebagai [bujur, lintang] sesuai standar GeoJSON.
 * Nama dan alamat diambil dari properti dengan beberapa kemungkinan nama field
 * (huruf kecil, huruf besar, atau bahasa Inggris). Jika tidak ditemukan, nama
 * diisi "Rumah Sakit" dan alamat diisi string kosong.
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
 * Semakin rendah elevasi pada kelas "tinggi", semakin lama air surut.
 *
 * @param {string} riskClass - Kelas risiko: "tinggi", "sedang", atau nilai lain (diperlakukan sebagai rendah).
 * @param {number} elev - Elevasi rata-rata (elev_mean) yang dipakai sebagai ambang batas.
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
 * Menyusun saran evakuasi beserta tingkat urgensi dan warna tampilan
 * berdasarkan kelas risiko.
 *
 * @param {string} riskClass - Kelas risiko: "tinggi", "sedang", atau nilai lain (diperlakukan sebagai rendah).
 * @returns {{urgency: string, text: string, color: string, bg: string}} Objek berisi label urgensi, teks saran, warna teks (hex), dan warna latar (hex).
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
 * @param {string} riskClass - Kelas risiko: "tinggi", "sedang", atau nilai lain (diperlakukan sebagai rendah).
 * @returns {string} Kode warna heksadesimal: merah untuk "tinggi", oranye untuk "sedang", dan hijau untuk lainnya.
 */
export const classColor = (riskClass) => {
  if (riskClass === "tinggi") return "#dc2626";
  if (riskClass === "sedang") return "#d97706";
  return "#16a34a";
};

/**
 * Menyusun payload fitur untuk dikirim ke endpoint prediksi ML.
 * Hanya field "elev_mean" dan "elev_min" yang berasal dari input form.
 * Field lainnya adalah nilai tetap (konstanta) yang ditulis langsung di fungsi ini.
 *
 * Catatan: parameter "lat" dan "lon" diterima tetapi tidak dipakai di dalam fungsi.
 *
 * @param {object} params - Parameter fungsi.
 * @param {number} params.lat - Lintang titik yang dipilih (saat ini tidak dipakai).
 * @param {number} params.lon - Bujur titik yang dipilih (saat ini tidak dipakai).
 * @param {{elev_mean: number}} params.mlForm - Data input form, berisi elevasi rata-rata.
 * @returns {{elev_mean: number, elev_min: number, sungai_density: number, dist_to_river: number, pct_pemukiman: number, pct_sawah: number, shape_area: number, shape_leng: number, compactness: number}} Payload fitur model.
 */
export const buildMlPayload = ({ lat, lon, mlForm }) => ({
  // Elevasi minimum diperkirakan 3 satuan di bawah rata-rata, dengan batas bawah 0.
  elev_mean: mlForm.elev_mean,
  elev_min: Math.max(0, mlForm.elev_mean - 3),
  sungai_density: 0.08,
  dist_to_river: 0.005,
  pct_pemukiman: 0.65,
  pct_sawah: 0.05,
  shape_area: 0.0005,
  shape_leng: 0.15,
  compactness: 0.28,
  // centroid removed to avoid spatial overfitting; use aggregated spatial features instead
});

/**
 * Menghitung estimasi risiko banjir secara lokal (offline) sebagai cadangan
 * ketika layanan prediksi ML tidak tersedia. Hasil bersifat demo dan
 * ditandai dengan model_version "offline-demo-v1".
 *
 * Skor mentah dihitung dari tiga komponen:
 * - elevasi rendah (dibatasi 0 sampai 12, dikali 2),
 * - persentase pemukiman (dikali 40, dibatasi 0 sampai 18),
 * - kepadatan sungai (dikali 120, dibatasi 0 sampai 12).
 * Skor akhir dibatasi pada rentang 1 sampai 100.
 * Kelas: skor >= 67 "tinggi", skor >= 40 "sedang", selain itu "rendah".
 *
 * @param {object} payload - Payload hasil buildMlPayload.
 * @param {number} [payload.elev_mean] - Elevasi rata-rata.
 * @param {number} [payload.pct_pemukiman] - Proporsi area pemukiman (0 sampai 1).
 * @param {number} [payload.sungai_density] - Kepadatan sungai.
 * @returns {{predicted_class: string, risk_score: number, confidence: number, probabilities: {tinggi: number, sedang: number, rendah: number}, model_version: string}} Hasil estimasi. Nilai confidence berada pada skala 0 sampai 1, sedangkan probabilities dinormalisasi agar berjumlah 1.
 */
export const buildOfflineRiskEstimate = (payload) => {
  // Membatasi nilai v agar tetap berada di rentang min sampai max.
  const bounded = (v, min, max) => Math.min(max, Math.max(min, v));

  const scoreRaw =
    bounded(12 - (payload.elev_mean || 0), 0, 12) * 2 +
    bounded((payload.pct_pemukiman || 0) * 40, 0, 18) +
    bounded((payload.sungai_density || 0) * 120, 0, 12);

  const riskScore = Math.round(bounded(scoreRaw, 1, 100));
  const predictedClass = riskScore >= 67 ? 'tinggi' : riskScore >= 40 ? 'sedang' : 'rendah';

  // Bobot kedekatan skor terhadap masing-masing kelas, sebelum dinormalisasi.
  const high = bounded((riskScore - 35) / 65, 0, 1);
  const low = bounded((60 - riskScore) / 60, 0, 1);
  const medium = bounded(1 - Math.abs(riskScore - 50) / 50, 0, 1);
  const total = high + medium + low;

  return {
    predicted_class: predictedClass,
    risk_score: riskScore,
    confidence: Number((0.62 + bounded(Math.abs(riskScore - 50) / 120, 0, 0.25)).toFixed(3)),
    probabilities: {
      tinggi: Number((high / total).toFixed(3)),
      sedang: Number((medium / total).toFixed(3)),
      rendah: Number((low / total).toFixed(3)),
    },
    model_version: 'offline-demo-v1',
  };
};
