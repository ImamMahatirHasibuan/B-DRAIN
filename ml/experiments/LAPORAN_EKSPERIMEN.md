# Laporan Eksperimen Random Forest: Label per Kelurahan (LOGO)

Sumber: `flood_risk_experiment_logo.ipynb` (eksekusi tercatat di `flood_risk_experiment_logo.executed.ipynb`), hasil `results_logo.json`.

Kedua varian dilaporkan setara. Tidak ada varian yang dipilih sebagai model terbaik berdasarkan metrik.

### Varian A (label low dikeluarkan)

- Jumlah sampel (kelurahan berlabel): **27**; kelompok kecamatan (LOGO): **12**
- Distribusi kelas: sedang = 14, tinggi = 13

| Model | Akurasi | Balanced accuracy | Macro-F1 |
|---|---|---|---|
| Baseline mayoritas (LOGO) | 0.407 | 0.393 | 0.289 |
| Random Forest (LOGO) | 0.444 | 0.440 | 0.432 |

Confusion matrix LOGO (baris = aktual, kolom = prediksi, urutan kelas ['sedang', 'tinggi']): `[[8, 6], [9, 4]]`

### Varian B (label low digabung ke sedang)

- Jumlah sampel (kelurahan berlabel): **33**; kelompok kecamatan (LOGO): **12**
- Distribusi kelas: sedang = 20, tinggi = 13

| Model | Akurasi | Balanced accuracy | Macro-F1 |
|---|---|---|---|
| Baseline mayoritas (LOGO) | 0.606 | 0.500 | 0.377 |
| Random Forest (LOGO) | 0.576 | 0.502 | 0.465 |

Confusion matrix LOGO (baris = aktual, kolom = prediksi, urutan kelas ['sedang', 'tinggi']): `[[17, 3], [11, 2]]`

## Stabilitas antar-seed RF (5 seed, LOGO)

| Varian | Balanced acc (mean ± std) | Macro-F1 (mean ± std) | Baseline balanced acc |
|---|---|---|---|
| A | 0.434 ± 0.040 | 0.429 ± 0.039 | 0.393 |
| B | 0.485 ± 0.033 | 0.457 ± 0.036 | 0.500 |

## Referensi random split (BUKAN klaim validasi)

Random stratified 5-fold dihitung hanya sebagai pembanding. Kelurahan dalam kecamatan yang sama berbagi label, sehingga angka ini tidak mengukur generalisasi ke wilayah baru.

| Varian | Balanced acc |
|---|---|
| A | 0.626 |
| B | 0.415 |

## Keterbatasan

- Asal atribut `severity` belum terdokumentasi dalam metadata yang dapat diakses. Label diperlakukan sebagai data sumber apa adanya dan tidak diklaim sebagai ground truth terverifikasi.
- Titik banjir dapat berulang di lokasi yang sama pada tahun berbeda (2020 sampai 2026). Label tertinggi per kelurahan bisa dipengaruhi jumlah catatan.
- 15 dari 48 kelurahan Kota Bekasi tidak memiliki titik banjir dan tetap tanpa label.
- Elevasi memakai fallback SPOTHEIGHT dan KONTUR, karena DEM tidak tersedia pada baseline. Nilai elevasi terkuantisasi (misalnya 25,0, 62,5, 81,25).
- Ukuran sampel sangat kecil (27 dan 33). Beberapa kecamatan hanya memiliki 1 sampel, sehingga akurasi per kecamatan tidak stabil.
- Hasil LOGO tidak menunjukkan performa yang konsisten di atas baseline mayoritas pada kedua varian.
