from __future__ import annotations

import argparse
import json
from pathlib import Path

from exterior_engine.io_utils import ensure_directory
from exterior_engine.training import (
    bootstrap_synthetic_valuation_dataset,
    launch_yolo_training,
    train_valuation_model,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Training entrypoint for the exterior valuation engine.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    valuation = subparsers.add_parser("valuation", help="Train XGBoost valuation model from feature CSV.")
    valuation.add_argument("--features-csv", required=True)
    valuation.add_argument("--target-column", required=True)
    valuation.add_argument("--output-dir", required=True)
    valuation.add_argument("--test-ratio", type=float, default=0.2)
    valuation.add_argument("--seed", type=int, default=42)
    valuation.add_argument("--n-estimators", type=int, default=300)
    valuation.add_argument("--max-depth", type=int, default=6)
    valuation.add_argument("--learning-rate", type=float, default=0.05)

    bootstrap = subparsers.add_parser(
        "bootstrap-valuation",
        help="Create a synthetic valuation dataset and train an MVP XGBoost model.",
    )
    bootstrap.add_argument("--output-dir", required=True)
    bootstrap.add_argument("--rows", type=int, default=512)
    bootstrap.add_argument("--seed", type=int, default=42)

    defect = subparsers.add_parser("defect-yolo", help="Fine-tune YOLO for defect detection.")
    defect.add_argument("--data-config", required=True)
    defect.add_argument("--model", default="yolov8n.pt")
    defect.add_argument("--epochs", type=int, default=20)
    defect.add_argument("--imgsz", type=int, default=640)
    defect.add_argument("--batch", type=int, default=8)
    defect.add_argument("--device")
    defect.add_argument("--project", default="artifacts/yolo")
    defect.add_argument("--name", default="defect")

    material = subparsers.add_parser("material-yolo", help="Fine-tune YOLO for material detection.")
    material.add_argument("--data-config", required=True)
    material.add_argument("--model", default="yolov8n.pt")
    material.add_argument("--epochs", type=int, default=20)
    material.add_argument("--imgsz", type=int, default=640)
    material.add_argument("--batch", type=int, default=8)
    material.add_argument("--device")
    material.add_argument("--project", default="artifacts/yolo")
    material.add_argument("--name", default="material")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "valuation":
        result = train_valuation_model(
            features_csv=args.features_csv,
            target_column=args.target_column,
            output_dir=args.output_dir,
            test_ratio=args.test_ratio,
            seed=args.seed,
            n_estimators=args.n_estimators,
            max_depth=args.max_depth,
            learning_rate=args.learning_rate,
        )
        print(json.dumps(result, indent=2))
        return

    if args.command == "bootstrap-valuation":
        output_dir = ensure_directory(args.output_dir)
        dataset_path = Path(output_dir) / "synthetic_valuation_features.csv"
        bootstrap_synthetic_valuation_dataset(
            output_csv=str(dataset_path),
            rows=args.rows,
            seed=args.seed,
        )
        result = train_valuation_model(
            features_csv=str(dataset_path),
            target_column="valuation_score",
            output_dir=str(output_dir),
            seed=args.seed,
        )
        print(
            json.dumps(
                {
                    "dataset_path": str(dataset_path),
                    **result,
                },
                indent=2,
            )
        )
        return

    if args.command == "defect-yolo":
        result = launch_yolo_training(
            task_name="defect_yolo",
            data_config=args.data_config,
            base_model=args.model,
            epochs=args.epochs,
            imgsz=args.imgsz,
            project=args.project,
            run_name=args.name,
            batch=args.batch,
            device=args.device,
        )
        print(json.dumps(result, indent=2))
        return

    if args.command == "material-yolo":
        result = launch_yolo_training(
            task_name="material_yolo",
            data_config=args.data_config,
            base_model=args.model,
            epochs=args.epochs,
            imgsz=args.imgsz,
            project=args.project,
            run_name=args.name,
            batch=args.batch,
            device=args.device,
        )
        print(json.dumps(result, indent=2))
        return

    parser.error(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    main()

