import argparse
import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from FloorplanToBlenderLib import IO, config, const, execution, floorplan  # noqa: E402


def parse_args():
    parser = argparse.ArgumentParser(description='Generate FloorplanToBlender outputs for a saved run.')
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--image', required=True, help='Repo-relative path to the input image.')
    parser.add_argument('--output-dir', required=True, help='Repo-relative path for generated outputs.')
    parser.add_argument('--formats', default='glb,blend')
    parser.add_argument('--base-name', default='floorplan')
    return parser.parse_args()


def ensure_configs():
    const.SYSTEM_CONFIG_FILE_NAME = './Configs/system.ini'
    const.IMAGE_DEFAULT_CONFIG_FILE_NAME = './Configs/default.ini'
    if not Path(const.SYSTEM_CONFIG_FILE_NAME).exists() or not Path(const.IMAGE_DEFAULT_CONFIG_FILE_NAME).exists():
        config.generate_file()


def blender_path():
    env_override = os.environ.get('BLENDER_BIN')
    if env_override:
        return env_override
    detected = IO.blender_installed()
    if detected:
        return detected
    return '/usr/local/blender/blender'


def run_blender(args):
    subprocess.check_call(args, cwd=REPO_ROOT)


def main():
    args = parse_args()
    os.chdir(REPO_ROOT)
    ensure_configs()

    formats = [f'.{item.strip().lstrip(".").lower()}' for item in args.formats.split(',') if item.strip()]
    relative_data_root = f'./runtime/{args.run_id}/data/'
    relative_output_root = args.output_dir if args.output_dir.startswith('./') else f'./{args.output_dir}'
    relative_input_path = args.image if args.image.startswith('./') else f'./{args.image}'

    Path(relative_output_root).mkdir(parents=True, exist_ok=True)
    Path(relative_data_root).mkdir(parents=True, exist_ok=True)
    IO.clean_data_folder(relative_data_root)

    const.BASE_PATH = relative_data_root
    const.DOOR_MODEL = 'Images/Models/Doors/door.png'
    const.DEFAULT_CALIBRATION_IMAGE_PATH = 'Images/Calibrations/wallcalibration.png'

    plan = floorplan.new_floorplan(None)
    plan.image_path = relative_input_path
    data_paths = [execution.simple_single(plan, False)]

    blender = blender_path()
    target_blend_rel = f'{relative_output_root}/{args.base_name}.blend'

    run_blender(
        [
            blender,
            '-noaudio',
            '--background',
            '--python',
            str(REPO_ROOT / 'Blender' / 'floorplan_to_3dObject_in_blender.py'),
            f'{REPO_ROOT}/',
            target_blend_rel,
            *data_paths,
        ]
    )

    for target_format in formats:
        if target_format == '.blend':
            continue
        target_path = f'{relative_output_root}/{args.base_name}{target_format}'
        run_blender(
            [
                blender,
                '-noaudio',
                '--background',
                '--python',
                str(REPO_ROOT / 'scripts' / 'blender_export_extended.py'),
                '--',
                str(REPO_ROOT / target_blend_rel[2:]),
                target_format,
                str(REPO_ROOT / target_path[2:]),
            ]
        )


if __name__ == '__main__':
    main()
