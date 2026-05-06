from __future__ import annotations

import csv
import math
import pickle
import random
from pathlib import Path
from typing import Any

import numpy as np

from exterior_engine.io_utils import ensure_directory, write_json


def _require_ultralytics():
    try:
        from ultralytics import YOLO
    except ImportError as error:  # pragma: no cover - dependency specific
        raise RuntimeError(
            "ultralytics is required for YOLO training. Install dependencies from requirements.txt."
        ) from error
    return YOLO


def _require_xgboost():
    try:
        import xgboost as xgb
    except ImportError as error:  # pragma: no cover - dependency specific
        raise RuntimeError(
            "xgboost is required for valuation training. Install dependencies from requirements.txt."
        ) from error
    return xgb


def _require_sklearn():
    try:
        from sklearn.ensemble import HistGradientBoostingRegressor
    except ImportError as error:  # pragma: no cover - dependency specific
        raise RuntimeError(
            "scikit-learn is required for fallback valuation training. Install dependencies from requirements.txt."
        ) from error
    return HistGradientBoostingRegressor


def launch_yolo_training(
    *,
    task_name: str,
    data_config: str,
    base_model: str,
    epochs: int,
    imgsz: int,
    project: str,
    run_name: str,
    batch: int,
    device: str | None,
) -> dict[str, Any]:
    YOLO = _require_ultralytics()
    model = YOLO(base_model)
    results = model.train(
        data=data_config,
        epochs=epochs,
        imgsz=imgsz,
        project=project,
        name=run_name,
        batch=batch,
        device=device,
    )
    save_dir = getattr(results, "save_dir", None)
    return {
        "task": task_name,
        "save_dir": str(save_dir) if save_dir else None,
        "epochs": epochs,
        "imgsz": imgsz,
        "base_model": base_model,
    }


def _load_numeric_csv(features_csv: str, target_column: str) -> tuple[np.ndarray, np.ndarray, list[str], dict[str, float]]:
    rows: list[dict[str, str]] = []
    with open(features_csv, "r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(row)

    if not rows:
        raise ValueError(f"No rows found in CSV: {features_csv}")
    if target_column not in rows[0]:
        raise ValueError(f"Target column '{target_column}' not found in CSV.")

    feature_names = [name for name in rows[0].keys() if name != target_column]
    matrix = np.zeros((len(rows), len(feature_names)), dtype=float)
    target = np.zeros(len(rows), dtype=float)

    columns: dict[str, list[float]] = {name: [] for name in feature_names}
    for row in rows:
        for name in feature_names:
            value = row.get(name, "")
            try:
                numeric = float(value) if value not in ("", None) else math.nan
            except ValueError:
                numeric = math.nan
            columns[name].append(numeric)

    imputation_values: dict[str, float] = {}
    for index, name in enumerate(feature_names):
        values = np.array(columns[name], dtype=float)
        finite_values = values[np.isfinite(values)]
        mean_value = float(np.mean(finite_values)) if len(finite_values) else 0.0
        imputation_values[name] = mean_value
        values[~np.isfinite(values)] = mean_value
        matrix[:, index] = values

    for index, row in enumerate(rows):
        target[index] = float(row[target_column])

    return matrix, target, feature_names, imputation_values


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    error = y_true - y_pred
    mae = float(np.mean(np.abs(error)))
    rmse = float(np.sqrt(np.mean(np.square(error))))
    total_var = float(np.sum(np.square(y_true - np.mean(y_true))))
    residual_var = float(np.sum(np.square(error)))
    r2 = 1.0 - (residual_var / total_var) if total_var > 0 else 0.0
    return {
        "mae": round(mae, 6),
        "rmse": round(rmse, 6),
        "r2": round(r2, 6),
    }


def train_valuation_model(
    *,
    features_csv: str,
    target_column: str,
    output_dir: str,
    test_ratio: float = 0.2,
    seed: int = 42,
    n_estimators: int = 300,
    max_depth: int = 6,
    learning_rate: float = 0.05,
) -> dict[str, Any]:
    features, target, feature_names, imputation_values = _load_numeric_csv(features_csv, target_column)
    sample_count = len(target)
    if sample_count < 10:
        raise ValueError("At least 10 labeled rows are recommended for valuation training.")

    rng = np.random.default_rng(seed)
    indices = np.arange(sample_count)
    rng.shuffle(indices)
    test_size = max(1, int(sample_count * test_ratio))
    test_indices = indices[:test_size]
    train_indices = indices[test_size:]
    if len(train_indices) == 0:
        raise ValueError("Training split is empty. Reduce test_ratio or add more rows.")

    x_train = features[train_indices]
    y_train = target[train_indices]
    x_test = features[test_indices]
    y_test = target[test_indices]

    destination = ensure_directory(output_dir)
    model_type = "xgboost_regressor"
    try:
        xgb = _require_xgboost()
        model = xgb.XGBRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=seed,
        )
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        model_path = destination / "valuation_model.json"
        model.save_model(model_path)
    except RuntimeError:
        HistGradientBoostingRegressor = _require_sklearn()
        model = HistGradientBoostingRegressor(
            learning_rate=learning_rate,
            max_depth=max_depth,
            max_iter=n_estimators,
            random_state=seed,
        )
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        model_path = destination / "valuation_model.pkl"
        with model_path.open("wb") as handle:
            pickle.dump(model, handle)
        model_type = "sklearn_hist_gradient_boosting"

    metrics = _metrics(y_test, predictions)
    metadata = {
        "target_column": target_column,
        "feature_names": feature_names,
        "imputation_values": imputation_values,
        "metrics": metrics,
        "train_rows": int(len(train_indices)),
        "test_rows": int(len(test_indices)),
        "model_type": model_type,
    }
    metadata_path = destination / "valuation_metadata.json"
    write_json(metadata_path, metadata)

    return {
        "model_path": str(model_path),
        "metadata_path": str(metadata_path),
        "metrics": metrics,
    }


def bootstrap_synthetic_valuation_dataset(output_csv: str, rows: int = 512, seed: int = 42) -> str:
    rng = random.Random(seed)
    target = Path(output_csv)
    ensure_directory(target.parent)

    fieldnames = [
        "wall_flatness",
        "surface_roughness",
        "num_cracks",
        "defect_area_ratio",
        "material_score",
        "height",
        "window_density",
        "plane_inlier_ratio",
        "structural_quality_score",
        "valuation_score",
    ]

    with target.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for _ in range(rows):
            wall_flatness = rng.uniform(0.45, 0.98)
            roughness = rng.uniform(0.2, 4.5)
            crack_count = rng.randint(0, 18)
            defect_area_ratio = rng.uniform(0.0, 0.08)
            material_score = rng.uniform(0.45, 0.92)
            height = rng.uniform(3.0, 35.0)
            window_density = rng.uniform(0.05, 0.35)
            plane_inlier_ratio = rng.uniform(0.25, 0.95)
            structural_quality = min(
                1.0,
                max(
                    0.0,
                    0.5 * wall_flatness
                    + 0.25 * plane_inlier_ratio
                    + 0.25 * max(0.0, 1.0 - roughness / 6.0),
                ),
            )

            valuation_score = (
                34.0 * structural_quality
                + 16.0 * material_score
                + 14.0 * wall_flatness
                + 8.0 * window_density
                + 6.0 * min(height / 35.0, 1.0)
                - 0.9 * crack_count
                - 90.0 * defect_area_ratio
                + rng.uniform(-3.0, 3.0)
            )
            valuation_score = max(0.0, min(100.0, valuation_score))

            writer.writerow(
                {
                    "wall_flatness": round(wall_flatness, 6),
                    "surface_roughness": round(roughness, 6),
                    "num_cracks": crack_count,
                    "defect_area_ratio": round(defect_area_ratio, 6),
                    "material_score": round(material_score, 6),
                    "height": round(height, 6),
                    "window_density": round(window_density, 6),
                    "plane_inlier_ratio": round(plane_inlier_ratio, 6),
                    "structural_quality_score": round(structural_quality, 6),
                    "valuation_score": round(valuation_score, 6),
                }
            )

    return str(target)
