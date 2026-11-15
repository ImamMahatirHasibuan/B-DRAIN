"""
Pengujian otomatis untuk Vercel Serverless Function entry point (api/index.py).
Memastikan kompatibilitas runtime Vercel dan ketersediaan seluruh endpoint model Random Forest.
"""
import importlib.util
from pathlib import Path
import pytest

root_dir = Path(__file__).resolve().parents[2]
index_file = root_dir / "api" / "index.py"
spec = importlib.util.spec_from_file_location("vercel_api_index", str(index_file))
vercel_index = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vercel_index)
app = vercel_index.app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_app_object_exists_and_callable():
    assert app is not None
    assert callable(app)


def test_root_and_api_root_endpoint(client):
    r1 = client.get("/")
    assert r1.status_code == 200
    assert r1.get_json()["status"] == "ok"

    r2 = client.get("/api")
    assert r2.status_code == 200
    assert r2.get_json()["status"] == "ok"


def test_health_endpoints_both_prefixes(client):
    r1 = client.get("/api/health")
    assert r1.status_code == 200
    d1 = r1.get_json()
    assert d1["status"] == "ok"
    assert d1["model_loaded"] is True

    r2 = client.get("/health")
    assert r2.status_code == 200
    d2 = r2.get_json()
    assert d2["status"] == "ok"
    assert d2["model_loaded"] is True


def test_model_info_endpoints_both_prefixes(client):
    r1 = client.get("/api/model/info")
    assert r1.status_code == 200
    assert r1.get_json()["model_name"] == "Random Forest"

    r2 = client.get("/model/info")
    assert r2.status_code == 200
    assert r2.get_json()["model_name"] == "Random Forest"

    r3 = client.get("/api/model-info")
    assert r3.status_code == 200


def test_predict_and_alias_endpoints(client):
    valid_payload = {
        "kelurahan_id": "KEL_MARGAHAYU",
        "kelurahan_name": "Margahayu",
        "shape_area": 1500000.0,
        "shape_leng": 5500.0,
        "compactness": 0.45,
        "elev_mean": 18.5,
        "elev_min": 12.0,
        "sungai_density": 0.003,
        "dist_to_river": 120.0,
        "pct_pemukiman": 0.8,
        "pct_sawah": 0.05,
    }

    r1 = client.post("/api/predict", json=valid_payload)
    assert r1.status_code == 200
    d1 = r1.get_json()
    assert d1["success"] is True
    assert d1["prediction"]["predicted_class"] in ["sedang", "tinggi"]

    r2 = client.post("/predict", json=valid_payload)
    assert r2.status_code == 200
    d2 = r2.get_json()
    assert d2["success"] is True


def test_predict_batch_and_alias_endpoints(client):
    valid_payload = {
        "kelurahan_id": "KEL_MARGAHAYU",
        "kelurahan_name": "Margahayu",
        "shape_area": 1500000.0,
        "shape_leng": 5500.0,
        "compactness": 0.45,
        "elev_mean": 18.5,
        "elev_min": 12.0,
        "sungai_density": 0.003,
        "dist_to_river": 120.0,
        "pct_pemukiman": 0.8,
        "pct_sawah": 0.05,
    }

    r1 = client.post("/api/predict/batch", json={"features": [valid_payload]})
    assert r1.status_code == 200
    d1 = r1.get_json()
    assert d1["success"] is True
    assert d1["total"] == 1

    r2 = client.post("/predict/batch", json={"features": [valid_payload]})
    assert r2.status_code == 200
    assert r2.get_json()["total"] == 1
