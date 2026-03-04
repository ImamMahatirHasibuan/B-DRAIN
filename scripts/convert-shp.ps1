param(
  [string]$InputDir = "public/data/KOTA BEKASI",
  [string]$OutputDir = "public/data/geojson_kota_bekasi",
  [switch]$ReplaceExport,
  [string]$LayerToExport = "SUNGAI_LN_25K"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $InputDir)) {
  throw "Input folder tidak ditemukan: $InputDir"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$shpFiles = Get-ChildItem -Path $InputDir -Filter *.shp -File
if (-not $shpFiles -or $shpFiles.Count -eq 0) {
  throw "Tidak ada file .shp di folder: $InputDir"
}

foreach ($file in $shpFiles) {
  $outputFile = Join-Path $OutputDir ("{0}.geojson" -f $file.BaseName)
  Write-Host "Converting $($file.Name) -> $(Split-Path $outputFile -Leaf)"
  npx mapshaper "$($file.FullName)" -proj wgs84 -o format=geojson "$outputFile"
}

if ($ReplaceExport) {
  $candidate = Join-Path $OutputDir ("{0}.geojson" -f $LayerToExport)
  if (Test-Path $candidate) {
    Copy-Item $candidate "public/data/export.geojson" -Force
    Write-Host "Updated public/data/export.geojson dari $LayerToExport.geojson"
  } else {
    Write-Host "Flag -ReplaceExport aktif, tapi file layer tidak ditemukan: $LayerToExport.geojson"
  }
}

Write-Host "Selesai. Output ada di: $OutputDir"