from __future__ import annotations

import argparse
import json

from exterior_engine.detections import extract_image_features
from exterior_engine.geometry import extract_geometry_features
from exterior_engine.io_utils import write_json
from exterior_engine.valuation import merge_feature_maps, score_property


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Inference pipeline for exterior valuation.")
    geometry_group = parser.add_mutually_exclusive_group(required=True)
    geometry_group.add_argument("--mesh", help="Path to mesh asset like .glb or .obj.")
    geometry_group.add_argument("--point-cloud", help="Path to point cloud asset like .ply or .pcd.")

    parser.add_argument("--images", nargs="*", default=None, help="Image file paths.")
    parser.add_argument("--images-dir", default=None, help="Directory containing exterior RGB images.")
    parser.add_argument("--defect-weights", default=None)
    parser.add_argument("--material-weights", default=None)
    parser.add_argument("--valuation-model", default=None)
    parser.add_argument("--valuation-metadata", default=None)
    parser.add_argument("--output-json", default=None)
    return parser


def main() -> None:
    args = build_parser().parse_args()

    warnings: list[str] = []

    geometry_features = extract_geometry_features(
        mesh_path=args.mesh,
        point_cloud_path=args.point_cloud,
    )
    image_features, image_warnings = extract_image_features(
        image_paths=args.images,
        image_dir=args.images_dir,
        defect_weights=args.defect_weights,
        material_weights=args.material_weights,
    )
    warnings.extend(image_warnings)

    feature_vector = merge_feature_maps(geometry_features, image_features)
    valuation = score_property(
        feature_vector,
        model_path=args.valuation_model,
        metadata_path=args.valuation_metadata,
    )

    payload = {
        "geometry_features": geometry_features,
        "image_features": image_features,
        "feature_vector": feature_vector,
        "valuation": valuation,
        "warnings": warnings,
    }

    if args.output_json:
        write_json(args.output_json, payload)

    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
