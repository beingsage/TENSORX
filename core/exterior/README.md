# Exterior Valuation Engine

This folder contains the exterior-analysis MVP for property valuation from:

- LiDAR mesh or point cloud
- RGB facade or exterior images

It produces:

- geometry features
- defect counts and severity proxies
- material coverage features
- a final valuation score

## Folder Layout

```text
core/exterior/
├── configs/
├── datasets/
├── artifacts/
├── exterior_engine/
├── infer.py
├── train.py
└── requirements.txt
```

## What Is Implemented

- geometry feature extraction from `.glb`, `.obj`, `.ply`, `.pcd`
- YOLO-based image feature extraction for defects and materials
- rule-based fallback valuation score
- XGBoost valuation model training from tabular features, with sklearn fallback if XGBoost is absent
- YOLO fine-tuning wrappers for defect and material detectors

## Install

```bash
cd core/exterior
pip install -r requirements.txt
```

## Datasets To Use

See [datasets/README.md](./datasets/README.md).

Recommended sources:

- `SemanticKITTI`, `ScanNet` for 3D geometry priors
- `SDNET2018`, `CrackForest` for defect detection
- `MINC` for exterior material detection

## Training

### 1. Train valuation model from tabular features

Prepare a CSV with numeric features and one target column such as `valuation_score` or `price`.

```bash
python train.py valuation \
  --features-csv data/valuation_features.csv \
  --target-column valuation_score \
  --output-dir artifacts/valuation_model
```

### 2. Bootstrap a synthetic valuation model for MVP testing

```bash
python train.py bootstrap-valuation \
  --output-dir artifacts/valuation_model \
  --rows 512
```

### 3. Fine-tune YOLO for cracks or defects

```bash
python train.py defect-yolo \
  --data-config configs/defect_dataset.template.yaml \
  --model yolov8n.pt \
  --epochs 20 \
  --imgsz 640 \
  --project artifacts/yolo
```

### 4. Fine-tune YOLO for materials

```bash
python train.py material-yolo \
  --data-config configs/material_dataset.template.yaml \
  --model yolov8n.pt \
  --epochs 20 \
  --imgsz 640 \
  --project artifacts/yolo
```

## Inference

### Full pipeline with mesh and images

```bash
python infer.py \
  --mesh sample_data/house.glb \
  --images sample_data/images \
  --defect-weights artifacts/yolo/defect/weights/best.pt \
  --material-weights artifacts/yolo/material/weights/best.pt \
  --valuation-model artifacts/valuation_model/valuation_model.json \
  --valuation-metadata artifacts/valuation_model/valuation_metadata.json \
  --output-json artifacts/inference_result.json
```

### Point cloud only

```bash
python infer.py \
  --point-cloud sample_data/house.ply \
  --output-json artifacts/inference_result.json
```

## Inference Output

The script emits JSON like:

```json
{
  "geometry_features": {},
  "image_features": {},
  "feature_vector": {},
  "valuation": {
    "score": 71.3,
    "source": "xgboost"
  },
  "warnings": []
}
```

## Notes

- If YOLO weights are not supplied, image features fall back to zero counts and warnings are emitted.
- If the valuation model is not supplied, a rule-based score is returned so the pipeline still runs.
- If `xgboost` is missing, valuation training falls back to sklearn and stores a `.pkl` model.
- This is the MVP path. PointNet or full 3D segmentation is intentionally skipped here.
