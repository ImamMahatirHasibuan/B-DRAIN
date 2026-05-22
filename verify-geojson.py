#!/usr/bin/env python3
import json

# Load historical flood data
with open('public/data/data_banjir.geojson', 'r') as f:
    f1 = json.load(f)

print("=== FILE: Data Banjir Historis ===")
print(f"Total features: {len(f1['features'])}")
print(f"Type: {f1['type']}")

# Check a few sample features in a fixed order
for feat in sorted(f1['features'], key=lambda x: x['id'])[:3]:
    fid = feat['id']
    props = feat.get('properties', {})
    kecamatan = props.get('kecamatan', props.get('nama_kecamatan', ''))
    severity = props.get('severity', props.get('severity_historis', ''))
    print(f"  FID {fid}: kecamatan={kecamatan}, severity={severity}")

print("\n=== Field Check ===")
print("Available properties example:", list(f1['features'][0].get('properties', {}).keys())[:10])
