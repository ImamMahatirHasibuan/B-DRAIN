from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import json
import logging
import os
import time
import uuid

from flask import Flask, g, jsonify, request
from flask_cors import CORS
import joblib
import numpy as np


def _parse_allowed_origins():
    raw_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
    )
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["http://localhost:5173", "http://localhost:5174"]


def _create_logger():
    logger = logging.getLogger("bdrain_api")
    if logger.handlers:
        return logger

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
    logger.propagate = False
    return logger

app = Flask(__name__)
ALLOWED_ORIGINS = _parse_allowed_origins()
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})
LOGGER = _create_logger()
INFERENCE_TIMEOUT_SECONDS = float(os.getenv("INFERENCE_TIMEOUT_SECONDS", "5"))

# ============================================
# Load Model
# ============================================
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(__file__), "models"))

try:
    model = joblib.load(os.path.join(MODEL_DIR, "flood_risk_model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "r", encoding="utf-8") as f:
        metadata = json.load(f)
    MODEL_LOADED = True
    acc_key = "cv_accuracy" if "cv_accuracy" in metadata else "accuracy"
    LOGGER.info(
        json.dumps(
            {
                "event": "model_loaded",
                "model_name": metadata.get("model_name"),
                "accuracy": metadata.get(acc_key, 0),
            },
            ensure_ascii=True,
        )
    )
except Exception as e:
    MODEL_LOADED = False
    LOGGER.warning(
        json.dumps(
            {
                "event": "model_load_failed",
                "error": str(e),
                "model_dir": MODEL_DIR,
            },
            ensure_ascii=True,
        )
    )
    metadata = {}

FEATURE_COLUMNS = [
    # Fitur spasial
    'shape_area', 'shape_leng', 'compactness',
    # Fitur topografi (dari geojson_kota_bekasi BIG 1:25K)
    'elev_mean',            # Elevasi rata-rata (m)
    'elev_min',             # Elevasi minimum (m)
    'sungai_density',       # Panjang sungai / luas kelurahan
    'dist_to_river',        # Jarak centroid ke sungai terdekat (derajat)
    'pct_pemukiman',        # Proporsi area permukiman
    'pct_sawah',            # Proporsi area sawah
]

RISK_CLASS_WEIGHTS = {"rendah": 25, "sedang": 60, "tinggi": 100}
NON_NEGATIVE_FIELDS = {
    "shape_area",
    "shape_leng",
    "compactness",
    "elev_mean",
    "elev_min",
    "sungai_density",
    "dist_to_river",
    "pct_pemukiman",
    "pct_sawah",
}


def _json_log(event_name, **kwargs):
    payload = {"event": event_name, **kwargs}
    LOGGER.info(json.dumps(payload, ensure_ascii=True, default=str))


def _error_response(message, status_code=400, code="BAD_REQUEST", details=None):
    payload = {
        "success": False,
        "error": message,
        "code": code,
    }
    if details is not None:
        payload["details"] = details
    return jsonify(payload), status_code


def _validate_feature_payload(data):
    if not isinstance(data, dict):
        return [{"field": "body", "message": "Body JSON harus berupa object"}], None

    missing = [field for field in FEATURE_COLUMNS if field not in data]
    if missing:
        return [{"field": "missing", "message": f"Fitur tidak lengkap: {missing}"}], None

    normalized = {}
    errors = []

    for field in FEATURE_COLUMNS:
        try:
            normalized[field] = float(data[field])
        except (TypeError, ValueError):
            errors.append({"field": field, "message": "Nilai harus numerik"})

    if errors:
        return errors, None

    for field in ("pct_pemukiman", "pct_sawah"):
        if not 0.0 <= normalized[field] <= 1.0:
            errors.append({"field": field, "message": "Nilai harus di antara 0 dan 1"})

    for field in NON_NEGATIVE_FIELDS:
        if normalized[field] < 0:
            errors.append({"field": field, "message": "Nilai tidak boleh negatif"})

    return errors, normalized


def _calculate_risk_score(prob_dict):
    return round(sum(prob_dict.get(label, 0.0) * weight for label, weight in RISK_CLASS_WEIGHTS.items()), 1)


def _predict_one(normalized_payload):
    x_input = np.array([[normalized_payload[field] for field in FEATURE_COLUMNS]], dtype=float)
    x_scaled = scaler.transform(x_input)
    prediction = model.predict(x_scaled)[0]
    probabilities = model.predict_proba(x_scaled)[0]
    predicted_label = label_encoder.inverse_transform([prediction])[0]
    probability_map = {
        label_encoder.classes_[i]: float(probabilities[i]) for i in range(len(label_encoder.classes_))
    }

    return {
        "predicted_class": predicted_label,
        "risk_score": _calculate_risk_score(probability_map),
        "probabilities": probability_map,
        "confidence": float(max(probabilities)) * 100,
    }


def _predict_with_timeout(normalized_payload):
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_predict_one, normalized_payload)
        return future.result(timeout=INFERENCE_TIMEOUT_SECONDS)


@app.before_request
def _before_request_logging():
    g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    g.start_time = time.perf_counter()


@app.after_request
def _after_request_logging(response):
    duration_ms = round((time.perf_counter() - g.start_time) * 1000, 2)
    _json_log(
        "http_request",
        request_id=g.request_id,
        method=request.method,
        path=request.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        remote_addr=request.headers.get("X-Forwarded-For", request.remote_addr),
    )
    response.headers["X-Request-ID"] = g.request_id
    return response

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
        'macro_f1': metadata.get('cv_macro_f1') if MODEL_LOADED else None,
        'allowed_origins': ALLOWED_ORIGINS,
        'inference_timeout_seconds': INFERENCE_TIMEOUT_SECONDS,
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Prediksi risiko banjir untuk 1 kelurahan.

    Body JSON:
    {
        "shape_area": 0.0005, "shape_leng": 0.15, "compactness": 0.28,
        "elev_mean": 8.0, "elev_min": 3.0,
        "sungai_density": 0.08, "dist_to_river": 0.005,
        "pct_pemukiman": 0.65, "pct_sawah": 0.05
    }
    """
    if not MODEL_LOADED:
        return _error_response(
            'Model belum diload. Jalankan training Colab dulu.',
            status_code=503,
            code='MODEL_NOT_READY',
        )

    try:
        data = request.get_json(silent=True)
        if data is None:
            return _error_response('Body JSON diperlukan', status_code=400, code='INVALID_BODY')

        validation_errors, normalized_payload = _validate_feature_payload(data)
        if validation_errors:
            message = validation_errors[0]['message']
            return _error_response(message, status_code=400, code='VALIDATION_ERROR', details=validation_errors)

        prediction_response = _predict_with_timeout(normalized_payload)
        return jsonify(prediction_response)

    except FuturesTimeoutError:
        return _error_response(
            'Waktu proses prediksi melebihi batas.',
            status_code=504,
            code='INFERENCE_TIMEOUT',
        )

    except Exception as e:
        _json_log('predict_error', request_id=g.request_id, error=str(e))
        return _error_response(
            'Terjadi kesalahan saat melakukan prediksi.',
            status_code=500,
            code='PREDICTION_ERROR',
        )


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
        return _error_response('Model belum diload.', status_code=503, code='MODEL_NOT_READY')

    try:
        data = request.get_json(silent=True)
        if data is None:
            return _error_response('Body JSON diperlukan', status_code=400, code='INVALID_BODY')

        features_list = data.get('features') if isinstance(data, dict) else None
        if not isinstance(features_list, list) or not features_list:
            return _error_response('Array features tidak boleh kosong', status_code=400, code='INVALID_BATCH_BODY')

        results = []
        for index, item in enumerate(features_list):
            kelurahan = item.get('kelurahan', '') if isinstance(item, dict) else ''
            try:
                validation_errors, normalized_payload = _validate_feature_payload(item)
                if validation_errors:
                    results.append(
                        {
                            'index': index,
                            'kelurahan': kelurahan,
                            'success': False,
                            'error': 'Validasi input gagal',
                            'code': 'VALIDATION_ERROR',
                            'details': validation_errors,
                        }
                    )
                    continue

                prediction_response = _predict_with_timeout(normalized_payload)
                results.append(
                    {
                        'index': index,
                        'kelurahan': kelurahan,
                        'kecamatan': item.get('kecamatan', ''),
                        'success': True,
                        **prediction_response,
                    }
                )

            except FuturesTimeoutError:
                results.append(
                    {
                        'index': index,
                        'kelurahan': kelurahan,
                        'success': False,
                        'error': 'Waktu proses prediksi melebihi batas.',
                        'code': 'INFERENCE_TIMEOUT',
                    }
                )

            except Exception as e:
                results.append(
                    {
                        'index': index,
                        'kelurahan': kelurahan,
                        'success': False,
                        'error': 'Terjadi kesalahan saat melakukan prediksi.',
                        'code': 'PREDICTION_ERROR',
                        'details': str(e),
                    }
                )

        return jsonify({
            'total': len(results),
            'results': results
        })

    except Exception as e:
        _json_log('predict_batch_error', request_id=g.request_id, error=str(e))
        return _error_response(
            'Terjadi kesalahan saat melakukan prediksi batch.',
            status_code=500,
            code='BATCH_PREDICTION_ERROR',
        )


@app.route('/api/model/info', methods=['GET'])
def model_info():
    if not MODEL_LOADED:
        return _error_response('Model belum diload.', status_code=503, code='MODEL_NOT_READY')
    return jsonify(metadata)


if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    debug_mode = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    print('B-DRAIN ML API Server')
    print(f'   URL: http://localhost:{port}')
    print('   Endpoints:')
    print('     GET  /api/health')
    print('     POST /api/predict')
    print('     POST /api/predict/batch')
    print('     GET  /api/model/info')
    app.run(debug=debug_mode, port=port)
