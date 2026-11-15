from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import json
import logging
import os
import re
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
    pipeline_path = os.path.join(MODEL_DIR, "flood_risk_pipeline.pkl")
    pipeline = joblib.load(pipeline_path) if os.path.exists(pipeline_path) else None
    if pipeline is not None and hasattr(pipeline, "named_steps"):
        model = pipeline.named_steps.get("classifier") or joblib.load(os.path.join(MODEL_DIR, "flood_risk_model.pkl"))
        scaler = pipeline.named_steps.get("scaler") or joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    else:
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
                "model_version": metadata.get("model_version", "rf-logo-bekasi-v2"),
                "pipeline_loaded": pipeline is not None,
                "accuracy": metadata.get(acc_key, 0),
            },
            ensure_ascii=True,
        )
    )
except Exception as e:
    MODEL_LOADED = False
    pipeline = None
    model = None
    scaler = None
    label_encoder = None
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
    # Fitur geometri poligon kelurahan (EPSG:32748 UTM Zone 48S)
    'shape_area',           # Luas kelurahan (m2)
    'shape_leng',           # Keliling kelurahan (m)
    'compactness',          # Indeks kekompakan Polsby-Popper [0, 1]
    # Fitur topografi & hidrologi (dari geojson_kota_bekasi BIG 1:25K)
    'elev_mean',            # Elevasi rata-rata (m dpl)
    'elev_min',             # Elevasi minimum (m dpl)
    'sungai_density',       # Panjang sungai / luas kelurahan (m/m2)
    'dist_to_river',        # Jarak centroid kelurahan ke sungai terdekat (m)
    'pct_pemukiman',        # Proporsi area permukiman [0, 1]
    'pct_sawah',            # Proporsi area sawah [0, 1]
]

ALLOWED_METADATA_KEYS = {
    "id",
    "kelurahan_id",
    "kelurahan",
    "kelurahan_name",
    "kecamatan",
    "wadmkk",
    "wadmkc",
    "namobj",
    "has_flood_label",
    "label_status",
    "features",
}

RISK_CLASS_WEIGHTS = {"rendah": 25, "sedang": 60, "tinggi": 100}

# Status validasi model wajib konsisten di seluruh respons API dan antarmuka.
MODEL_VALIDATION_STATUS = "Prototipe — Belum Tervalidasi"
MODEL_VALIDATION_STATUS_UPPER = "PROTOTIPE — BELUM TERVALIDASI"
MODEL_VALIDATION_NOTE = (
    "Model Random Forest ini merupakan prototipe penelitian yang menggunakan data dan label keparahan "
    "dengan keterbatasan dokumentasi sumber. Hasil prediksi digunakan untuk kebutuhan eksplorasi dan "
    "analisis, bukan sebagai kepastian kejadian banjir."
)
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


def _normalize_kelurahan_id(raw_id=None, kelurahan_name=None, fallback=""):
    if raw_id is not None and str(raw_id).strip() != "":
        raw_str = str(raw_id).strip()
        if raw_str.upper().startswith("KEL_"):
            cleaned = re.sub(r"[^A-Z0-9]+", "_", raw_str[4:].strip().upper()).strip("_")
            return f"KEL_{cleaned}" if cleaned else raw_str
        return raw_str
    if kelurahan_name is not None and str(kelurahan_name).strip() != "":
        cleaned = re.sub(r"[^A-Z0-9]+", "_", str(kelurahan_name).strip().upper()).strip("_")
        if cleaned:
            return f"KEL_{cleaned}"
    return fallback


def _extract_kelurahan_identity(item, default_id=""):
    if not isinstance(item, dict):
        return {"id": default_id, "kelurahan_id": default_id, "kelurahan_name": "", "kelurahan": "", "kecamatan": ""}
    kel_name = str(item.get("kelurahan_name") or item.get("kelurahan") or item.get("namobj") or "").strip()
    kec_name = str(item.get("kecamatan") or item.get("wadmkc") or "").strip()
    raw_kel_id = item.get("kelurahan_id")
    raw_item_id = item.get("id")
    kel_id = _normalize_kelurahan_id(
        raw_id=raw_kel_id if raw_kel_id is not None else raw_item_id,
        kelurahan_name=kel_name,
        fallback=default_id,
    )
    item_id = str(raw_item_id).strip() if raw_item_id is not None and str(raw_item_id).strip() != "" else (kel_id or kel_name or default_id)
    return {
        "id": item_id,
        "kelurahan_id": kel_id,
        "kelurahan_name": kel_name,
        "kelurahan": kel_name,
        "kecamatan": kec_name,
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

    wadmkk = data.get("wadmkk")
    if wadmkk is not None and str(wadmkk).strip() != "" and str(wadmkk).strip().lower() != "kota bekasi":
        return [
            {
                "field": "wadmkk",
                "message": f"Wilayah '{wadmkk}' berada di luar Kota Bekasi dan tidak termasuk unit analisis model (48 Kelurahan Kota Bekasi)",
            }
        ], None

    # Dukung struktur bersarang {"features": {...}} maupun flat {"shape_area": ..., ...}
    if "features" in data and data["features"] is not None:
        feature_source = data["features"]
        if not isinstance(feature_source, dict):
            return [
                {
                    "field": "features",
                    "message": "Atribut 'features' harus berupa object yang berisi tepat 9 fitur numerik",
                }
            ], None
        extra_keys = sorted(set(feature_source.keys()) - set(FEATURE_COLUMNS))
        if extra_keys:
            return [
                {
                    "field": "features",
                    "message": f"Jumlah atau nama fitur tidak sesuai (fitur tidak dikenal: {extra_keys}). Model membutuhkan tepat 9 fitur.",
                }
            ], None
    else:
        feature_source = data
        extra_top_keys = sorted(set(data.keys()) - ALLOWED_METADATA_KEYS - set(FEATURE_COLUMNS))
        if extra_top_keys:
            return [
                {
                    "field": "features",
                    "message": f"Jumlah atau nama fitur tidak sesuai (atribut tidak dikenal: {extra_top_keys}). Model membutuhkan tepat 9 fitur.",
                }
            ], None

    missing = [
        field
        for field in FEATURE_COLUMNS
        if field not in feature_source or feature_source[field] is None or feature_source[field] == ""
    ]
    if missing:
        return [{"field": "missing", "message": f"Fitur tidak lengkap: {missing}"}], None

    normalized = {}
    errors = []

    for field in FEATURE_COLUMNS:
        raw_val = feature_source[field]
        if isinstance(raw_val, bool):
            errors.append({"field": field, "message": "Nilai harus numerik"})
            continue
        try:
            val = float(raw_val)
            if not np.isfinite(val):
                errors.append({"field": field, "message": "Nilai harus numerik berhingga (bukan NaN/Inf)"})
                continue
            normalized[field] = val
        except (TypeError, ValueError):
            errors.append({"field": field, "message": "Nilai harus numerik"})

    if errors:
        return errors, None

    if len(normalized) != len(FEATURE_COLUMNS):
        return [
            {
                "field": "features",
                "message": f"Jumlah fitur tidak sesuai: diterima {len(normalized)}, dibutuhkan {len(FEATURE_COLUMNS)}",
            }
        ], None

    for field in ("pct_pemukiman", "pct_sawah", "compactness"):
        if not 0.0 <= normalized[field] <= 1.0:
            errors.append({"field": field, "message": "Nilai harus di antara 0 dan 1"})

    for field in NON_NEGATIVE_FIELDS:
        if normalized[field] < 0:
            errors.append({"field": field, "message": "Nilai tidak boleh negatif"})

    if normalized.get("shape_area", 0) <= 0:
        errors.append({"field": "shape_area", "message": "Nilai shape_area harus lebih besar dari 0"})

    if normalized.get("shape_leng", 0) <= 0:
        errors.append({"field": "shape_leng", "message": "Nilai shape_leng harus lebih besar dari 0"})

    return errors, normalized


def _calculate_risk_score(prob_dict):
    return round(sum(prob_dict.get(label, 0.0) * weight for label, weight in RISK_CLASS_WEIGHTS.items()), 1)


def _should_use_pipeline():
    """
    Gunakan `pipeline` (StandardScaler + RandomForestClassifier) sebagai jalur utama inferensi
    tanpa melakukan scaling dua kali. Jika pada unit test `model` atau `scaler` di-monkeypatch
    secara terpisah, gunakan fallback ke `scaler` + `model` yang di-monkeypatch tersebut.
    """
    if pipeline is None:
        return False
    named_steps = getattr(pipeline, "named_steps", None)
    if isinstance(named_steps, dict):
        pipe_clf = named_steps.get("classifier")
        pipe_scaler = named_steps.get("scaler")
        if pipe_clf is not None and model is not None and pipe_clf is not model:
            return False
        if pipe_scaler is not None and scaler is not None and pipe_scaler is not scaler:
            return False
    return True


def _format_prediction_output(pred_idx, prob_row):
    predicted_label = str(label_encoder.inverse_transform([pred_idx])[0])
    probability_map = {
        str(label_encoder.classes_[i]): float(prob_row[i]) for i in range(len(label_encoder.classes_))
    }
    model_ver = (
        metadata.get("model_version", "rf-logo-bekasi-v2") if isinstance(metadata, dict) else "rf-logo-bekasi-v2"
    )
    return {
        "predicted_class": predicted_label,
        "risk_score": _calculate_risk_score(probability_map),
        "probabilities": probability_map,
        "confidence": float(max(prob_row)) * 100,
        "model_version": model_ver,
        "model_status": MODEL_VALIDATION_STATUS_UPPER,
        "validation_status": MODEL_VALIDATION_STATUS,
        "status_validasi": MODEL_VALIDATION_STATUS_UPPER,
        "validation_note": MODEL_VALIDATION_NOTE,
    }


def _predict_batch_matrix(normalized_payloads):
    x_input = np.array(
        [[payload[field] for field in FEATURE_COLUMNS] for payload in normalized_payloads],
        dtype=float,
    )
    if _should_use_pipeline():
        predictions = pipeline.predict(x_input)
        probabilities = pipeline.predict_proba(x_input)
    else:
        x_scaled = scaler.transform(x_input)
        predictions = model.predict(x_scaled)
        probabilities = model.predict_proba(x_scaled)
        if len(predictions) != len(normalized_payloads):
            predictions = [model.predict(scaler.transform(x_input[i : i + 1]))[0] for i in range(len(normalized_payloads))]
            probabilities = [
                model.predict_proba(scaler.transform(x_input[i : i + 1]))[0] for i in range(len(normalized_payloads))
            ]

    return [
        _format_prediction_output(predictions[idx], probabilities[idx])
        for idx in range(len(normalized_payloads))
    ]


def _predict_one(normalized_payload):
    return _predict_batch_matrix([normalized_payload])[0]


def _predict_with_timeout(normalized_payload):
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_predict_one, normalized_payload)
        return future.result(timeout=INFERENCE_TIMEOUT_SECONDS)


def _predict_batch_with_timeout(normalized_payloads):
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_predict_batch_matrix, normalized_payloads)
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
    is_ready = bool(
        MODEL_LOADED
        and (pipeline is not None or (model is not None and scaler is not None))
        and label_encoder is not None
    )
    return jsonify({
        'status': 'ok',
        'backend_status': 'ok',
        'model_status': 'ready' if is_ready else 'not_ready',
        'model_loaded': is_ready,
        'inference_ready': is_ready,
        'pipeline_ready': bool(MODEL_LOADED and pipeline is not None),
        'model_version': metadata.get('model_version', 'rf-logo-bekasi-v2') if is_ready else None,
        'model_name': metadata.get('model_name') if is_ready else None,
        'validation_status': MODEL_VALIDATION_STATUS,
        'status_validasi': MODEL_VALIDATION_STATUS_UPPER,
        'validation_note': MODEL_VALIDATION_NOTE,
        'accuracy': metadata.get('cv_accuracy', metadata.get('accuracy')) if is_ready else None,
        'macro_f1': metadata.get('cv_macro_f1') if is_ready else None,
        'training_samples': metadata.get('training_samples') if is_ready else None,
        'total_kelurahan_kota_bekasi': metadata.get('total_kelurahan_kota_bekasi', 48) if is_ready else None,
        'allowed_origins': ALLOWED_ORIGINS,
        'inference_timeout_seconds': INFERENCE_TIMEOUT_SECONDS,
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Prediksi risiko banjir untuk 1 kelurahan di Kota Bekasi.
    Mendukung format flat maupun nested {"kelurahan_id": ..., "kelurahan_name": ..., "features": {...}}.
    """
    if not MODEL_LOADED:
        return _error_response(
            'Model belum diload. Jalankan ml/train_logo_model.py terlebih dahulu.',
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

        prediction_core = _predict_with_timeout(normalized_payload)
        identity = _extract_kelurahan_identity(data, default_id="")

        prediction_obj = {
            **prediction_core,
            "kelurahan_id": identity["kelurahan_id"],
            "kelurahan_name": identity["kelurahan_name"],
        }
        if identity["kelurahan"]:
            prediction_obj["kelurahan"] = identity["kelurahan"]
        if identity["kecamatan"]:
            prediction_obj["kecamatan"] = identity["kecamatan"]

        response_payload = {
            "success": True,
            "prediction": prediction_obj,
            **prediction_obj,
        }
        return jsonify(response_payload)

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
    Prediksi risiko banjir untuk banyak kelurahan Kota Bekasi sekaligus secara efisien (vectorized batch inference).
    Mendukung {"features": [...]} maupun {"items": [...]}.
    """
    if not MODEL_LOADED:
        return _error_response('Model belum diload.', status_code=503, code='MODEL_NOT_READY')

    try:
        data = request.get_json(silent=True)
        if data is None:
            return _error_response('Body JSON diperlukan', status_code=400, code='INVALID_BODY')

        features_list = None
        if isinstance(data, dict):
            features_list = data.get('features') if 'features' in data else data.get('items')
        if not isinstance(features_list, list) or not features_list:
            return _error_response('Array features tidak boleh kosong', status_code=400, code='INVALID_BATCH_BODY')

        results = [None] * len(features_list)
        valid_indices = []
        valid_payloads = []
        valid_identities = []
        seen_kelurahan_ids = {}

        for index, item in enumerate(features_list):
            identity = _extract_kelurahan_identity(item, default_id=f'item-{index}')
            kel_id = identity['kelurahan_id']
            is_explicit_kel_id = bool(kel_id and kel_id != f'item-{index}')

            if is_explicit_kel_id and kel_id in seen_kelurahan_ids:
                first_idx = seen_kelurahan_ids[kel_id]
                results[index] = {
                    'index': index,
                    'id': identity['id'],
                    'kelurahan_id': kel_id,
                    'kelurahan_name': identity['kelurahan_name'],
                    'kelurahan': identity['kelurahan'],
                    'kecamatan': identity['kecamatan'],
                    'success': False,
                    'error': (
                        f"ID kelurahan duplikat dalam satu permintaan batch: '{kel_id}' "
                        f"(sudah ada pada indeks {first_idx}). Hanya kemunculan pertama yang diproses."
                    ),
                    'code': 'DUPLICATE_KELURAHAN_ID',
                    'duplicate_of_index': first_idx,
                }
                continue

            if is_explicit_kel_id:
                seen_kelurahan_ids[kel_id] = index

            validation_errors, normalized_payload = _validate_feature_payload(item)
            if validation_errors:
                results[index] = {
                    'index': index,
                    'id': identity['id'],
                    'kelurahan_id': identity['kelurahan_id'],
                    'kelurahan_name': identity['kelurahan_name'],
                    'kelurahan': identity['kelurahan'],
                    'kecamatan': identity['kecamatan'],
                    'success': False,
                    'error': validation_errors[0]['message'] if validation_errors else 'Validasi input gagal',
                    'code': 'VALIDATION_ERROR',
                    'details': validation_errors,
                }
            else:
                valid_indices.append(index)
                valid_payloads.append(normalized_payload)
                valid_identities.append(identity)

        if valid_payloads:
            try:
                batch_predictions = _predict_batch_with_timeout(valid_payloads)
                for idx_pos, orig_index in enumerate(valid_indices):
                    identity = valid_identities[idx_pos]
                    pred_output = batch_predictions[idx_pos]
                    results[orig_index] = {
                        'index': orig_index,
                        'id': identity['id'],
                        'kelurahan_id': identity['kelurahan_id'],
                        'kelurahan_name': identity['kelurahan_name'],
                        'kelurahan': identity['kelurahan'],
                        'kecamatan': identity['kecamatan'],
                        'success': True,
                        **pred_output,
                    }
            except FuturesTimeoutError:
                for idx_pos, orig_index in enumerate(valid_indices):
                    identity = valid_identities[idx_pos]
                    results[orig_index] = {
                        'index': orig_index,
                        'id': identity['id'],
                        'kelurahan_id': identity['kelurahan_id'],
                        'kelurahan_name': identity['kelurahan_name'],
                        'kelurahan': identity['kelurahan'],
                        'kecamatan': identity['kecamatan'],
                        'success': False,
                        'error': 'Waktu proses prediksi melebihi batas.',
                        'code': 'INFERENCE_TIMEOUT',
                    }
            except Exception as e:
                for idx_pos, orig_index in enumerate(valid_indices):
                    identity = valid_identities[idx_pos]
                    results[orig_index] = {
                        'index': orig_index,
                        'id': identity['id'],
                        'kelurahan_id': identity['kelurahan_id'],
                        'kelurahan_name': identity['kelurahan_name'],
                        'kelurahan': identity['kelurahan'],
                        'kecamatan': identity['kecamatan'],
                        'success': False,
                        'error': 'Terjadi kesalahan saat melakukan prediksi.',
                        'code': 'PREDICTION_ERROR',
                        'details': str(e),
                    }

        model_ver = (
            metadata.get('model_version', 'rf-logo-bekasi-v2') if isinstance(metadata, dict) else 'rf-logo-bekasi-v2'
        )
        return jsonify({
            'success': True,
            'total': len(results),
            'model_status': MODEL_VALIDATION_STATUS_UPPER,
            'validation_status': MODEL_VALIDATION_STATUS,
            'status_validasi': MODEL_VALIDATION_STATUS_UPPER,
            'validation_note': MODEL_VALIDATION_NOTE,
            'model_version': model_ver,
            'results': results,
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
    info_payload = dict(metadata) if isinstance(metadata, dict) else {}
    info_payload.setdefault('model_name', 'Random Forest')
    info_payload.setdefault('algorithm', 'RandomForestClassifier')
    info_payload.setdefault('model_version', 'rf-logo-bekasi-v2')
    info_payload['feature_count'] = len(info_payload.get('feature_columns', FEATURE_COLUMNS))
    info_payload.setdefault('feature_columns', FEATURE_COLUMNS)
    info_payload.setdefault('label_classes', ['sedang', 'tinggi'])
    info_payload['model_status'] = MODEL_VALIDATION_STATUS_UPPER
    info_payload['status_validasi'] = MODEL_VALIDATION_STATUS_UPPER
    info_payload['validation_status'] = MODEL_VALIDATION_STATUS
    info_payload['validation_note'] = MODEL_VALIDATION_NOTE
    info_payload['catatan_validasi'] = MODEL_VALIDATION_NOTE
    return jsonify(info_payload)


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
