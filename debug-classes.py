#!/usr/bin/env python3
import json

# Load one of the GeoJSON files
with open('public/data/delineasi-indeks-risiko-banjir.geojson', 'r') as f:
    data = json.load(f)

# Test the normalizeRiskClass logic
def normalizeRiskClass(value):
    if not value:
        return 'unknown'
    normalized = str(value).lower().strip()
    if 'tinggi' in normalized:
        return 'tinggi'
    if 'sedang' in normalized:
        return 'sedang'
    if 'rendah' in normalized:
        return 'rendah'
    return 'unknown'

# Check all features
results = {'tinggi': [], 'sedang': [], 'rendah': [], 'unknown': []}

for feature in data['features']:
    props = feature.get('properties', {})
    kelas = props.get('Kelas')
    normalized = normalizeRiskClass(kelas)
    results[normalized].append({
        'FID': props.get('FID'),
        'Kelas': kelas,
        'normalized': normalized
    })

print("Classification analysis:")
for key, items in results.items():
    print(f"\n{key}: {len(items)} features")
    if items:
        print(f"  Sample: {items[0]}")

# Check for any issues
for feature in data['features'][:20]:
    props = feature.get('properties', {})
    kelas = props.get('Kelas')
    if not kelas:
        print(f"❌ Feature {props.get('FID')} has empty Kelas!")
