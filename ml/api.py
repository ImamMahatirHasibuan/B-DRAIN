from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import json
import os

app = Flask(__name__)
# Izinkan semua origin (localhost dev + domain deploy)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ============================================
# Load Model
# ============================================
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

try:
    model = joblib.load(os.path.join(MODEL_DIR, 'flood_risk_model.pkl'))
    scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
    label_encoder = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))
    with open(os.path.join(MODEL_DIR, 'model_metadata.json'), 'r') as f:
        metadata = json.load(f)
    MODEL_LOADED = True
    acc_key = 'cv_accuracy' if 'cv_accuracy' in metadata else 'accuracy'
    print(f"✅ Model loaded: {metadata['model_name']} | CV Accuracy: {metadata.get(acc_key, 0)*100:.2f}%")
except Exception as e:
    MODEL_LOADED = False
    print(f"⚠️ Model belum tersedia: {e}")
    print("  → Jalankan notebook Colab dulu lalu taruh file .pkl di folder ml/models/")

FEATURE_COLUMNS = [
    # Fitur spasial
    'shape_area', 'shape_leng', 'compactness',
    'centroid_lat', 'centroid_lon',
    'is_bandang',           # 0=Banjir Genangan, 1=Banjir Bandang
    # Fitur topografi (dari geojson_kota_bekasi BIG 1:25K)
    'elev_mean',            # Elevasi rata-rata (m)
    'elev_min',             # Elevasi minimum (m)
    'sungai_density',       # Panjang sungai / luas kelurahan
    'dist_to_river',        # Jarak centroid ke sungai terdekat (derajat)
    'pct_pemukiman',        # Proporsi area permukiman
    'pct_sawah',            # Proporsi area sawah
    # Fitur historis
    'jumlah_titik_banjir', 'masa_tanggap_darurat_hari', 'severity_score'
]

# ============================================
# Routes
# ============================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': MODEL_LOADED,
        'model_name': metadata.get('model_name') if MODEL_LOADED else None,
        'accuracy': metadata.get('cv_accuracy', metadata.get('accuracy')) if MODEL_LOADED else None,
        'macro_f1': metadata.get('cv_macro_f1') if MODEL_LOADED else None
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Prediksi risiko banjir untuk 1 kelurahan.

    Body JSON:
    {
        "shape_area": 0.0005, "shape_leng": 0.15, "compactness": 0.28,
        "centroid_lat": -6.25, "centroid_lon": 107.0, "is_bandang": 0,
        "elev_mean": 8.0, "elev_min": 3.0,
        "sungai_density": 0.08, "dist_to_river": 0.005,
        "pct_pemukiman": 0.65, "pct_sawah": 0.05,
        "jumlah_titik_banjir": 28, "masa_tanggap_darurat_hari": 14,
        "severity_score": 3
    }
    """
    if not MODEL_LOADED:
        return jsonify({'error': 'Model belum diload. Jalankan training Colab dulu.'}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Body JSON diperlukan'}), 400

        # Validasi fitur
        missing = [f for f in FEATURE_COLUMNS if f not in data]
        if missing:
            return jsonify({'error': f'Fitur tidak lengkap: {missing}'}), 400

        # Buat input array
        X_input = np.array([[float(data[f]) for f in FEATURE_COLUMNS]])
        X_scaled = scaler.transform(X_input)

        # Prediksi
        prediction = model.predict(X_scaled)[0]
        probabilities = model.predict_proba(X_scaled)[0]
        predicted_label = label_encoder.inverse_transform([prediction])[0]

        # Risk score (0–100)
        class_order = {'rendah': 0, 'sedang': 1, 'tinggi': 2}
        prob_dict = {label_encoder.classes_[i]: float(probabilities[i]) for i in range(len(label_encoder.classes_))}
        risk_score = round(
            (prob_dict.get('rendah', 0) * 25 + 
             prob_dict.get('sedang', 0) * 60 + 
             prob_dict.get('tinggi', 0) * 100), 1
        )

        return jsonify({
            'predicted_class': predicted_label,
            'risk_score': risk_score,
            'probabilities': prob_dict,
            'confidence': float(max(probabilities)) * 100
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    """
    Prediksi risiko banjir untuk banyak kelurahan sekaligus (dari GeoJSON).
    
    Body JSON:
    {
        "features": [
            { "kelurahan": "Jatikarya", "shape_area": ..., ... },
            ...
        ]
    }
    """
    if not MODEL_LOADED:
        return jsonify({'error': 'Model belum diload.'}), 503

    try:
        data = request.get_json()
        features_list = data.get('features', [])
        if not features_list:
            return jsonify({'error': 'Array features tidak boleh kosong'}), 400

        results = []
        for item in features_list:
            try:
                X_input = np.array([[float(item.get(f, 0)) for f in FEATURE_COLUMNS]])
                X_scaled = scaler.transform(X_input)
                prediction = model.predict(X_scaled)[0]
                probabilities = model.predict_proba(X_scaled)[0]
                predicted_label = label_encoder.inverse_transform([prediction])[0]
                prob_dict = {label_encoder.classes_[i]: float(probabilities[i]) for i in range(len(label_encoder.classes_))}
                risk_score = round(
                    prob_dict.get('rendah', 0) * 25 +
                    prob_dict.get('sedang', 0) * 60 +
                    prob_dict.get('tinggi', 0) * 100, 1
                )
                results.append({
                    'kelurahan': item.get('kelurahan', ''),
                    'kecamatan': item.get('kecamatan', ''),
                    'predicted_class': predicted_label,
                    'risk_score': risk_score,
                    'probabilities': prob_dict,
                    'confidence': float(max(probabilities)) * 100
                })
            except Exception as e:
                results.append({
                    'kelurahan': item.get('kelurahan', ''),
                    'error': str(e)
                })

        return jsonify({
            'total': len(results),
            'results': results
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/model/info', methods=['GET'])
def model_info():
    if not MODEL_LOADED:
        return jsonify({'error': 'Model belum diload.'}), 503
    return jsonify(metadata)


if __name__ == '__main__':
    print("🚀 B-DRAIN ML API Server")
    print("   URL: http://localhost:5000")
    print("   Endpoints:")
    print("     GET  /api/health")
    print("     POST /api/predict")
    print("     POST /api/predict/batch")
    print("     GET  /api/model/info")
    app.run(debug=True, port=5000)
