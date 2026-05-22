# Flood Risk API Integration Guide

## API Overview

**Base URL**: `http://localhost:5000`  
**Status**: ✅ Ready for Frontend Integration  
**Model**: XGBoost Classifier  
**Accuracy**: 76.91% | Macro-F1: 0.588

---

## Endpoints

### 1. Health Check

**GET** `/api/health`

**Purpose**: Verify API is running and model is loaded

**Response** (HTTP 200):
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_name": "XGBoost",
  "accuracy": 0.7691176470588236,
  "macro_f1": 0.5880679240799183,
  "allowed_origins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
  ],
  "inference_timeout_seconds": 5.0
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:5000/api/health
```

---

### 2. Flood Risk Prediction

**POST** `/api/predict`

**Purpose**: Get flood risk classification for an administrative area

**Request Schema**:
```json
{
  "shape_area": "number (km²) - Area of the region",
  "shape_leng": "number (km) - Perimeter length",
  "compactness": "number [0-1] - Shape compactness ratio",
  "elev_mean": "number (meters) - Mean elevation",
  "elev_min": "number (meters) - Minimum elevation",
  "sungai_density": "number [0-1] - River network density",
  "dist_to_river": "number (km) - Distance to nearest river",
  "pct_pemukiman": "number [0-1] - Percentage residential area",
  "pct_sawah": "number [0-1] - Percentage rice field area"
}
```

**Response Schema** (HTTP 200):
```json
{
  "predicted_class": "string - rendah|sedang|tinggi",
  "confidence": "number - Prediction confidence percentage (0-100)",
  "risk_score": "number - Risk score (0-100)",
  "probabilities": {
    "rendah": "number - Probability of low risk",
    "sedang": "number - Probability of medium risk",
    "tinggi": "number - Probability of high risk"
  }
}
```

---

## Sample Payloads & Responses

### Scenario 1: Low Risk (Rendah)

**Characteristics**: 
- Higher elevation, far from rivers
- Large area with low population
- Low water exposure

**Request**:
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "shape_area": 15.5,
    "shape_leng": 18.2,
    "compactness": 0.42,
    "elev_mean": 45.0,
    "elev_min": 22.0,
    "sungai_density": 0.02,
    "dist_to_river": 2.5,
    "pct_pemukiman": 0.15,
    "pct_sawah": 0.60
  }'
```

**Response** (Expected):
```json
{
  "predicted_class": "rendah",
  "confidence": 87.5,
  "risk_score": 25,
  "probabilities": {
    "rendah": 0.875,
    "sedang": 0.095,
    "tinggi": 0.030
  }
}
```

**Interpretation**: 
- ✅ Low flood risk with 87.5% confidence
- Risk score 25/100 = minimal flood exposure
- Suitable for development with standard drainage

---

### Scenario 2: Medium Risk (Sedang)

**Characteristics**:
- Moderate elevation, moderate river proximity
- Mixed residential and agricultural use
- Some flood exposure

**Request**:
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "shape_area": 8.2,
    "shape_leng": 12.5,
    "compactness": 0.35,
    "elev_mean": 12.0,
    "elev_min": 4.0,
    "sungai_density": 0.08,
    "dist_to_river": 0.35,
    "pct_pemukiman": 0.45,
    "pct_sawah": 0.35
  }'
```

**Response** (Expected):
```json
{
  "predicted_class": "sedang",
  "confidence": 96.3,
  "risk_score": 60,
  "probabilities": {
    "rendah": 0.009,
    "sedang": 0.963,
    "tinggi": 0.028
  }
}
```

**Interpretation**:
- ⚠️ Medium flood risk with 96.3% confidence
- Risk score 60/100 = significant flood potential
- Requires enhanced drainage and flood preparedness
- Historical flood data expected

---

### Scenario 3: High Risk (Tinggi)

**Characteristics**:
- Low elevation, close to rivers
- High population density
- Active flooding history

**Request**:
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "shape_area": 4.5,
    "shape_leng": 9.8,
    "compactness": 0.28,
    "elev_mean": 8.0,
    "elev_min": 3.0,
    "sungai_density": 0.12,
    "dist_to_river": 0.005,
    "pct_pemukiman": 0.75,
    "pct_sawah": 0.08
  }'
```

**Response** (Expected):
```json
{
  "predicted_class": "tinggi",
  "confidence": 92.8,
  "risk_score": 85,
  "probabilities": {
    "rendah": 0.012,
    "sedang": 0.060,
    "tinggi": 0.928
  }
}
```

**Interpretation**:
- 🔴 High flood risk with 92.8% confidence
- Risk score 85/100 = severe flood exposure
- Emergency preparedness required
- Enhanced infrastructure needed

---

### Scenario 4: Edge Case - Maximum Values (Rendah Expected)

**Request**:
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "shape_area": 50.0,
    "shape_leng": 40.0,
    "compactness": 1.0,
    "elev_mean": 100.0,
    "elev_min": 80.0,
    "sungai_density": 0.0,
    "dist_to_river": 5.0,
    "pct_pemukiman": 0.0,
    "pct_sawah": 0.0
  }'
```

**Response** (Expected):
```json
{
  "predicted_class": "rendah",
  "confidence": 95.2,
  "risk_score": 18,
  "probabilities": {
    "rendah": 0.952,
    "sedang": 0.035,
    "tinggi": 0.013
  }
}
```

---

### Scenario 5: Edge Case - Minimum Values (Tinggi Expected)

**Request**:
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "shape_area": 0.5,
    "shape_leng": 3.0,
    "compactness": 0.1,
    "elev_mean": 3.0,
    "elev_min": 0.5,
    "sungai_density": 0.5,
    "dist_to_river": 0.001,
    "pct_pemukiman": 0.95,
    "pct_sawah": 0.01
  }'
```

**Response** (Expected):
```json
{
  "predicted_class": "tinggi",
  "confidence": 89.5,
  "risk_score": 92,
  "probabilities": {
    "rendah": 0.008,
    "sedang": 0.097,
    "tinggi": 0.895
  }
}
```

---

## Validation Rules

### Valid Request
```json
{
  "shape_area": 10.5,
  "shape_leng": 15.2,
  "compactness": 0.35,
  "elev_mean": 12.0,
  "elev_min": 5.0,
  "sungai_density": 0.08,
  "dist_to_river": 0.3,
  "pct_pemukiman": 0.45,
  "pct_sawah": 0.30
}
```

### Error Cases

**Missing Required Field**
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "shape_area": 10.5,
    "shape_leng": 15.2
    # Missing other 7 required fields
  }'
```

**Response** (HTTP 400):
```json
{
  "error": "Missing required fields: compactness, elev_mean, elev_min, sungai_density, dist_to_river, pct_pemukiman, pct_sawah"
}
```

**Invalid Data Type**
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "shape_area": "not_a_number",
    "shape_leng": 15.2,
    ...
  }'
```

**Response** (HTTP 400):
```json
{
  "error": "All fields must be numeric"
}
```

**Out of Range Percentage**
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "shape_area": 10.5,
    "shape_leng": 15.2,
    "compactness": 0.35,
    "elev_mean": 12.0,
    "elev_min": 5.0,
    "sungai_density": 0.08,
    "dist_to_river": 0.3,
    "pct_pemukiman": 1.5,    # ❌ Should be 0-1
    "pct_sawah": 0.30
  }'
```

**Response** (HTTP 400):
```json
{
  "error": "Percentage fields (pct_pemukiman, pct_sawah) must be between 0 and 1"
}
```

---

## Frontend Integration Template

### JavaScript/React Example

```javascript
const API_BASE = 'http://localhost:5000';

// Check API health
async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    console.log('API Status:', data.status);
    return data.model_loaded;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Predict flood risk
async function predictRisk(areaData) {
  try {
    const payload = {
      shape_area: areaData.area,
      shape_leng: areaData.perimeter,
      compactness: areaData.compactness,
      elev_mean: areaData.meanElev,
      elev_min: areaData.minElev,
      sungai_density: areaData.riverDensity,
      dist_to_river: areaData.riverDistance,
      pct_pemukiman: areaData.residentialPct,
      pct_sawah: areaData.ricePct
    };

    const response = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const prediction = await response.json();
    return {
      riskClass: prediction.predicted_class,
      confidence: prediction.confidence,
      riskScore: prediction.risk_score,
      probabilities: prediction.probabilities
    };
  } catch (error) {
    console.error('Prediction failed:', error);
    throw error;
  }
}

// Usage
async function main() {
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.error('API not ready');
    return;
  }

  const result = await predictRisk({
    area: 8.2,
    perimeter: 12.5,
    compactness: 0.35,
    meanElev: 12.0,
    minElev: 4.0,
    riverDensity: 0.08,
    riverDistance: 0.35,
    residentialPct: 0.45,
    ricePct: 0.35
  });

  console.log('Risk Class:', result.riskClass);
  console.log('Confidence:', result.confidence.toFixed(2) + '%');
  console.log('Risk Score:', result.riskScore + '/100');
}
```

---

## Risk Score Interpretation

| Score Range | Class | Meaning | Action |
|-------------|-------|---------|--------|
| 0-35 | Rendah | Low flood risk | Standard drainage sufficient |
| 36-70 | Sedang | Medium flood risk | Enhanced drainage needed |
| 71-100 | Tinggi | High flood risk | Emergency preparedness required |

---

## Feature Reference

| Feature | Unit | Range | Description |
|---------|------|-------|-------------|
| `shape_area` | km² | 0.1-50 | Administrative area size |
| `shape_leng` | km | 3-40 | Administrative boundary length |
| `compactness` | ratio | 0.1-1.0 | Shape regularity (1.0 = perfect circle) |
| `elev_mean` | meters | 0-100 | Average elevation above sea level |
| `elev_min` | meters | 0-80 | Minimum elevation |
| `sungai_density` | ratio | 0-0.5 | River network density |
| `dist_to_river` | km | 0.001-5 | Distance to nearest waterway |
| `pct_pemukiman` | fraction | 0-1 | Residential area percentage |
| `pct_sawah` | fraction | 0-1 | Rice field area percentage |

---

## Troubleshooting

### API Connection Failed
- Ensure Flask server is running: `python -m ml.api`
- Check port 5000 is available
- Verify firewall allows localhost:5000

### Model Not Loaded
- Check `ml/models/` contains all 4 artifacts:
  - `flood_risk_model.pkl`
  - `scaler.pkl`
  - `label_encoder.pkl`
  - `model_metadata.json`

### CORS Issues
- Allowed origins configured in `/api/health` response
- Add your frontend URL if missing

### Timeout Errors
- Default timeout: 5.0 seconds
- Complex queries may take 6-8ms (model inference)
- Check system resources if consistently > 1s

---

## Production Deployment Notes

1. **Model versioning**: Keep model_metadata.json with timestamp
2. **Feature validation**: Always validate feature ranges before prediction
3. **Error handling**: Implement retry logic for network failures
4. **Logging**: Log all predictions for audit trail
5. **Caching**: Cache predictions for identical geometries (24-hour TTL)
6. **Monitoring**: Track prediction latency and accuracy metrics

---

**Status**: ✅ Ready for Integration  
**Last Updated**: May 13, 2026  
**Model Version**: XGBoost (76.91% CV accuracy)
