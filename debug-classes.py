#!/usr/bin/env python3
import json

# Load historical flood data
with open('public/data/data_banjir.geojson', 'r') as f:
    data = json.load(f)

# Test the severity normalization logic
def normalizeSeverity(value):
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
    severity = props.get('severity', props.get('severity_historis'))
    normalized = normalizeSeverity(severity)
    results[normalized].append({
        'kecamatan': props.get('kecamatan', props.get('nama_kecamatan')),
        'severity': severity,
        'normalized': normalized
    })

print("Severity analysis:")
for key, items in results.items():
    print(f"\n{key}: {len(items)} features")
    if items:
        print(f"  Sample: {items[0]}")

# Check for any issues
for feature in data['features'][:20]:
    props = feature.get('properties', {})
    severity = props.get('severity', props.get('severity_historis'))
    if not severity:
        print(f"❌ Feature {props.get('kecamatan', props.get('nama_kecamatan'))} has empty severity!")
