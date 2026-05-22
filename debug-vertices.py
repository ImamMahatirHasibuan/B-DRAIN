#!/usr/bin/env python3
import json

# Load historical flood data
with open('public/data/data_banjir.geojson', 'r') as f:
    data = json.load(f)

# Check a few records in detail
print("=== Detailed Historical Flood Analysis ===\n")

test_indices = [0, 100, 500, 999]
for idx in test_indices:
    if idx >= len(data['features']):
        continue
    feat = data['features'][idx]
    props = feat.get('properties', {})
    
    print(f"Record {idx}:")
    print(f"  Kecamatan: {props.get('kecamatan', props.get('nama_kecamatan', ''))}")
    print(f"  Severity: {props.get('severity', props.get('severity_historis', ''))}")
    print()
