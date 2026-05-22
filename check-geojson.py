#!/usr/bin/env python3
import json

# Check historical flood GeoJSON
with open('public/data/data_banjir.geojson', 'r') as f:
    data = json.load(f)
    
print(f"Total features: {len(data['features'])}")

# Check severity values
severity_values = {}
empty_count = 0

for feature in data['features']:
    props = feature.get('properties', {})
    severity = props.get('severity', props.get('severity_historis'))
    
    if not severity:
        empty_count += 1
    else:
        if severity not in severity_values:
            severity_values[severity] = 0
        severity_values[severity] += 1

print(f"\nSeverity distribution:")
for k, v in sorted(severity_values.items()):
    print(f"  {k}: {v}")
print(f"  Empty/null: {empty_count}")

print(f"\nFirst 10 features severity values:")
for i, feature in enumerate(data['features'][:10]):
    severity = feature['properties'].get('severity', feature['properties'].get('severity_historis'))
    print(f"  Feature {i+1}: {severity}")
