/**
 * Membuat string stempel waktu lokal untuk nama berkas unduhan.
 * Format yang dihasilkan: YYYYMMDD-HHmmss (contoh: 20250131-142205).
 *
 * @returns {string} Stempel waktu dalam zona waktu lokal peramban.
 */
export const getTimestampString = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

/**
 * Mengamankan satu nilai sel CSV. Nilai yang mengandung koma, tanda kutip ganda,
 * atau newline dibungkus tanda kutip ganda, dan tanda kutip di dalamnya digandakan.
 * Nilai null atau undefined diubah menjadi string kosong.
 *
 * @param {*} value - Nilai sel yang akan ditulis.
 * @returns {string} Nilai sel yang aman untuk format CSV.
 */
const escapeCsv = (value) => {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Menyusun isi berkas CSV untuk daftar area prioritas.
 * Kolom: rank, area_name, kecamatan_code, jumlah_titik, severity, priority_score,
 * priority_level, analysis_type, generated_at, source_data.
 * Kolom source_data berisi label statis, bukan hasil pembacaan berkas.
 *
 * @param {object} params - Parameter fungsi.
 * @param {Array<object>} params.priorityAreas - Daftar area prioritas. Field yang dibaca: nama_kecamatan, kecamatan, jumlah_titik, severity, priorityScore, priorityLevel.
 * @param {string} [params.selectedAnalysis] - Jenis analisis yang dipilih. Jika kosong, diisi "priority".
 * @param {string} params.generatedAt - Waktu pembuatan laporan dalam format ISO.
 * @returns {string} Isi CSV dengan pemisah baris "\n", termasuk baris header.
 */
export const buildPriorityAreasCsv = ({ priorityAreas, selectedAnalysis, generatedAt }) => {
  const headers = [
    "rank",
    "area_name",
    "kecamatan_code",
    "jumlah_titik",
    "severity",
    "priority_score",
    "priority_level",
    "analysis_type",
    "generated_at",
    "source_data",
  ];

  const rows = priorityAreas.map((area, index) => [
    index + 1,
    area.nama_kecamatan || area.kecamatan || "-",
    area.kecamatan || "-",
    area.jumlah_titik || 0,
    area.severity || "-",
    area.priorityScore || 0,
    area.priorityLevel || "-",
    selectedAnalysis || "priority",
    generatedAt,
    "public/data/data_banjir.geojson; public/data/export.geojson",
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

/**
 * Menyusun ringkasan teks (plain text) untuk daftar area prioritas.
 * Setiap area ditulis dalam satu baris dengan nomor urut, nama, skor, level, dan jumlah titik.
 *
 * @param {object} params - Parameter fungsi.
 * @param {Array<object>} params.priorityAreas - Daftar area prioritas. Seluruh elemen ditulis ke ringkasan.
 * @param {string} [params.selectedAnalysis] - Jenis analisis yang dipilih. Jika kosong, ditulis "priority".
 * @param {string} params.generatedAt - Waktu pembuatan laporan dalam format ISO.
 * @returns {string} Teks ringkasan dengan pemisah baris "\n".
 */
export const buildPrioritySummaryText = ({ priorityAreas, selectedAnalysis, generatedAt }) => {
  return [
    "LAPORAN RINGKAS PRIORITY AREAS - B-DRAIN",
    "",
    `Generated At: ${generatedAt}`,
    `Total Priority Areas: ${priorityAreas.length}`,
    `Selected Analysis: ${selectedAnalysis || "priority"}`,
    "Source Data: public/data/data_banjir.geojson; public/data/export.geojson",
    "",
    "Top Priority Areas:",
    ...priorityAreas.map((area, index) => {
      const areaName = area.nama_kecamatan || area.kecamatan || "-";
      return `${index + 1}. ${areaName} | Skor: ${area.priorityScore || 0} | Level: ${area.priorityLevel || "-"} | Titik: ${area.jumlah_titik || 0}`;
    }),
    "",
    "Catatan: Gunakan laporan ini untuk prioritas intervensi infrastruktur dan koordinasi mitigasi banjir.",
  ].join("\n");
};

/**
 * Menyusun isi berkas CSV untuk hasil batch risk scoring.
 * Kolom: index, kelurahan, kecamatan, predicted_class, risk_score, confidence,
 * priority_score, jumlah_titik, generated_at, source_data.
 * Nilai yang tidak ada akan diganti "-" (atau 0 untuk jumlah_titik).
 * Kolom source_data berisi label statis, bukan hasil pembacaan berkas.
 *
 * @param {object} params - Parameter fungsi.
 * @param {Array<object>} params.rows - Baris hasil batch. Field yang dibaca: index, kelurahan, kecamatan, predicted_class, risk_score, confidence, priority_score, jumlah_titik.
 * @param {string} params.generatedAt - Waktu pembuatan laporan dalam format ISO.
 * @returns {string} Isi CSV dengan pemisah baris "\n", termasuk baris header.
 */
export const buildBatchResultsCsv = ({ rows, generatedAt }) => {
  const headers = [
    "index",
    "kelurahan",
    "kecamatan",
    "predicted_class",
    "risk_score",
    "confidence",
    "priority_score",
    "jumlah_titik",
    "generated_at",
    "source_data",
  ];

  const csvRows = rows.map((row) => [
    row.index ?? "-",
    row.kelurahan || "-",
    row.kecamatan || "-",
    row.predicted_class || "-",
    row.risk_score ?? "-",
    row.confidence ?? "-",
    row.priority_score ?? "-",
    row.jumlah_titik ?? 0,
    generatedAt,
    "ml/api.py:/api/predict/batch; public/data/data_banjir.geojson",
  ]);

  return [headers, ...csvRows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

/**
 * Menyusun ringkasan teks untuk hasil batch risk scoring.
 * Ringkasan memuat statistik total, sukses, gagal, jumlah per kelas, dan rata-rata skor risiko,
 * diikuti 10 baris teratas dari rows. Confidence ditampilkan dalam persen (skala 0 sampai 100),
 * sesuai nilai yang dikembalikan endpoint /api/predict/batch.
 *
 * @param {object} params - Parameter fungsi.
 * @param {{total: number, success: number, failed: number, high: number, medium: number, low: number, avgRiskScore: number}} params.summary - Ringkasan statistik batch.
 * @param {Array<object>} params.rows - Baris hasil batch yang sudah diurutkan oleh pemanggil. Hanya 10 baris pertama yang ditampilkan.
 * @param {string} params.scope - Cakupan data yang diproses (ditulis apa adanya).
 * @param {string} params.filterClass - Filter kelas risiko yang aktif (ditulis apa adanya).
 * @param {string} params.sortBy - Kriteria pengurutan yang aktif (ditulis apa adanya).
 * @param {string} params.generatedAt - Waktu pembuatan laporan dalam format ISO.
 * @returns {string} Teks ringkasan dengan pemisah baris "\n".
 */
export const buildBatchSummaryText = ({ summary, rows, scope, filterClass, sortBy, generatedAt }) => {
  const topRows = rows.slice(0, 10);
  return [
    "LAPORAN RINGKAS BATCH RISK SCORING - B-DRAIN",
    "",
    `Generated At: ${generatedAt}`,
    `Scope: ${scope}`,
    `Filter Class: ${filterClass}`,
    `Sort By: ${sortBy}`,
    `Total Rows: ${summary.total}`,
    `Success: ${summary.success}`,
    `Failed: ${summary.failed}`,
    `High: ${summary.high}`,
    `Medium: ${summary.medium}`,
    `Low: ${summary.low}`,
    `Average Risk Score: ${summary.avgRiskScore}`,
    "Source Data: ml/api.py:/api/predict/batch; public/data/data_banjir.geojson",
    "",
    "Top 10 Prioritas:",
    ...topRows.map(
      (row, index) =>
        `${index + 1}. ${row.kelurahan || "-"} | Kelas: ${row.predicted_class} | Risk: ${row.risk_score} | Conf: ${(row.confidence || 0).toFixed(1)}% | Priority: ${row.priority_score}`
    ),
    "",
    "Catatan: Gunakan urutan prioritas untuk tindakan mitigasi dan alokasi sumber daya.",
  ].join("\n");
};
