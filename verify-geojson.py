#!/usr/bin/env python3
import json
import random

# Load both GeoJSON files
with open('public/data/delineasi-indeks-risiko-banjir.geojson', 'r') as f:
    f1 = json.load(f)

with open('public/data/delineasi-indeks-risiko-banjir-bandang.geojson', 'r') as f:
    f2 = json.load(f)

print("=== FILE 1: Flood Risk ===")
print(f"Total features: {len(f1['features'])}")
print(f"Type: {f1['type']}")

# Check a few random features
samples = random.sample(f1['features'], min(3, len(f1['features'])))
for feat in sorted(samples, key=lambda x: x['id'])[:3]:
    fid = feat['id']
    kelas = feat['properties']['Kelas']
    coords = feat['geometry']['coordinates'][0][0]  # First point of first ring
    geometry_type = feat['geometry']['type']
    num_vertices = len(feat['geometry']['coordinates'][0])
    print(f"  FID {fid}: Kelas={kelas}, Type={geometry_type}, Vertices={num_vertices}, FirstCoord={coords}")

print("\n=== FILE 2: Flash Flood Risk ===")
print(f"Total features: {len(f2['features'])}")
print(f"Type: {f2['type']}")

samples = random.sample(f2['features'], min(3, len(f2['features'])))
for feat in sorted(samples, key=lambda x: x['id'])[:3]:
    fid = feat['id']
    kelas = feat['properties']['Kelas']
    coords = feat['geometry']['coordinates'][0][0]
    geometry_type = feat['geometry']['type']
    num_vertices = len(feat['geometry']['coordinates'][0])
    print(f"  FID {fid}: Kelas={kelas}, Type={geometry_type}, Vertices={num_vertices}, FirstCoord={coords}")

# Check coordinate ranges
all_lons_f1 = []
all_lats_f1 = []
for feat in f1['features']:
    for ring in feat['geometry']['coordinates']:
        for lon, lat in ring:
            all_lons_f1.append(lon)
            all_lats_f1.append(lat)

all_lons_f2 = []
all_lats_f2 = []
for feat in f2['features']:
    for ring in feat['geometry']['coordinates']:
        for lon, lat in ring:
            all_lons_f2.append(lon)
            all_lats_f2.append(lat)

print("\n=== Coordinate Ranges ===")
print(f"File 1 - Lon range: {min(all_lons_f1):.4f} to {max(all_lons_f1):.4f}")
print(f"File 1 - Lat range: {min(all_lats_f1):.4f} to {max(all_lats_f1):.4f}")
print(f"File 2 - Lon range: {min(all_lons_f2):.4f} to {max(all_lons_f2):.4f}")
print(f"File 2 - Lat range: {min(all_lats_f2):.4f} to {max(all_lats_f2):.4f}")
