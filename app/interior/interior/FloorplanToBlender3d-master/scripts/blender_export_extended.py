import sys
from pathlib import Path

import bpy


def parse_args():
    if '--' not in sys.argv:
        raise SystemExit('Expected Blender arguments after --.')
    args = sys.argv[sys.argv.index('--') + 1 :]
    if len(args) != 3:
        raise SystemExit('Usage: blender_export_extended.py -- <input.blend> <format> <output>')
    return args[0], args[1].lower(), args[2]


def ensure_parent(path_value: str):
    Path(path_value).parent.mkdir(parents=True, exist_ok=True)


def export_scene(input_path: str, target_format: str, output_path: str):
    bpy.ops.wm.open_mainfile(filepath=input_path)
    ensure_parent(output_path)

    if target_format == '.glb':
        bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
        return
    if target_format == '.gltf':
        bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLTF_SEPARATE')
        return
    if target_format == '.dae':
        bpy.ops.wm.collada_export(filepath=output_path)
        return
    if target_format == '.fbx':
        bpy.ops.export_scene.fbx(filepath=output_path)
        return
    if target_format == '.obj':
        bpy.ops.export_scene.obj(filepath=output_path)
        return
    if target_format == '.blend':
        bpy.ops.wm.save_as_mainfile(filepath=output_path)
        return

    raise SystemExit(f'Unsupported export format: {target_format}')


if __name__ == '__main__':
    source_path, fmt, destination_path = parse_args()
    export_scene(source_path, fmt, destination_path)
