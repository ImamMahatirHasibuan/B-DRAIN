# Fitur Pengukuran dengan Geoman

## ✨ Fitur yang Ditambahkan

Fitur Geoman telah berhasil diintegrasikan ke dalam aplikasi B-DRAIN untuk pengukuran dan menggambar di peta. Anda sekarang dapat:

### 📏 Fitur Utama:

1. **Menggambar Garis (Polyline)** - Untuk mengukur jarak
2. **Menggambar Persegi Panjang (Rectangle)** - Untuk mengukur luas area
3. **Menggambar Polygon** - Untuk mengukur luas area tidak beraturan
4. **Menggambar Lingkaran (Circle)** - Untuk mengukur radius dan luas
5. **Edit Mode** - Untuk mengedit bentuk yang sudah digambar
6. **Remove Mode** - Untuk menghapus bentuk

## 🎮 Cara Menggunakan:

### Mengukur Jarak:
1. Klik tombol **garis** di kontrol Geoman (pojok kiri atas peta)
2. Klik di peta untuk menandai titik awal
3. Klik lagi di titik lain untuk melanjutkan garis
4. Double-click untuk selesai
5. Popup akan muncul menampilkan jarak dalam meter dan kilometer

### Mengukur Luas:
1. Pilih **Rectangle** atau **Polygon** dari kontrol
2. Untuk Rectangle: klik dan drag untuk membuat kotak
3. Untuk Polygon: klik beberapa kali untuk membuat bentuk, double-click untuk selesai
4. Popup akan muncul menampilkan luas dalam m² dan hektar

### Mengukur Lingkaran:
1. Pilih **Circle** dari kontrol
2. Klik untuk menentukan pusat lingkaran
3. Geser untuk menentukan radius
4. Popup akan muncul menampilkan radius dan luas area

### Mengedit atau Menghapus:
1. Klik tombol **Edit** untuk mengubah bentuk yang sudah ada
2. Klik tombol **Remove** untuk menghapus bentuk
3. Atau klik kanan pada bentuk untuk opsi tambahan

## 📊 Informasi Pengukuran:

Setiap bentuk yang digambar akan menampilkan popup dengan informasi:
- **Jarak**: dalam meter (m) dan kilometer (km)
- **Luas**: dalam meter persegi (m²) dan hektar (ha)
- **Radius**: untuk lingkaran dalam meter

## 🛠️ File yang Diubah:

1. **GeomanControls.jsx** (BARU) - Komponen untuk mengintegrasikan Geoman
2. **MapDashboard.jsx** - Ditambahkan import dan komponen GeomanControls
3. **package.json** - Dependency baru: `@geoman-io/leaflet-geoman-free`

## 🚀 Menjalankan Aplikasi:

```bash
# Development mode
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## 💡 Tips:

- Semua pengukuran menggunakan proyeksi geodesik untuk akurasi tinggi
- Anda dapat memiliki beberapa bentuk sekaligus di peta
- Bentuk yang digambar akan tetap ada hingga dihapus secara manual
- Gunakan tombol Edit untuk menyesuaikan bentuk setelah digambar
- Format metrik (meter, kilometer, hektar) digunakan sesuai standar Indonesia

## 📚 Dokumentasi Resmi:

Untuk fitur lanjutan, kunjungi: https://geoman.io/docs

---

**Dibuat untuk**: B-DRAIN - Bekasi Drainage Information System
**Platform**: React + Leaflet + Geoman
