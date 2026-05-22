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
    def predict(self, values):
        return [2]

    def predict_proba(self, values):
        return [[0.1, 0.2, 0.7]]


class DummyEncoder:
    classes_ = ["rendah", "sedang", "tinggi"]

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
    assert data["risk_score"] == 84.5
    assert data["confidence"] == 70.0


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
