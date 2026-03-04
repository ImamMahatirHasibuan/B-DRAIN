#!/usr/bin/env python3
import json
import math

# Load GeoJSON
with open('public/data/delineasi-indeks-risiko-banjir.geojson', 'r') as f:
    data = json.load(f)

# Check a few features in detail
print("=== Detailed Feature Analysis ===\n")

test_indices = [0, 100, 500, 999]
for idx in test_indices:
    feat = data['features'][idx]
    coords = feat['geometry']['coordinates'][0]  # First ring
    
    print(f"Feature {idx} (FID {feat['id']}):")
    print(f"  Shape_Area: {feat['properties']['Shape_Area']}")
    print(f"  Vertices: {len(coords)}")
    print(f"  All vertices:")
    for i, (lon, lat) in enumerate(coords):
        print(f"    [{i}] lon={lon:.6f}, lat={lat:.6f}")
    
    # Check if it's a valid small square
    lons = [p[0] for p in coords]
    lats = [p[1] for p in coords]
    print(f"  Bounds: lon {min(lons):.6f}-{max(lons):.6f}, lat {min(lats):.6f}-{max(lats):.6f}")
    print(f"  Size: {max(lons)-min(lons):.6f}° lon x {max(lats)-min(lats):.6f}° lat")
    print()
