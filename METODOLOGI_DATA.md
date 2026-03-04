# METODOLOGI PENELITIAN

Dokumen ini menyelaraskan implementasi project dengan metodologi proposal penelitian.

## 1. LATAR BELAKANG

Permasalahan banjir di wilayah perkotaan berkaitan erat dengan kondisi infrastruktur drainase yang belum memadai. Data titik rawan banjir dan jaringan drainase umumnya tersedia dalam format spasial seperti Shapefile (.shp), namun analisisnya sering terbatas karena membutuhkan perangkat lunak GIS khusus.

Penelitian ini mengembangkan Geodashboard berbasis web untuk:
- menampilkan informasi spasial secara interaktif,
- melakukan analisis spasial sederhana,
- membantu pemangku kepentingan memahami korelasi wilayah antara titik genangan dan saluran drainase.

## 2. RUMUSAN MASALAH

1. Bagaimana mengintegrasikan data spasial format .shp ke dalam platform Geodashboard berbasis web?
2. Bagaimana menampilkan visualisasi data infrastruktur drainase dan titik banjir agar mudah diinterpretasikan oleh pengguna?
3. Bagaimana mengimplementasikan fitur analisis spasial sederhana untuk mengidentifikasi area yang memiliki urgensi perbaikan infrastruktur?

## 3. RUANG LINGKUP

- Area penelitian: Kota Bekasi (12 kecamatan).
- Data: Shapefile (.shp) dan GeoJSON.
- Teknologi: Leaflet.js pada aplikasi web berbasis React.
- Pengguna: Pengelola tata kelola kota/dinas terkait infrastruktur.

## 4. TUJUAN DAN MANFAAT

### 4.1 Tujuan
- Membangun sistem informasi geografis (Geodashboard) berbasis web untuk menampilkan informasi spasial.
- Menyediakan fitur analisis spasial sederhana untuk memantau titik banjir dan drainase.

### 4.2 Manfaat
- Memudahkan pengambilan keputusan terkait mitigasi banjir.
- Meningkatkan transparansi dan aksesibilitas data infrastruktur kota.

## 5. METODOLOGI PENELITIAN

### 5.1 Metode Pengumpulan Data
- Observasi data spasial sekunder (.shp) dari instansi terkait.
- Pengumpulan data kejadian banjir dari laporan instansi/media.
- Studi literatur manajemen drainase dan web GIS.

### 5.2 Metode Pengembangan (SDLC)

1. Analisis kebutuhan sistem
   - Identifikasi kebutuhan fitur visualisasi, analisis, dan pengguna.
   - Identifikasi kebutuhan data drainase dan titik banjir.

2. Perancangan arsitektur sistem
   - Perancangan arsitektur aplikasi web GIS berbasis React + Leaflet.
   - Perancangan struktur data GeoJSON untuk layer drainase dan banjir.

3. Preprocessing dan integrasi data
   - Konversi data drainase dari .shp ke .geojson.
   - Strukturisasi data banjir menjadi GeoJSON Point.
   - Validasi geometri, atribut, dan koordinat WGS84.

4. Implementasi coding
   - Implementasi layer peta interaktif dan kontrol visualisasi.
   - Implementasi analisis spasial sederhana (buffer/proximity) untuk identifikasi area prioritas.

5. Pengujian fungsionalitas sistem
   - Uji pemuatan data layer banjir dan drainase.
   - Uji fungsi visualisasi, filter, dan analisis spasial.
   - Uji keterbacaan hasil untuk pengguna target.

## 6. PENERAPAN TEKNIS DI PROJECT

- Data drainase utama dibaca dari public/data/export.geojson.
- Data titik banjir dibaca dari public/data/data_banjir.geojson.
- Dataset Shapefile tambahan hasil konversi disimpan di public/data/geojson_kota_bekasi.
- Script konversi yang digunakan:
  - npm run convert:shp
  - npm run convert:shp:replace
  - npm run convert:shp:sungai

## 7. ALUR DATA

1. Data drainase (.shp) dari instansi.
2. Konversi .shp ke .geojson.
3. Simpan hasil ke public/data/geojson_kota_bekasi.
4. Pilih layer dan gunakan sebagai public/data/export.geojson.
5. Aplikasi menampilkan visualisasi dan analisis spasial berbasis Leaflet.

## 8. KESIMPULAN KESESUAIAN METODOLOGI

Implementasi project telah mengikuti metodologi proposal:
- sumber data spasial dari format .shp,
- transformasi ke GeoJSON untuk kebutuhan web GIS,
- pengembangan sistem dengan tahapan SDLC,
- fokus pada visualisasi dan analisis spasial sederhana untuk mendukung tata kelola kota.
