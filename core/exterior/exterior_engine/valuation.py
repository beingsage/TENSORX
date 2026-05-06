from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

import numpy as np

from exterior_engine.io_utils import read_json


def _require_xgboost():
    try:
        import xgboost as xgb
    except ImportError as error:  # pragma: no cover - dependency specific
        raise RuntimeError(
            "xgboost is required for model-backed valuation. Install dependencies from requirements.txt."
        ) from error
    return xgb


def merge_feature_maps(*feature_maps: dict[str, float]) -> dict[str, float]:
    merged: dict[str, float] = {}
    for feature_map in feature_maps:
        merged.update(feature_map)
    return merged


def rule_based_valuation_score(features: dict[str, float]) -> float:
    structural = float(features.get("structural_quality_score", 0.5))
    flatness = float(features.get("wall_flatness", 0.5))
    material = float(features.get("material_score", 0.55))
    crack_count = float(features.get("num_cracks", 0.0))
    defect_area_ratio = float(features.get("defect_area_ratio", 0.0))
    roughness = float(features.get("surface_roughness", 0.0))
    window_density = float(features.get("window_density", 0.0))

    crack_penalty = min(0.25, crack_count * 0.01 + defect_area_ratio * 1.5)
    roughness_penalty = min(0.20, roughness * 0.02)
    window_bonus = min(0.08, window_density * 0.4)

    score = (
        0.42 * structural
        + 0.18 * flatness
        + 0.20 * material
        + 0.10 * (1.0 - crack_penalty)
        + 0.05 * (1.0 - roughness_penalty)
        + 0.05 * window_bonus
    )
    return round(max(0.0, min(100.0, score * 100.0)), 2)


def predict_with_xgboost(
    features: dict[str, float],
    model_path: str,
    metadata_path: str,
) -> float:
    xgb = _require_xgboost()
    metadata = read_json(metadata_path)
    feature_names: list[str] = metadata["feature_names"]
    imputation_values: dict[str, float] = metadata.get("imputation_values", {})
    vector = np.array(
        [[float(features.get(name, imputation_values.get(name, 0.0))) for name in feature_names]],
        dtype=float,
    )
    booster = xgb.Booster()
    booster.load_model(str(Path(model_path)))
    matrix = xgb.DMatrix(vector, feature_names=feature_names)
    prediction = booster.predict(matrix)
    return float(prediction[0])


def predict_with_sklearn(
    features: dict[str, float],
    model_path: str,
    metadata_path: str,
) -> float:
    metadata = read_json(metadata_path)
    feature_names: list[str] = metadata["feature_names"]
    imputation_values: dict[str, float] = metadata.get("imputation_values", {})
    vector = np.array(
        [[float(features.get(name, imputation_values.get(name, 0.0))) for name in feature_names]],
        dtype=float,
    )
    with Path(model_path).open("rb") as handle:
        model = pickle.load(handle)
    prediction = model.predict(vector)
    return float(prediction[0])


def score_property(
    features: dict[str, float],
    model_path: str | None = None,
    metadata_path: str | None = None,
) -> dict[str, Any]:
    if model_path and metadata_path and Path(model_path).exists() and Path(metadata_path).exists():
        metadata = read_json(metadata_path)
        model_type = metadata.get("model_type", "")
        if model_type == "sklearn_hist_gradient_boosting":
            return {
                "score": round(predict_with_sklearn(features, model_path, metadata_path), 4),
                "source": "sklearn",
            }
        return {
            "score": round(predict_with_xgboost(features, model_path, metadata_path), 4),
            "source": "xgboost",
        }
    return {
        "score": rule_based_valuation_score(features),
        "source": "rule_based",
    }
