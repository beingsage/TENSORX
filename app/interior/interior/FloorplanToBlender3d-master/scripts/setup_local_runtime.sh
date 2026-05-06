#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${REPO_ROOT}/.venv"
TOOLS_DIR="${REPO_ROOT}/.tools/blender"
BLENDER_VERSION="${BLENDER_VERSION:-3.6.23}"
BLENDER_ARCHIVE="blender-${BLENDER_VERSION}-linux-x64.tar.xz"
BLENDER_URL="${BLENDER_URL:-https://download.blender.org/release/Blender3.6/${BLENDER_ARCHIVE}}"
BLENDER_EXTRACTED_DIR="${TOOLS_DIR}/blender-${BLENDER_VERSION}-linux-x64"

mkdir -p "${TOOLS_DIR}"

if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  python3 -m venv "${VENV_DIR}"
fi

"${VENV_DIR}/bin/python" -m pip install --upgrade pip
"${VENV_DIR}/bin/python" -m pip install \
  opencv-python \
  numpy \
  pillow \
  matplotlib \
  scipy \
  requests

if [[ ! -x "${BLENDER_EXTRACTED_DIR}/blender" ]]; then
  curl -L "${BLENDER_URL}" -o "${TOOLS_DIR}/${BLENDER_ARCHIVE}"
  tar -xJf "${TOOLS_DIR}/${BLENDER_ARCHIVE}" -C "${TOOLS_DIR}"
fi

ln -sfn "${BLENDER_EXTRACTED_DIR}/blender" "${TOOLS_DIR}/blender"
rm -f "${TOOLS_DIR}/${BLENDER_ARCHIVE}"

echo "Local runtime is ready."
echo "Python: ${VENV_DIR}/bin/python"
echo "Blender: ${TOOLS_DIR}/blender"
