from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from exterior_engine.io_utils import MESH_EXTENSIONS, POINT_CLOUD_EXTENSIONS


def _require_open3d():
    try:
        import open3d as o3d
    except ImportError as error:  # pragma: no cover - dependency specific
        raise RuntimeError(
            "open3d is required for geometry inference. Install dependencies from requirements.txt."
        ) from error
    return o3d


def _to_numpy_points(point_cloud: Any) -> np.ndarray:
    points = np.asarray(point_cloud.points)
    if points.size == 0:
        raise ValueError("Loaded point cloud has no points.")
    return points


def load_geometry_asset(mesh_path: str | None = None, point_cloud_path: str | None = None) -> Any:
    o3d = _require_open3d()
    if mesh_path:
        mesh_file = Path(mesh_path)
        if mesh_file.suffix.lower() not in MESH_EXTENSIONS:
            raise ValueError(f"Unsupported mesh format: {mesh_file.suffix}")
        mesh = o3d.io.read_triangle_mesh(str(mesh_file))
        if mesh.is_empty():
            raise ValueError(f"Could not read mesh: {mesh_path}")
        point_cloud = mesh.sample_points_uniformly(number_of_points=100000)
        return point_cloud

    if point_cloud_path:
        cloud_file = Path(point_cloud_path)
        if cloud_file.suffix.lower() not in POINT_CLOUD_EXTENSIONS:
            raise ValueError(f"Unsupported point cloud format: {cloud_file.suffix}")
        point_cloud = o3d.io.read_point_cloud(str(cloud_file))
        if point_cloud.is_empty():
            raise ValueError(f"Could not read point cloud: {point_cloud_path}")
        return point_cloud

    raise ValueError("Provide either mesh_path or point_cloud_path.")


def _compute_surface_roughness(points: np.ndarray) -> float:
    centroid = points.mean(axis=0)
    radial_distances = np.linalg.norm(points - centroid, axis=1)
    return float(np.std(radial_distances))


def _compute_density(points: np.ndarray, extent: np.ndarray) -> float:
    volume = float(np.prod(np.maximum(extent, 1e-3)))
    return float(len(points) / volume)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def extract_geometry_features(mesh_path: str | None = None, point_cloud_path: str | None = None) -> dict[str, float]:
    o3d = _require_open3d()
    point_cloud = load_geometry_asset(mesh_path=mesh_path, point_cloud_path=point_cloud_path)
    point_cloud.estimate_normals()

    plane_model, inliers = point_cloud.segment_plane(
        distance_threshold=0.01,
        ransac_n=3,
        num_iterations=1000,
    )

    points = _to_numpy_points(point_cloud)
    bbox = point_cloud.get_axis_aligned_bounding_box()
    extent = np.asarray(bbox.get_extent(), dtype=float)
    min_bound = np.asarray(bbox.get_min_bound(), dtype=float)
    max_bound = np.asarray(bbox.get_max_bound(), dtype=float)
    inlier_points = points[inliers] if len(inliers) else points[:0]

    if len(inlier_points):
        distances = np.abs(
            plane_model[0] * inlier_points[:, 0]
            + plane_model[1] * inlier_points[:, 1]
            + plane_model[2] * inlier_points[:, 2]
            + plane_model[3]
        )
        mean_plane_deviation = float(np.mean(distances))
    else:
        mean_plane_deviation = 0.0

    inlier_ratio = float(len(inliers) / len(points))
    roughness = _compute_surface_roughness(points)
    height = float(extent[2])
    footprint_area = float(extent[0] * extent[1])
    density = _compute_density(points, extent)
    normal_vectors = np.asarray(point_cloud.normals)
    vertical_alignment = float(np.mean(np.abs(normal_vectors[:, 2]))) if len(normal_vectors) else 0.0

    wall_flatness_score = _clamp(1.0 - mean_plane_deviation * 25.0, 0.0, 1.0)
    structural_quality_score = _clamp(
        0.45 * wall_flatness_score
        + 0.30 * inlier_ratio
        + 0.15 * _clamp(1.0 - roughness / 10.0, 0.0, 1.0)
        + 0.10 * _clamp(vertical_alignment, 0.0, 1.0),
        0.0,
        1.0,
    )

    return {
        "point_count": float(len(points)),
        "extent_x": float(extent[0]),
        "extent_y": float(extent[1]),
        "extent_z": height,
        "height": height,
        "footprint_area": footprint_area,
        "bbox_min_x": float(min_bound[0]),
        "bbox_min_y": float(min_bound[1]),
        "bbox_min_z": float(min_bound[2]),
        "bbox_max_x": float(max_bound[0]),
        "bbox_max_y": float(max_bound[1]),
        "bbox_max_z": float(max_bound[2]),
        "plane_inlier_ratio": inlier_ratio,
        "wall_flatness": wall_flatness_score,
        "mean_plane_deviation": mean_plane_deviation,
        "surface_roughness": roughness,
        "point_density": density,
        "vertical_surface_alignment": vertical_alignment,
        "structural_quality_score": structural_quality_score,
    }

