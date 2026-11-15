# Flood Risk API Integration Guide (B-DRAIN)

## API Overview

- **Base URL**: `http://localhost:5000` (konfigurasi frontend melalui `VITE_ML_API_URL`)
- **Status Validasi Model**: **PROTOTIPE — BELUM TERVALIDASI** (`Prototipe — Belum Tervalidasi`)
- **Unit Analisis**: 48 Kelurahan di Wilayah Administratif Kota Bekasi (`WADMKK == "Kota Bekasi"`)
- **Data Pelatihan Berlabel**:
  - **Varian B (Artefak Aktif)**: 33 Kelurahan Kota Bekasi yang memiliki titik banjir historis (`sedang`: 20, `tinggi`: 13)
  - **Varian A**: 27 Kelurahan Kota Bekasi (`sedang`: 14, `tinggi`: 13; tanpa 6 kelurahan *low-only*)
  - **Tanpa Label Historis**: 15 Kelurahan Kota Bekasi tidak memiliki titik banjir historis dan tidak diberi label bawaan
- **Model & Pipeline**: `sklearn.pipeline.Pipeline` (`StandardScaler` + `RandomForestClassifier`, `n_estimators=200`, `max_depth=8`, `class_weight="balanced"`, `random_state=42`)
- **Kelas Output**: `sedang` dan `tinggi` (tidak ada kelas `rendah` pada output model)
- **Evaluasi Leave-One-Kecamatan-Out (LOGO, 12 Kecamatan)**:
  - **Varian A (`n = 27`)**: Accuracy `0.4444`, Balanced Accuracy `0.4396`, Macro-F1 `0.4320` (Majority Baseline Macro-F1: `0.2895`)
  - **Varian B (`n = 33`)**: Accuracy `0.5758`, Balanced Accuracy `0.5019`, Macro-F1 `0.4653` (Majority Baseline Macro-F1: `0.3774`)

---

## Endpoints

### 1. Health Check (`GET /api/health`)

Memeriksa status backend, kesiapan model, versi model, dan status validasi.

**Response (HTTP 200)**:
```json
{
  "status": "ok",
  "backend_status": "ok",
  "model_status": "ready",
  "model_loaded": true,
  "inference_ready": true,
  "model_version": "rf-logo-bekasi-v2",
  "model_name": "Random Forest",
  "validation_status": "Prototipe — Belum Tervalidasi",
  "status_validasi": "PROTOTIPE — BELUM TERVALIDASI",
  "validation_note": "Hasil klasifikasi belum tervalidasi dan tidak boleh digunakan sebagai prediksi final. Evaluasi Leave-One-Kecamatan-Out belum menunjukkan performa di atas baseline secara konsisten.",
  "accuracy": 0.5757575757575758,
  "macro_f1": 0.4652777777777778,
  "training_samples": 33,
  "total_kelurahan_kota_bekasi": 48,
  "allowed_origins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
  ],
  "inference_timeout_seconds": 5.0
}
```

---

### 2. Model Metadata (`GET /api/model/info`)

Mengembalikan metadata lengkap dari `ml/models/model_metadata.json`, termasuk daftar 9 fitur beserta satuannya, konfigurasi hyperparameter, versi pustaka, dan hasil evaluasi LOGO Varian A serta Varian B. Jika model belum berhasil dimuat, mengembalikan HTTP `503` (`MODEL_NOT_READY`).

---

### 3. Single Prediction (`POST /api/predict`)

Melakukan prediksi risiko banjir untuk satu kelurahan di Kota Bekasi menggunakan 9 fitur spasial dan topografi.

**Request Body Schema**:
```json
{
  "kelurahan": "Jatiasih",
  "kecamatan": "Jatiasih",
  "wadmkk": "Kota Bekasi",
  "shape_area": 4237838.14,
  "shape_leng": 12094.18,
  "compactness": 0.3641,
  "elev_mean": 32.03,
  "elev_min": 25.0,
  "sungai_density": 0.000594,
  "dist_to_river": 458.11,
  "pct_pemukiman": 0.5911,
  "pct_sawah": 0.1138
}
```

**Response (HTTP 200)**:
```json
{
  "kelurahan": "Jatiasih",
  "kecamatan": "Jatiasih",
  "predicted_class": "tinggi",
  "risk_score": 84.6,
  "confidence": 61.5,
  "probabilities": {
    "sedang": 0.385,
    "tinggi": 0.615
  },
  "model_version": "rf-logo-bekasi-v2",
  "validation_status": "Prototipe — Belum Tervalidasi",
  "status_validasi": "PROTOTIPE — BELUM TERVALIDASI"
}
```

---

### 4. Batch Prediction (`POST /api/predict/batch`)

Melakukan prediksi risiko banjir untuk daftar kelurahan di Kota Bekasi secara sekaligus. Setiap item diproses secara individual sesuai urutan input. Item yang tidak valid atau berada di luar Kota Bekasi dikembalikan dengan `success: false` tanpa menggagalkan item lain yang valid.

**Request Body Schema**:
```json
{
  "features": [
    {
      "id": "Jatikarya",
      "kelurahan": "Jatikarya",
      "kecamatan": "Jatisampurna",
      "wadmkk": "Kota Bekasi",
      "shape_area": 6670010.48,
      "shape_leng": 17407.57,
      "compactness": 0.2766,
      "elev_mean": 69.53,
      "elev_min": 50.0,
      "sungai_density": 0.001386,
      "dist_to_river": 269.36,
      "pct_pemukiman": 0.4695,
      "pct_sawah": 0.0130
    }
  ]
}
```

---

## Spesifikasi 9 Fitur Model (Proyeksi UTM Zone 48S / `EPSG:32748`)

| No | Nama Fitur | Satuan | Sumber Data BIG 1:25K | Deskripsi |
|---:|---|---|---|---|
| 1 | `shape_area` | $\text{m}^2$ | `ADMINISTRASIDESA_AR_25K` | Luas geometri poligon kelurahan (`> 0`) |
| 2 | `shape_leng` | $\text{m}$ | `ADMINISTRASIDESA_AR_25K` | Keliling geometri poligon kelurahan (`> 0`) |
| 3 | `compactness` | Rasio `[0, 1]` | `ADMINISTRASIDESA_AR_25K` | Indeks kekompakan Polsby-Popper ($4\pi A / P^2$) |
| 4 | `elev_mean` | $\text{m dpl}$ | `SPOTHEIGHT_PT_25K` & `KONTUR_LN_25K` | Elevasi rata-rata di dalam poligon kelurahan (`>= 0`) |
| 5 | `elev_min` | $\text{m dpl}$ | `SPOTHEIGHT_PT_25K` & `KONTUR_LN_25K` | Elevasi minimum di dalam poligon kelurahan (`>= 0`) |
| 6 | `sungai_density` | $\text{m}/\text{m}^2$ | `SUNGAI_LN_25K` | Total panjang segmen sungai dibagi luas kelurahan (`>= 0`) |
| 7 | `dist_to_river` | $\text{m}$ | `SUNGAI_LN_25K` & `SUNGAI_AR_25K` | Jarak Euclidean centroid kelurahan ke geometri sungai terdekat (`>= 0`) |
| 8 | `pct_pemukiman` | Rasio `[0, 1]` | `PEMUKIMAN_AR_25K` | Proporsi luas permukiman terhadap luas kelurahan |
| 9 | `pct_sawah` | Rasio `[0, 1]` | `AGRISAWAH_AR_25K` | Proporsi luas sawah terhadap luas kelurahan |

---

## Kode Error Standar

| HTTP Status | Kode Error (`code`) | Penyebab |
|---:|---|---|
| `400` | `INVALID_BODY` / `INVALID_BATCH_BODY` | Body JSON kosong, bukan objek, atau array `features` kosong |
| `400` | `VALIDATION_ERROR` | Fitur wajib hilang, nilai bukan numerik, di luar rentang valid, atau `wadmkk` di luar Kota Bekasi |
| `503` | `MODEL_NOT_READY` | Artefak model `.pkl` gagal atau belum dimuat oleh server |
| `504` | `INFERENCE_TIMEOUT` | Waktu eksekusi inferensi melebihi `INFERENCE_TIMEOUT_SECONDS` (5 detik) |
| `500` | `PREDICTION_ERROR` / `BATCH_PREDICTION_ERROR` | Kesalahan internal tak terduga saat pemrosesan |
