# Dataset Notes

This folder is the staging area for exterior-model datasets.

## Recommended Sources

### Geometry / LiDAR

- `SemanticKITTI`
- `ScanNet`

Use these primarily for:

- surface or structure priors
- segmentation reuse
- geometry benchmarking

The current MVP inference script does not require training on these datasets.

### Defects

- `SDNET2018`
- `CrackForest Dataset`

Use these for YOLO crack or defect fine-tuning.

Expected YOLO classes could include:

- `crack`
- `spall`
- `corrosion`
- `water_damage`

### Materials

- `MINC`

Suggested classes:

- `brick`
- `concrete`
- `glass`
- `paint`
- `plaster`
- `stone`

### Valuation Labels

Use a CSV with:

- extracted numeric features
- `valuation_score` or `price`

Minimal practical label count:

- `50-200` rows for initial experimentation
- more for stable production quality

## Suggested Local Layout

```text
datasets/
├── defects/
│   ├── images/
│   └── labels/
├── materials/
│   ├── images/
│   └── labels/
├── lidar/
└── valuation/
    └── valuation_features.csv
```

## Labeling Guidance

- keep feature names stable between training and inference
- keep all valuation features numeric
- normalize class names before YOLO training
