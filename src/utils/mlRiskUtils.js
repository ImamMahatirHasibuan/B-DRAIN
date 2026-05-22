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

export const severityToScore = (severity) =>
  severity === "high" ? 3 : severity === "medium" ? 2 : 1;

export const classColor = (riskClass) => {
  if (riskClass === "tinggi") return "#dc2626";
  if (riskClass === "sedang") return "#d97706";
  return "#16a34a";
};

export const buildMlPayload = ({ lat, lon, mlForm }) => ({
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

export const buildOfflineRiskEstimate = (payload) => {
  const bounded = (v, min, max) => Math.min(max, Math.max(min, v));

  const scoreRaw =
    bounded(12 - (payload.elev_mean || 0), 0, 12) * 2 +
    bounded((payload.pct_pemukiman || 0) * 40, 0, 18) +
    bounded((payload.sungai_density || 0) * 120, 0, 12);

  const riskScore = Math.round(bounded(scoreRaw, 1, 100));
  const predictedClass = riskScore >= 67 ? 'tinggi' : riskScore >= 40 ? 'sedang' : 'rendah';

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
