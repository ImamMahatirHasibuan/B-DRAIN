import pathlib
import sys
import time

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
import api as api_module


class DummyScaler:
    def transform(self, values):
        return values


class DummyModel:
    # Model hanya memiliki dua kelas: indeks 0 = sedang, indeks 1 = tinggi.
    def predict(self, values):
        return [1]

    def predict_proba(self, values):
        return [[0.3, 0.7]]


class DummyEncoder:
    classes_ = ["sedang", "tinggi"]

    def inverse_transform(self, values):
        return ["tinggi"]


class SlowModel(DummyModel):
    def predict(self, values):
        time.sleep(0.05)
        return [2]


@pytest.fixture
def client():
    api_module.app.config["TESTING"] = True
    with api_module.app.test_client() as test_client:
        yield test_client


@pytest.fixture
def mock_model_loaded(monkeypatch):
    monkeypatch.setattr(api_module, "MODEL_LOADED", True)
    monkeypatch.setattr(api_module, "scaler", DummyScaler())
    monkeypatch.setattr(api_module, "model", DummyModel())
    monkeypatch.setattr(api_module, "label_encoder", DummyEncoder())
    monkeypatch.setattr(
        api_module,
        "metadata",
        {
            "model_name": "dummy-model",
            "cv_accuracy": 0.91,
            "cv_macro_f1": 0.88,
        },
    )


def _valid_payload():
    # Only include FEATURE_COLUMNS expected by the API
    return {
        "shape_area": 0.0005,
        "shape_leng": 0.15,
        "compactness": 0.28,
        "elev_mean": 8.0,
        "elev_min": 3.0,
        "sungai_density": 0.08,
        "dist_to_river": 0.005,
        "pct_pemukiman": 0.65,
        "pct_sawah": 0.05,
    }


def test_health_returns_ok_and_status_keys(client, mock_model_loaded):
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["model_name"] == "dummy-model"


def test_predict_returns_503_when_model_not_loaded(client, monkeypatch):
    monkeypatch.setattr(api_module, "MODEL_LOADED", False)

    response = client.post("/api/predict", json={})

    assert response.status_code == 503
    assert "error" in response.get_json()


def test_predict_returns_400_when_body_missing(client, mock_model_loaded):
    response = client.post("/api/predict", data="null", content_type="application/json")

    assert response.status_code == 400
    assert "Body JSON diperlukan" in response.get_json()["error"]


def test_predict_returns_400_when_features_incomplete(client, mock_model_loaded):
    response = client.post("/api/predict", json={"shape_area": 0.1})

    assert response.status_code == 400
    assert "Fitur tidak lengkap" in response.get_json()["error"]


def test_predict_returns_400_when_schema_invalid(client, mock_model_loaded):
    payload = _valid_payload()
    # invalidate a numeric field (pct_pemukiman must be between 0 and 1)
    payload["pct_pemukiman"] = -0.5

    response = client.post("/api/predict", json=payload)

    assert response.status_code == 400
    data = response.get_json()
    assert data["code"] == "VALIDATION_ERROR"
    assert any(detail["field"] == "pct_pemukiman" for detail in data["details"])


def test_predict_success_returns_class_and_score(client, mock_model_loaded):
    response = client.post("/api/predict", json=_valid_payload())

    assert response.status_code == 200
    data = response.get_json()
    assert data["predicted_class"] == "tinggi"
    # risk_score = 0.3 * 60 (sedang) + 0.7 * 100 (tinggi) = 88.0
    assert data["risk_score"] == pytest.approx(88.0)
    assert data["confidence"] == pytest.approx(70.0)
    assert set(data["probabilities"].keys()) == {"sedang", "tinggi"}


def test_predict_batch_returns_400_when_features_empty(client, mock_model_loaded):
    response = client.post("/api/predict/batch", json={"features": []})

    assert response.status_code == 400
    assert "Array features tidak boleh kosong" in response.get_json()["error"]


def test_predict_batch_success_returns_results(client, mock_model_loaded):
    features = [
        {
            "kelurahan": "Jatikarya",
            "kecamatan": "Jatisampurna",
            **_valid_payload(),
        }
    ]

    response = client.post("/api/predict/batch", json={"features": features})

    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["kelurahan"] == "Jatikarya"
    assert data["results"][0]["predicted_class"] == "tinggi"


def test_predict_returns_504_when_inference_timeout(client, mock_model_loaded, monkeypatch):
    monkeypatch.setattr(api_module, "model", SlowModel())
    monkeypatch.setattr(api_module, "INFERENCE_TIMEOUT_SECONDS", 0.01)

    response = client.post("/api/predict", json=_valid_payload())

    assert response.status_code == 504
    data = response.get_json()
    assert data["code"] == "INFERENCE_TIMEOUT"


def test_health_includes_validation_status(client, mock_model_loaded):
    data = client.get("/api/health").get_json()

    assert data["validation_status"] == "Prototipe — Belum Tervalidasi"
    assert data["status_validasi"] == "PROTOTIPE — BELUM TERVALIDASI"
    assert "prototipe penelitian" in data["validation_note"].lower()


def test_predict_success_includes_validation_status(client, mock_model_loaded):
    data = client.post("/api/predict", json=_valid_payload()).get_json()

    assert data["validation_status"] == "Prototipe — Belum Tervalidasi"


def test_predict_batch_includes_validation_status(client, mock_model_loaded):
    features = [{"kelurahan": "Jatikarya", "kecamatan": "Jatisampurna", **_valid_payload()}]

    data = client.post("/api/predict/batch", json={"features": features}).get_json()

    assert data["validation_status"] == "Prototipe — Belum Tervalidasi"
    assert data["results"][0]["validation_status"] == "Prototipe — Belum Tervalidasi"


def test_health_reports_readiness_and_version(client, mock_model_loaded):
    data = client.get("/api/health").get_json()

    assert data["backend_status"] == "ok"
    assert data["model_status"] == "ready"
    assert data["inference_ready"] is True
    assert data["status_validasi"] == "PROTOTIPE — BELUM TERVALIDASI"


def test_predict_rejects_outside_kota_bekasi(client, mock_model_loaded):
    payload = {**_valid_payload(), "kelurahan": "Cakung Timur", "wadmkk": "Kota Jakarta Timur"}
    response = client.post("/api/predict", json=payload)

    assert response.status_code == 400
    data = response.get_json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "Kota Bekasi" in data["error"]


def test_predict_batch_handles_mixed_valid_and_invalid_items_in_order(client, mock_model_loaded):
    features = [
        {"id": "kel-1", "kelurahan": "Jatiasih", "kecamatan": "Jatiasih", **_valid_payload()},
        {"id": "kel-2", "kelurahan": "DataKurang", "kecamatan": "Jatiasih", "shape_area": 4000000.0},
        {"id": "kel-3", "kelurahan": "Cakung", "wadmkk": "Kota Jakarta Timur", **_valid_payload()},
        {"id": "kel-4", "kelurahan": "Margahayu", "kecamatan": "Bekasi Timur", **_valid_payload()},
    ]

    response = client.post("/api/predict/batch", json={"features": features})
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 4
    results = data["results"]
    assert [r["index"] for r in results] == [0, 1, 2, 3]
    assert results[0]["success"] is True
    assert results[0]["kelurahan"] == "Jatiasih"
    assert results[1]["success"] is False
    assert results[1]["code"] == "VALIDATION_ERROR"
    assert results[2]["success"] is False
    assert results[2]["code"] == "VALIDATION_ERROR"
    assert results[3]["success"] is True
    assert results[3]["kelurahan"] == "Margahayu"


def test_real_model_artifact_loads_and_predicts_distinct_kelurahan(client):
    """Uji langsung terhadap artefak model aktual di ml/models/ (bukan dummy)."""
    assert api_module.MODEL_LOADED is True
    info_res = client.get("/api/model/info")
    assert info_res.status_code == 200
    info = info_res.get_json()
    assert info["total_kelurahan_kota_bekasi"] == 48
    assert info["training_samples"] == 33
    assert info["label_classes"] == ["sedang", "tinggi"]

    # Dua kelurahan Kota Bekasi dengan karakteristik nyata berbeda dari dataset_eksperimen_per_kelurahan.csv
    features_batch = [
        {
            "kelurahan": "Jatikarya",
            "kecamatan": "Jatisampurna",
            "wadmkk": "Kota Bekasi",
            "shape_area": 6670010.48,
            "shape_leng": 17407.57,
            "compactness": 0.2766,
            "elev_mean": 69.53,
            "elev_min": 50.0,
            "sungai_density": 0.001386,
            "dist_to_river": 269.36,
            "pct_pemukiman": 0.4695,
            "pct_sawah": 0.0130,
        },
        {
            "kelurahan": "Harapanjaya",
            "kecamatan": "Bekasi Utara",
            "wadmkk": "Kota Bekasi",
            "shape_area": 7752472.30,
            "shape_leng": 14934.18,
            "compactness": 0.4368,
            "elev_mean": 12.24,
            "elev_min": 6.25,
            "sungai_density": 0.001943,
            "dist_to_river": 205.39,
            "pct_pemukiman": 0.5792,
            "pct_sawah": 0.1928,
        },
    ]
    res = client.post("/api/predict/batch", json={"features": features_batch})
    assert res.status_code == 200
    batch_data = res.get_json()
    r0, r1 = batch_data["results"][0], batch_data["results"][1]
    assert r0["success"] is True and r1["success"] is True
    assert r0["predicted_class"] in ("sedang", "tinggi")
    assert r1["predicted_class"] in ("sedang", "tinggi")
    # Pastikan skor probabilitas kedua kelurahan berbeda (tidak seragam/konstan)
    assert r0["probabilities"]["tinggi"] != r1["probabilities"]["tinggi"]
    assert r0["kelurahan_id"] == "KEL_JATIKARYA"
    assert r1["kelurahan_id"] == "KEL_HARAPANJAYA"
    assert r0["model_status"] == "PROTOTIPE — BELUM TERVALIDASI"
    assert r1["model_status"] == "PROTOTIPE — BELUM TERVALIDASI"


def test_predict_rejects_null_nan_infinity_and_extra_features(client, mock_model_loaded):
    # 1. Nilai null
    null_payload = {**_valid_payload(), "elev_mean": None}
    res_null = client.post("/api/predict", json=null_payload)
    assert res_null.status_code == 400
    assert res_null.get_json()["code"] == "VALIDATION_ERROR"

    # 2. Nilai NaN / Infinity
    nan_payload = {**_valid_payload(), "elev_mean": "NaN"}
    res_nan = client.post("/api/predict", json=nan_payload)
    assert res_nan.status_code == 400
    assert res_nan.get_json()["code"] == "VALIDATION_ERROR"

    inf_payload = {**_valid_payload(), "dist_to_river": "Infinity"}
    res_inf = client.post("/api/predict", json=inf_payload)
    assert res_inf.status_code == 400
    assert res_inf.get_json()["code"] == "VALIDATION_ERROR"

    # 3. Jumlah fitur tidak sesuai (fitur tambahan tidak dikenal)
    extra_payload = {**_valid_payload(), "fitur_tambahan_palsu": 123.45}
    res_extra = client.post("/api/predict", json=extra_payload)
    assert res_extra.status_code == 400
    assert res_extra.get_json()["code"] == "VALIDATION_ERROR"


def test_single_prediction_nested_contract_and_pipeline_inference(client):
    """Uji kontrak nested features serta pastikan pipeline digunakan tanpa double scaling."""
    assert api_module._should_use_pipeline() is True
    payload = {
        "kelurahan_id": "KEL_JATIKARYA",
        "kelurahan_name": "Jatikarya",
        "kecamatan": "Jatisampurna",
        "features": {
            "shape_area": 6670010.48,
            "shape_leng": 17407.57,
            "compactness": 0.2766,
            "elev_mean": 69.53,
            "elev_min": 50.0,
            "sungai_density": 0.001386,
            "dist_to_river": 269.36,
            "pct_pemukiman": 0.4695,
            "pct_sawah": 0.0130,
        },
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "prediction" in data
    pred = data["prediction"]
    assert pred["kelurahan_id"] == "KEL_JATIKARYA"
    assert pred["kelurahan_name"] == "Jatikarya"
    assert pred["predicted_class"] in ("sedang", "tinggi")
    assert pred["model_status"] == "PROTOTIPE — BELUM TERVALIDASI"
    assert abs((pred["probabilities"]["sedang"] + pred["probabilities"]["tinggi"]) - 1.0) < 1e-6


def test_model_info_endpoint_returns_complete_metadata(client):
    res = client.get("/api/model/info")
    assert res.status_code == 200
    info = res.get_json()
    assert info["model_name"] == "Random Forest"
    assert info["algorithm"] == "RandomForestClassifier"
    assert info["feature_count"] == 9
    assert len(info["feature_columns"]) == 9
    assert info["label_classes"] == ["sedang", "tinggi"]
    assert info["model_config"]["n_estimators"] == 200
    assert info["model_config"]["max_depth"] == 8
    assert info["model_config"]["class_weight"] == "balanced"
    assert info["model_config"]["random_state"] == 42
    assert info["model_status"] == "PROTOTIPE — BELUM TERVALIDASI"
    assert info["status_validasi"] == "PROTOTIPE — BELUM TERVALIDASI"
    assert "logo_evaluation" in info
    assert info["logo_evaluation"]["varian_A"]["n"] == 27
    assert info["logo_evaluation"]["varian_B"]["n"] == 33


def test_batch_partial_failure_and_duplicate_kelurahan_id_preserves_order_and_accuracy(client):
    """
    Uji skenario batch partial failure (Section 4):
    - Seluruh item valid
    - Satu atau beberapa item tidak valid (fitur tidak lengkap, null, NaN, luar Kota Bekasi)
    - ID kelurahan duplikat
    - Urutan hasil response dan kelurahan_id terjaga tanpa mengontaminasi item lain
    """
    valid_jatikarya = {
        "kelurahan_id": "KEL_JATIKARYA",
        "kelurahan": "Jatikarya",
        "kecamatan": "Jatisampurna",
        "wadmkk": "Kota Bekasi",
        "shape_area": 6670010.48,
        "shape_leng": 17407.57,
        "compactness": 0.2766,
        "elev_mean": 69.53,
        "elev_min": 50.0,
        "sungai_density": 0.001386,
        "dist_to_river": 269.36,
        "pct_pemukiman": 0.4695,
        "pct_sawah": 0.0130,
    }
    valid_harapanjaya = {
        "kelurahan_id": "KEL_HARAPANJAYA",
        "kelurahan": "Harapanjaya",
        "kecamatan": "Bekasi Utara",
        "wadmkk": "Kota Bekasi",
        "shape_area": 7752472.30,
        "shape_leng": 14934.18,
        "compactness": 0.4368,
        "elev_mean": 12.24,
        "elev_min": 6.25,
        "sungai_density": 0.001943,
        "dist_to_river": 205.39,
        "pct_pemukiman": 0.5792,
        "pct_sawah": 0.1928,
    }

    batch_items = [
        valid_jatikarya,  # index 0: valid
        {"kelurahan_id": "KEL_CIKETINGUDIK", "kelurahan": "Ciketingudik", "shape_area": 5000000.0},  # index 1: incomplete
        {**valid_harapanjaya, "kelurahan_id": "KEL_CIKIWUL", "kelurahan": "Cikiwul", "elev_mean": None},  # index 2: null
        {**valid_harapanjaya, "kelurahan_id": "KEL_SUMURBATU", "kelurahan": "Sumurbatu", "dist_to_river": "NaN"},  # index 3: NaN
        {**valid_harapanjaya, "kelurahan_id": "KEL_LUAR", "kelurahan": "Cibitung", "wadmkk": "Kabupaten Bekasi"},  # index 4: luar Kota Bekasi
        valid_jatikarya,  # index 5: duplicate kelurahan_id (KEL_JATIKARYA)
        valid_harapanjaya,  # index 6: valid (KEL_HARAPANJAYA)
    ]

    res = client.post("/api/predict/batch", json={"features": batch_items})
    assert res.status_code == 200
    data = res.get_json()
    assert data["total"] == 7
    results = data["results"]

    assert [r["index"] for r in results] == [0, 1, 2, 3, 4, 5, 6]
    assert [r["kelurahan_id"] for r in results] == [
        "KEL_JATIKARYA",
        "KEL_CIKETINGUDIK",
        "KEL_CIKIWUL",
        "KEL_SUMURBATU",
        "KEL_LUAR",
        "KEL_JATIKARYA",
        "KEL_HARAPANJAYA",
    ]
    assert [r["success"] for r in results] == [True, False, False, False, False, False, True]

    # Item gagal memiliki kode error yang jelas dan tidak memiliki predicted_class
    for bad_idx in (1, 2, 3, 4):
        assert results[bad_idx]["code"] == "VALIDATION_ERROR"
        assert "predicted_class" not in results[bad_idx]

    # Item duplikat (index 5) ditolak secara eksplisit dengan kode DUPLICATE_KELURAHAN_ID tanpa menimpa index 0
    assert results[5]["code"] == "DUPLICATE_KELURAHAN_ID"
    assert results[5]["duplicate_of_index"] == 0
    assert "duplikat" in results[5]["error"].lower()
    assert "predicted_class" not in results[5]

    # Item pertama (index 0) dan item valid lainnya (index 6) tetap diprediksi dengan benar
    assert results[0]["success"] is True
    assert results[6]["success"] is True
    assert results[0]["probabilities"]["tinggi"] != results[6]["probabilities"]["tinggi"]



