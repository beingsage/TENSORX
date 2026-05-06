from __future__ import annotations

import json
from pathlib import Path
from typing import Any


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
POINT_CLOUD_EXTENSIONS = {".ply", ".pcd", ".xyz", ".xyzn", ".xyzrgb", ".pts"}
MESH_EXTENSIONS = {".glb", ".gltf", ".obj", ".off", ".stl", ".fbx"}


def ensure_directory(path: str | Path) -> Path:
    target = Path(path)
    target.mkdir(parents=True, exist_ok=True)
    return target


def list_images(paths: list[str] | None = None, directory: str | None = None) -> list[Path]:
    files: list[Path] = []
    if paths:
        files.extend(Path(path) for path in paths)
    if directory:
        for candidate in sorted(Path(directory).iterdir()):
            if candidate.suffix.lower() in IMAGE_EXTENSIONS:
                files.append(candidate)
    unique: dict[str, Path] = {}
    for file_path in files:
        unique[str(file_path.resolve())] = file_path
    return list(unique.values())


def write_json(path: str | Path, payload: dict[str, Any]) -> None:
    target = Path(path)
    ensure_directory(target.parent)
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def read_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))

