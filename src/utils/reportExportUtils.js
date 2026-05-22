export const getTimestampString = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const escapeCsv = (value) => {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

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
