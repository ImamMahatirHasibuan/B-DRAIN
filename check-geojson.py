#!/usr/bin/env python3
import json

# Check flood risk GeoJSON
with open('public/data/delineasi-indeks-risiko-banjir.geojson', 'r') as f:
    data = json.load(f)
    
print(f"Total features: {len(data['features'])}")

# Check Kelas values
kelas_values = {}
empty_count = 0

for feature in data['features']:
    props = feature.get('properties', {})
    kelas = props.get('Kelas')
    
    if not kelas:
        empty_count += 1
    else:
        if kelas not in kelas_values:
            kelas_values[kelas] = 0
        kelas_values[kelas] += 1

print(f"\nKelas distribution:")
for k, v in sorted(kelas_values.items()):
    print(f"  {k}: {v}")
print(f"  Empty/null: {empty_count}")

print(f"\nFirst 10 features Kelas values:")
for i, feature in enumerate(data['features'][:10]):
    kelas = feature['properties'].get('Kelas')
    print(f"  Feature {i+1}: {kelas}")
