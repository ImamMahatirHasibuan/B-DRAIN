"""
Script pelatihan dan pembuatan artefak model Random Forest B-DRAIN
yang konsisten dengan eksperimen Leave-One-Kecamatan-Out (LOGO)
pada 48 Kelurahan di Wilayah Administratif Kota Bekasi.

Aturan metodologis:
1. Unit analisis hanya 48 kelurahan Kota Bekasi (WADMKK == 'Kota Bekasi').
   34 poligon di luar Kota Bekasi dikeluarkan dari analisis model.
2. Kelurahan tanpa titik banjir (15 kelurahan, n_points == 0) TIDAK diisi
   otomatis dengan label 'sedang' dan TIDAK diikutkan dalam data training.
3. Menggunakan sklearn.pipeline.Pipeline(StandardScaler + RandomForestClassifier)
   dengan konfigurasi eksperimen:
   - n_estimators = 200
   - max_depth = 8
   - class_weight = 'balanced'
   - random_state = 42
4. Menyimpan backup artefak lama ke ml/models/legacy_baseline_82/ sebelum
   memperbarui artefak di ml/models/.
5. Menghasilkan file olahan terpisah di public/data/ tanpa mengubah dataset sumber asli:
   - public/data/kelurahan_kota_bekasi_48.geojson
   - public/data/kelurahan_features_48.json
"""

import json
import os
import platform
import re
import shutil
from collections import Counter
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
EXP_DIR = os.path.join(BASE_DIR, "experiments")
MODEL_DIR = os.path.join(BASE_DIR, "models")
BACKUP_DIR = os.path.join(MODEL_DIR, "legacy_baseline_82")
PUBLIC_DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")

FEATURE_COLUMNS = [
    "shape_area",
    "shape_leng",
    "compactness",
    "elev_mean",
    "elev_min",
    "sungai_density",
    "dist_to_river",
    "pct_pemukiman",
    "pct_sawah",
]

FEATURE_METADATA = {
    "shape_area": {
        "unit": "m2",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "ADMINISTRASIDESA_AR_25K.geojson",
        "description": "Luas geometri poligon kelurahan dalam meter persegi",
    },
    "shape_leng": {
        "unit": "m",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "ADMINISTRASIDESA_AR_25K.geojson",
        "description": "Keliling geometri poligon kelurahan dalam meter",
    },
    "compactness": {
        "unit": "ratio [0, 1]",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "ADMINISTRASIDESA_AR_25K.geojson",
        "description": "Indeks kekompakan Polsby-Popper (4 * pi * area / perimeter^2)",
    },
    "elev_mean": {
        "unit": "m dpl",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "SPOTHEIGHT_PT_25K.geojson & KONTUR_LN_25K.geojson",
        "description": "Rata-rata elevasi titik tinggi dan garis kontur di dalam kelurahan",
    },
    "elev_min": {
        "unit": "m dpl",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "SPOTHEIGHT_PT_25K.geojson & KONTUR_LN_25K.geojson",
        "description": "Elevasi minimum titik tinggi dan garis kontur di dalam kelurahan",
    },
    "sungai_density": {
        "unit": "m/m2",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "SUNGAI_LN_25K.geojson & SUNGAI_AR_25K.geojson",
        "description": "Rasio total panjang segmen sungai dan keliling area sungai di dalam kelurahan terhadap luas kelurahan",
    },
    "dist_to_river": {
        "unit": "m",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "SUNGAI_LN_25K.geojson & SUNGAI_AR_25K.geojson",
        "description": "Jarak Euclidean dari centroid kelurahan ke geometri sungai terdekat dalam meter",
    },
    "pct_pemukiman": {
        "unit": "ratio [0, 1]",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "PEMUKIMAN_AR_25K.geojson",
        "description": "Proporsi luas area permukiman terhadap luas kelurahan",
    },
    "pct_sawah": {
        "unit": "ratio [0, 1]",
        "crs_calculation": "EPSG:32748 (UTM Zone 48S)",
        "source": "AGRISAWAH_AR_25K.geojson",
        "description": "Proporsi luas area sawah terhadap luas kelurahan",
    },
}

MODEL_CONFIG = {
    "algorithm": "RandomForestClassifier",
    "n_estimators": 200,
    "max_depth": 8,
    "class_weight": "balanced",
    "random_state": 42,
    "preprocessing": "StandardScaler",
}


def backup_existing_models():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for fname in ("flood_risk_model.pkl", "scaler.pkl", "label_encoder.pkl", "model_metadata.json"):
        src = os.path.join(MODEL_DIR, fname)
        dst = os.path.join(BACKUP_DIR, fname)
        if os.path.exists(src) and not os.path.exists(dst):
            shutil.copy2(src, dst)
            print(f"[BACKUP] {fname} -> {dst}")


def make_kelurahan_id(name):
    cleaned = re.sub(r"[^A-Z0-9]+", "_", str(name).strip().upper()).strip("_")
    return f"KEL_{cleaned}"


def evaluate_logo_variant(df_all, label_col):
    sub = df_all[df_all[label_col].notna() & (df_all[label_col] != "")].copy()
    le = LabelEncoder()
    le.fit(["sedang", "tinggi"])
    X = sub[FEATURE_COLUMNS].values.astype(float)
    y = le.transform(sub[label_col].values)
    groups = sub["WADMKC"].values

    logo = LeaveOneGroupOut()
    y_true_all, y_pred_all, base_pred_all = [], [], []

    for train_idx, test_idx in logo.split(X, y, groups=groups):
        majority_cls = Counter(y[train_idx]).most_common(1)[0][0]
        base_pred_all.extend([majority_cls] * len(test_idx))

        pipe = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    RandomForestClassifier(
                        n_estimators=MODEL_CONFIG["n_estimators"],
                        max_depth=MODEL_CONFIG["max_depth"],
                        class_weight=MODEL_CONFIG["class_weight"],
                        random_state=MODEL_CONFIG["random_state"],
                    ),
                ),
            ]
        )
        pipe.fit(X[train_idx], y[train_idx])
        preds = pipe.predict(X[test_idx])
        y_true_all.extend(y[test_idx])
        y_pred_all.extend(preds)

    acc = float(accuracy_score(y_true_all, y_pred_all))
    bal_acc = float(balanced_accuracy_score(y_true_all, y_pred_all))
    macro_f1 = float(f1_score(y_true_all, y_pred_all, average="macro", zero_division=0))
    cm = confusion_matrix(y_true_all, y_pred_all).tolist()

    base_acc = float(accuracy_score(y_true_all, base_pred_all))
    base_bal_acc = float(balanced_accuracy_score(y_true_all, base_pred_all))
    base_macro_f1 = float(f1_score(y_true_all, base_pred_all, average="macro", zero_division=0))

    return {
        "n": int(len(sub)),
        "n_groups": int(sub["WADMKC"].nunique()),
        "accuracy": acc,
        "balanced_accuracy": bal_acc,
        "macro_f1": macro_f1,
        "confusion_matrix": cm,
        "baseline": {
            "accuracy": base_acc,
            "balanced_accuracy": base_bal_acc,
            "macro_f1": base_macro_f1,
        },
    }


def compute_polygon_centroid(geometry):
    """Hitung titik tengah (rata-rata koordinat ring terluar) untuk keperluan fokus peta."""
    coords = geometry.get("coordinates", [])
    gtype = geometry.get("type", "")
    ring = []
    if gtype == "Polygon" and coords:
        ring = coords[0]
    elif gtype == "MultiPolygon" and coords and coords[0]:
        # Ambil poligon dengan jumlah titik terbanyak
        best_poly = max(coords, key=lambda p: len(p[0]) if p else 0)
        ring = best_poly[0] if best_poly else []
    if not ring:
        return -6.2642, 106.9869
    lons = [pt[0] for pt in ring]
    lats = [pt[1] for pt in ring]
    return round(float(np.mean(lats)), 6), round(float(np.mean(lons)), 6)


def main():
    backup_existing_models()

    csv_path = os.path.join(EXP_DIR, "dataset_eksperimen_per_kelurahan.csv")
    results_logo_path = os.path.join(EXP_DIR, "results_logo.json")
    audit_join_path = os.path.join(EXP_DIR, "audit_point_join_70.csv")

    df_kel = pd.read_csv(csv_path)
    with open(results_logo_path, "r", encoding="utf-8") as f:
        results_logo = json.load(f)
    df_audit = pd.read_csv(audit_join_path)

    assert len(df_kel) == 48, f"Harus 48 kelurahan Kota Bekasi, ditemukan {len(df_kel)}"

    # Verifikasi LOGO untuk Varian A (n=27) dan Varian B (n=33)
    eval_A = evaluate_logo_variant(df_kel, "label_A")
    eval_B = evaluate_logo_variant(df_kel, "label_B")

    print(f"[VERIFY LOGO] Varian A (n={eval_A['n']}): acc={eval_A['accuracy']:.4f}, macro_f1={eval_A['macro_f1']:.4f}")
    print(f"[VERIFY LOGO] Varian B (n={eval_B['n']}): acc={eval_B['accuracy']:.4f}, macro_f1={eval_B['macro_f1']:.4f}")

    # Pastikan hasil identik dengan results_logo.json
    assert np.isclose(eval_A["macro_f1"], results_logo["varian_A"]["rf_logo"]["macro_f1"], atol=1e-6)
    assert np.isclose(eval_B["macro_f1"], results_logo["varian_B"]["rf_logo"]["macro_f1"], atol=1e-6)

    # Latih pipeline pada data berlabel Kota Bekasi (Varian B: 33 kelurahan yang memiliki titik banjir historis;
    # 15 kelurahan tanpa titik banjir TIDAK diberi label palsu dan TIDAK diikutkan dalam training)
    df_train = df_kel[df_kel["label_B"].notna() & (df_kel["label_B"] != "")].copy()
    assert len(df_train) == 33, f"Data berlabel harus 33 kelurahan, ditemukan {len(df_train)}"

    le = LabelEncoder()
    le.fit(["sedang", "tinggi"])
    assert list(le.classes_) == ["sedang", "tinggi"]

    X_train = df_train[FEATURE_COLUMNS].values.astype(float)
    y_train = le.transform(df_train["label_B"].values)

    pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=MODEL_CONFIG["n_estimators"],
                    max_depth=MODEL_CONFIG["max_depth"],
                    class_weight=MODEL_CONFIG["class_weight"],
                    random_state=MODEL_CONFIG["random_state"],
                ),
            ),
        ]
    )
    pipeline.fit(X_train, y_train)

    fitted_scaler = pipeline.named_steps["scaler"]
    fitted_rf = pipeline.named_steps["classifier"]

    # Uji di memori bahwa hasil prediksi melalui pipeline dan melalui scaler + model identik
    probs_pipe = pipeline.predict_proba(X_train)
    probs_step = fitted_rf.predict_proba(fitted_scaler.transform(X_train))
    assert np.allclose(probs_pipe, probs_step), "Output pipeline dan step terpisah harus identik!"

    # Simpan ke file sementara lalu uji load sebelum menggantikan file utama
    tmp_pipe_path = os.path.join(MODEL_DIR, "flood_risk_pipeline.tmp.pkl")
    tmp_model_path = os.path.join(MODEL_DIR, "flood_risk_model.tmp.pkl")
    tmp_scaler_path = os.path.join(MODEL_DIR, "scaler.tmp.pkl")
    tmp_le_path = os.path.join(MODEL_DIR, "label_encoder.tmp.pkl")

    joblib.dump(pipeline, tmp_pipe_path)
    joblib.dump(fitted_rf, tmp_model_path)
    joblib.dump(fitted_scaler, tmp_scaler_path)
    joblib.dump(le, tmp_le_path)

    # Uji pemuatan kembali
    loaded_pipe = joblib.load(tmp_pipe_path)
    loaded_rf = joblib.load(tmp_model_path)
    loaded_scaler = joblib.load(tmp_scaler_path)
    loaded_le = joblib.load(tmp_le_path)
    assert np.allclose(loaded_pipe.predict_proba(X_train[:2]), loaded_rf.predict_proba(loaded_scaler.transform(X_train[:2])))
    assert list(loaded_le.classes_) == ["sedang", "tinggi"]

    # Pindahkan file sementara ke artefak utama
    shutil.move(tmp_pipe_path, os.path.join(MODEL_DIR, "flood_risk_pipeline.pkl"))
    shutil.move(tmp_model_path, os.path.join(MODEL_DIR, "flood_risk_model.pkl"))
    shutil.move(tmp_scaler_path, os.path.join(MODEL_DIR, "scaler.pkl"))
    shutil.move(tmp_le_path, os.path.join(MODEL_DIR, "label_encoder.pkl"))

    metadata = {
        "model_name": "Random Forest",
        "model_version": "rf-logo-bekasi-v2",
        "algorithm": "RandomForestClassifier",
        "pipeline_steps": ["StandardScaler", "RandomForestClassifier"],
        "model_config": MODEL_CONFIG,
        "feature_columns": FEATURE_COLUMNS,
        "feature_metadata": FEATURE_METADATA,
        "label_classes": ["sedang", "tinggi"],
        "label_mapping": {"sedang": 0, "tinggi": 1},
        "unit_of_analysis": "Kelurahan di Wilayah Administratif Kota Bekasi (WADMKK == 'Kota Bekasi')",
        "total_kelurahan_kota_bekasi": 48,
        "excluded_outside_kota_bekasi": 34,
        "unlabeled_kelurahan_count": 15,
        "unlabeled_policy": "15 kelurahan tanpa titik banjir historis tidak diberi label default 'sedang' dan tidak diikutkan dalam training.",
        "training_variant": "varian_B",
        "training_samples": 33,
        "training_samples_varian_A": 27,
        "class_distribution": {"sedang": 20, "tinggi": 13},
        "class_distribution_varian_A": {"sedang": 14, "tinggi": 13},
        "cv_scheme": "Leave-One-Kecamatan-Out (LOGO, 12 Kecamatan di Kota Bekasi)",
        "cv_accuracy": results_logo["varian_B"]["rf_logo"]["accuracy"],
        "cv_balanced_accuracy": results_logo["varian_B"]["rf_logo"]["balanced_accuracy"],
        "cv_macro_f1": results_logo["varian_B"]["rf_logo"]["macro_f1"],
        "logo_evaluation": {
            "varian_A": {
                "description": "Hanya kelurahan dengan severity maksimum medium (sedang) atau high (tinggi); 6 kelurahan low-only dikeluarkan",
                "n": results_logo["varian_A"]["n"],
                "n_groups": results_logo["varian_A"]["n_groups"],
                "class_counts": results_logo["varian_A"]["class_counts"],
                "baseline": results_logo["varian_A"]["baseline"],
                "rf_logo": results_logo["varian_A"]["rf_logo"],
                "confusion": results_logo["varian_A"]["confusion"],
            },
            "varian_B": {
                "description": "Seluruh 33 kelurahan yang memiliki titik banjir historis (low/medium -> sedang, high -> tinggi)",
                "n": results_logo["varian_B"]["n"],
                "n_groups": results_logo["varian_B"]["n_groups"],
                "class_counts": results_logo["varian_B"]["class_counts"],
                "baseline": results_logo["varian_B"]["baseline"],
                "rf_logo": results_logo["varian_B"]["rf_logo"],
                "confusion": results_logo["varian_B"]["confusion"],
            },
        },
        "library_versions": {
            "python": platform.python_version(),
            "scikit_learn": sklearn.__version__,
            "numpy": np.__version__,
            "joblib": joblib.__version__,
        },
        "validation_status": "PROTOTIPE — BELUM TERVALIDASI",
        "status_validasi": "PROTOTIPE — BELUM TERVALIDASI",
        "model_status": "PROTOTIPE — BELUM TERVALIDASI",
        "catatan_validasi": (
            "Model Random Forest ini merupakan prototipe penelitian yang menggunakan data dan label keparahan "
            "dengan keterbatasan dokumentasi sumber. Hasil prediksi digunakan untuk kebutuhan eksplorasi dan "
            "analisis, bukan sebagai kepastian kejadian banjir."
        ),
        "validation_note": (
            "Model Random Forest ini merupakan prototipe penelitian yang menggunakan data dan label keparahan "
            "dengan keterbatasan dokumentasi sumber. Hasil prediksi digunakan untuk kebutuhan eksplorasi dan "
            "analisis, bukan sebagai kepastian kejadian banjir."
        ),
    }

    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print("[SAVED] ml/models/model_metadata.json & .pkl artifacts updated.")

    # Bangun file olahan terpisah:
    # 1. public/data/kelurahan_kota_bekasi_48.geojson (48 poligon kelurahan Kota Bekasi + 9 fitur + status label)
    # 2. public/data/kelurahan_features_48.json (data fitur 48 kelurahan + hasil spatial join 70 titik banjir)
    admin_geojson_path = os.path.join(
        PUBLIC_DATA_DIR, "geojson_kota_bekasi", "geojson_kota_bekasi", "ADMINISTRASIDESA_AR_25K.geojson"
    )
    with open(admin_geojson_path, "r", encoding="utf-8") as f:
        admin_geojson = json.load(f)

    kel_lookup = {}
    for _, row in df_kel.iterrows():
        name = str(row["NAMOBJ"]).strip()
        has_label_b = pd.notna(row["label_B"]) and str(row["label_B"]).strip() != ""
        has_label_a = pd.notna(row["label_A"]) and str(row["label_A"]).strip() != ""
        kel_lookup[name] = {
            "kelurahan_id": make_kelurahan_id(name),
            "kelurahan": name,
            "kecamatan": str(row["WADMKC"]).strip(),
            "wadmkk": "Kota Bekasi",
            "n_points": int(row["n_points"]) if pd.notna(row["n_points"]) else 0,
            "severity_max_raw": str(row["severity_max_raw"]).strip() if pd.notna(row["severity_max_raw"]) else None,
            "label_A": str(row["label_A"]).strip() if has_label_a else None,
            "label_B": str(row["label_B"]).strip() if has_label_b else None,
            "has_flood_label": bool(has_label_b),
            "label_status": (
                "Berlabel Historis (Varian A & B)"
                if has_label_a
                else (
                    "Berlabel Historis (Khusus Varian B - Low digabung ke Sedang)"
                    if has_label_b
                    else "Tanpa Titik Banjir Historis (Tidak Berlabel)"
                )
            ),
            "features": {col: float(row[col]) for col in FEATURE_COLUMNS},
        }

    # Hitung juga jumlah titik banjir dari data_banjir.geojson per kelurahan hasil spatial join
    point_join_records = []
    jumlah_titik_per_kel = {}
    mismatch_per_kel = {}

    for _, arow in df_audit.iterrows():
        kel_name = str(arow["kelurahan_spatial_join"]).strip()
        j_titik = int(arow["jumlah_titik_banjir"]) if pd.notna(arow["jumlah_titik_banjir"]) else 0
        sesuai = str(arow["status_kesesuaian"]).strip() == "sesuai"
        jumlah_titik_per_kel[kel_name] = jumlah_titik_per_kel.get(kel_name, 0) + j_titik
        if not sesuai:
            mismatch_per_kel[kel_name] = mismatch_per_kel.get(kel_name, 0) + 1

        point_join_records.append(
            {
                "id": int(arow["id_sumber"]),
                "tahun": int(arow["tahun"]) if pd.notna(arow["tahun"]) else None,
                "severity": str(arow["severity"]).strip(),
                "jumlah_titik": j_titik,
                "lon": float(arow["lon"]),
                "lat": float(arow["lat"]),
                "kecamatan_sumber": str(arow["kecamatan_atribut_sumber"]).strip(),
                "kelurahan_spasial": kel_name,
                "kecamatan_spasial": str(arow["kecamatan_spatial_join"]).strip(),
                "wadmkk_spasial": str(arow["kabupaten_kota_spatial_join"]).strip(),
                "status_kecamatan": str(arow["status_kesesuaian"]).strip(),
                "perlu_diperiksa": not sesuai,
            }
        )

    filtered_features_geojson = []
    kelurahan_list_json = []

    for feat in admin_geojson.get("features", []):
        props = feat.get("properties") or {}
        if props.get("WADMKK") != "Kota Bekasi":
            continue
        name = str(props.get("NAMOBJ", "")).strip()
        info = kel_lookup.get(name)
        if not info:
            continue

        c_lat, c_lng = compute_polygon_centroid(feat.get("geometry") or {})
        total_j_titik = jumlah_titik_per_kel.get(name, 0)
        mismatch_cnt = mismatch_per_kel.get(name, 0)

        enriched_info = {
            **info,
            "jumlah_titik_akumulasi": total_j_titik,
            "mismatch_kecamatan_count": mismatch_cnt,
            "centroid_lat": c_lat,
            "centroid_lng": c_lng,
        }
        kelurahan_list_json.append(enriched_info)

        new_props = {
            **props,
            **info["features"],
            "kelurahan_id": info["kelurahan_id"],
            "kelurahan": name,
            "kecamatan": info["kecamatan"],
            "n_points": info["n_points"],
            "jumlah_titik_akumulasi": total_j_titik,
            "severity_max_raw": info["severity_max_raw"],
            "label_A": info["label_A"],
            "label_B": info["label_B"],
            "has_flood_label": info["has_flood_label"],
            "label_status": info["label_status"],
            "mismatch_kecamatan_count": mismatch_cnt,
            "centroid_lat": c_lat,
            "centroid_lng": c_lng,
        }
        filtered_features_geojson.append(
            {
                "type": "Feature",
                "properties": new_props,
                "geometry": feat.get("geometry"),
            }
        )

    assert len(filtered_features_geojson) == 48, f"GeoJSON Kota Bekasi harus 48 fitur, dapat {len(filtered_features_geojson)}"

    out_geojson_path = os.path.join(PUBLIC_DATA_DIR, "kelurahan_kota_bekasi_48.geojson")
    with open(out_geojson_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "type": "FeatureCollection",
                "name": "KELURAHAN_KOTA_BEKASI_48",
                "crs": admin_geojson.get("crs"),
                "metadata": {
                    "source": "Olahan dari ADMINISTRASIDESA_AR_25K.geojson (difilter khusus WADMKK == 'Kota Bekasi')",
                    "total_features": 48,
                    "excluded_outside_kota_bekasi": 34,
                    "validation_status": "PROTOTIPE — BELUM TERVALIDASI",
                },
                "features": filtered_features_geojson,
            },
            f,
            ensure_ascii=False,
        )

    out_json_path = os.path.join(PUBLIC_DATA_DIR, "kelurahan_features_48.json")
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "unit_of_analysis": "Kelurahan di Kota Bekasi (WADMKK == 'Kota Bekasi')",
                "total_kelurahan": 48,
                "labeled_varian_A_count": 27,
                "labeled_varian_B_count": 33,
                "unlabeled_count": 15,
                "excluded_outside_kota_bekasi_count": 34,
                "feature_columns": FEATURE_COLUMNS,
                "feature_metadata": FEATURE_METADATA,
                "kelurahan": sorted(kelurahan_list_json, key=lambda x: (x["kecamatan"], x["kelurahan"])),
                "flood_points_audit": point_join_records,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    print(f"[SAVED] {out_geojson_path} (48 features)")
    print(f"[SAVED] {out_json_path} (48 kelurahan + 70 flood point spatial join audit)")


if __name__ == "__main__":
    main()
