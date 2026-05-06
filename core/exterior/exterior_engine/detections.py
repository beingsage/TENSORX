from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import numpy as np

from exterior_engine.io_utils import list_images


DEFAULT_DEFECT_CLASSES = {"crack", "spall", "corrosion", "water_damage", "leak", "rust"}
DEFAULT_MATERIAL_SCORES = {
    "brick": 0.80,
    "concrete": 0.78,
    "glass": 0.72,
    "paint": 0.60,
    "plaster": 0.58,
    "stone": 0.85,
    "metal": 0.70,
}


def _require_ultralytics():
    try:
        from ultralytics import YOLO
    except ImportError as error:  # pragma: no cover - dependency specific
        raise RuntimeError(
            "ultralytics is required for image inference. Install dependencies from requirements.txt."
        ) from error
    return YOLO


def _require_opencv():
    try:
        import cv2
    except ImportError as error:  # pragma: no cover - dependency specific
        raise RuntimeError(
            "opencv-python is required for image inference. Install dependencies from requirements.txt."
        ) from error
    return cv2


def _as_numpy(boxes: Any, attribute: str) -> np.ndarray:
    value = getattr(boxes, attribute, None)
    if value is None:
        return np.empty((0,), dtype=float)
    if hasattr(value, "cpu"):
        value = value.cpu()
    if hasattr(value, "numpy"):
        value = value.numpy()
    return np.asarray(value)


def _run_yolo(weights_path: str, image_paths: list[Path], imgsz: int = 960) -> list[Any]:
    YOLO = _require_ultralytics()
    model = YOLO(weights_path)
    return model.predict([str(path) for path in image_paths], verbose=False, imgsz=imgsz)


def _compute_image_area(path: Path) -> float:
    cv2 = _require_opencv()
    image = cv2.imread(str(path))
    if image is None:
        raise ValueError(f"Could not read image: {path}")
    height, width = image.shape[:2]
    return float(width * height)


def extract_image_features(
    image_paths: list[str] | None = None,
    image_dir: str | None = None,
    defect_weights: str | None = None,
    material_weights: str | None = None,
) -> tuple[dict[str, float], list[str]]:
    warnings: list[str] = []
    files = list_images(paths=image_paths, directory=image_dir)
    if not files:
        return {
            "image_count": 0.0,
            "num_cracks": 0.0,
            "defect_area_ratio": 0.0,
            "material_score": 0.0,
            "window_density": 0.0,
        }, ["No RGB images were provided."]

    image_areas = {path: _compute_image_area(path) for path in files}
    feature_map: dict[str, float] = {
        "image_count": float(len(files)),
        "num_cracks": 0.0,
        "defect_area_ratio": 0.0,
        "material_score": 0.0,
        "window_density": 0.0,
    }

    if defect_weights:
        defect_results = _run_yolo(defect_weights, files)
        defect_count = 0
        defect_area = 0.0
        for path, result in zip(files, defect_results):
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            classes = _as_numpy(boxes, "cls")
            xyxy = _as_numpy(boxes, "xyxy")
            names = getattr(result, "names", {})
            for class_id, box in zip(classes.astype(int), xyxy):
                class_name = str(names.get(int(class_id), class_id)).lower()
                if class_name in DEFAULT_DEFECT_CLASSES or "crack" in class_name:
                    defect_count += 1
                    defect_area += max(0.0, float((box[2] - box[0]) * (box[3] - box[1])))
        total_image_area = max(1.0, sum(image_areas.values()))
        feature_map["num_cracks"] = float(defect_count)
        feature_map["defect_area_ratio"] = float(defect_area / total_image_area)
    else:
        warnings.append("Defect weights were not supplied. Defect features default to zero.")

    if material_weights:
        material_results = _run_yolo(material_weights, files)
        class_counter: Counter[str] = Counter()
        material_area: defaultdict[str, float] = defaultdict(float)
        total_area = max(1.0, sum(image_areas.values()))
        for path, result in zip(files, material_results):
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            classes = _as_numpy(boxes, "cls")
            xyxy = _as_numpy(boxes, "xyxy")
            names = getattr(result, "names", {})
            for class_id, box in zip(classes.astype(int), xyxy):
                class_name = str(names.get(int(class_id), class_id)).lower()
                class_counter[class_name] += 1
                material_area[class_name] += max(0.0, float((box[2] - box[0]) * (box[3] - box[1])))

        weighted_score = 0.0
        weighted_coverage = 0.0
        window_like = 0.0
        for class_name, area in material_area.items():
            coverage = area / total_area
            weighted_coverage += coverage
            weighted_score += coverage * DEFAULT_MATERIAL_SCORES.get(class_name, 0.55)
            if "glass" in class_name or "window" in class_name:
                window_like += coverage

        if weighted_coverage > 0:
            feature_map["material_score"] = float(weighted_score / weighted_coverage)
        feature_map["window_density"] = float(window_like)

        for class_name, count in class_counter.items():
            feature_map[f"material_count_{class_name}"] = float(count)
    else:
        warnings.append("Material weights were not supplied. Material features default to zero.")

    return feature_map, warnings

