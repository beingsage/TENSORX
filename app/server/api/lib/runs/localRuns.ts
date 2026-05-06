import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { imageSize } from 'image-size';
import sharp from 'sharp';
import { generateId } from '@/lib/ids';
import { RouteError } from '@/lib/api';

const execFileAsync = promisify(execFile);

const LOCAL_RUNS_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(LOCAL_RUNS_DIR, '../../../../');
const FLOORPLAN_REPO_ROOT = path.join(APP_ROOT, 'interior', 'interior', 'FloorplanToBlender3d-master');
const FLOORPLAN_RUNTIME_ROOT = path.join(FLOORPLAN_REPO_ROOT, 'runtime');
const FLOORPLAN_RUNTIME_OUTPUT_BASENAME = 'floorplan';
const FLOORPLAN_GENERATION_TIMEOUT_MS = Number(
  process.env.FLOORPLAN_TO_BLENDER_TIMEOUT_MS?.trim() || 30 * 60 * 1000
);
const FLOORPLAN_PYTHON_OVERRIDE = process.env.FLOORPLAN_TO_BLENDER_PYTHON?.trim() || '';
const FLOORPLAN_BLENDER_OVERRIDE =
  process.env.FLOORPLAN_TO_BLENDER_BLENDER_BIN?.trim() || process.env.BLENDER_BIN?.trim() || '';
const REQUIRED_FLOORPLAN_PYTHON_MODULES = ['cv2', 'numpy', 'PIL', 'matplotlib', 'scipy'] as const;

type LocalRunStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

type LocalRunTask = 'upload' | 'detect' | 'generate-3d';

type LocalRunOutputs = Partial<Record<'glb' | 'blend' | 'gltf' | 'dae' | 'ifc', string>>;

type LocalWorkerProbe = {
  workers_online: number;
  provider: 'floorplan-to-blender';
  available: boolean;
  detail: string;
  mode: 'direct';
  python_bin?: string;
  blender_bin?: string;
  missing_python_modules?: string[];
};

export type LocalRunMeta = {
  scale?: number;
  [key: string]: unknown;
};

export type LocalRunRecord = {
  runId: string;
  userId: string;
  projectId?: string;
  propertyId?: string;
  valuationId?: string;
  name?: string;
  status: LocalRunStatus;
  currentTask: LocalRunTask;
  message?: string;
  error?: string;
  imageFilename: string;
  imageMimeType: string;
  imageWidth?: number;
  imageHeight?: number;
  svgFilename: string;
  rawSvgFilename: string;
  outputs: LocalRunOutputs;
  meta: LocalRunMeta;
  createdAt: string;
  updatedAt: string;
};

type CreateLocalRunInput = {
  userId: string;
  file: File;
  projectId?: string;
  propertyId?: string;
  valuationId?: string;
  name?: string;
};

type Generate3DInput = {
  runId: string;
  userId: string;
  formats?: string[];
  scale?: number;
};

function normalizeFormat(format: string) {
  return format.replace(/^\./, '').toLowerCase();
}

function toFormatExtension(format: string) {
  const normalized = normalizeFormat(format);
  return normalized ? `.${normalized}` : '';
}

function inferMimeType(filename: string, fallback = 'application/octet-stream') {
  const ext = path.extname(filename).toLowerCase();
  const knownTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.dae': 'model/vnd.collada+xml',
    '.blend': 'application/x-blender',
  };
  return knownTypes[ext] || fallback;
}

function buildDefaultSvg(width = 1000, height = 1000) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    '  <g id="wall"></g>',
    '  <g id="door"></g>',
    '  <g id="window"></g>',
    '  <g id="imported-models"></g>',
    '  <g id="rooms-geometry"></g>',
    '  <g id="labels"></g>',
    '</svg>',
  ].join('\n');
}

async function ensureRuntimeRoot() {
  await fs.mkdir(FLOORPLAN_RUNTIME_ROOT, { recursive: true });
}

function getRunRoot(runId: string) {
  return path.join(FLOORPLAN_RUNTIME_ROOT, runId);
}

function getRunMetaPath(runId: string) {
  return path.join(getRunRoot(runId), 'run.json');
}

function getRunSvgPath(runId: string) {
  return path.join(getRunRoot(runId), 'inference.svg');
}

function getRunRawSvgPath(runId: string) {
  return path.join(getRunRoot(runId), 'inference_raw.svg');
}

function getRunInputPath(runId: string, filename: string) {
  return path.join(getRunRoot(runId), filename);
}

function getRunGenerationInputPath(runId: string) {
  return path.join(getRunRoot(runId), 'input_generation.png');
}

function getRunOutputsRoot(runId: string) {
  return path.join(getRunRoot(runId), 'outputs');
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function getFloorplanPythonCandidates() {
  return uniqueNonEmpty([
    FLOORPLAN_PYTHON_OVERRIDE,
    path.join(FLOORPLAN_REPO_ROOT, '.venv', 'bin', 'python'),
    path.join(FLOORPLAN_REPO_ROOT, '.venv', 'Scripts', 'python.exe'),
    'python3',
    'python',
  ]);
}

function getBlenderCandidates() {
  return uniqueNonEmpty([
    FLOORPLAN_BLENDER_OVERRIDE,
    path.join(FLOORPLAN_REPO_ROOT, '.tools', 'blender', 'blender'),
    path.join(FLOORPLAN_REPO_ROOT, '.tools', 'blender', 'blender.exe'),
    'blender',
    '/usr/bin/blender',
    '/usr/local/bin/blender',
    '/usr/local/blender/blender',
    '/snap/bin/blender',
  ]);
}

async function resolveExecutable(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['--version'], {
        cwd: FLOORPLAN_REPO_ROOT,
        timeout: 10_000,
      });
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function getMissingFloorplanPythonModules(pythonBin: string) {
  const importScript = [
    'import json',
    `modules = ${JSON.stringify([...REQUIRED_FLOORPLAN_PYTHON_MODULES])}`,
    'missing = []',
    'for module_name in modules:',
    '    try:',
    '        __import__(module_name)',
    '    except Exception:',
    '        missing.append(module_name)',
    'print(json.dumps(missing))',
  ].join('\n');

  try {
    const { stdout } = await execFileAsync(pythonBin, ['-c', importScript], {
      cwd: FLOORPLAN_REPO_ROOT,
      timeout: 20_000,
    });
    const parsed = JSON.parse(stdout.trim() || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [...REQUIRED_FLOORPLAN_PYTHON_MODULES];
  }
}

let cachedWorkerProbe: { expiresAt: number; result: LocalWorkerProbe } | null = null;

async function probeLocalWorker(force = false): Promise<LocalWorkerProbe> {
  const now = Date.now();
  if (!force && cachedWorkerProbe && cachedWorkerProbe.expiresAt > now) {
    return cachedWorkerProbe.result;
  }

  const repoStat = await fs.stat(FLOORPLAN_REPO_ROOT).catch(() => null);
  if (!repoStat?.isDirectory()) {
    const result: LocalWorkerProbe = {
      workers_online: 0,
      provider: 'floorplan-to-blender',
      available: false,
      detail: `FloorplanToBlender3d repository is missing at ${FLOORPLAN_REPO_ROOT}.`,
      mode: 'direct',
    };
    cachedWorkerProbe = { expiresAt: now + 15_000, result };
    return result;
  }

  const pythonBin = await resolveExecutable(getFloorplanPythonCandidates());
  if (!pythonBin) {
    const result: LocalWorkerProbe = {
      workers_online: 0,
      provider: 'floorplan-to-blender',
      available: false,
      detail:
        'Python runtime is unavailable for FloorplanToBlender. Set FLOORPLAN_TO_BLENDER_PYTHON or create a repo-local .venv.',
      mode: 'direct',
    };
    cachedWorkerProbe = { expiresAt: now + 15_000, result };
    return result;
  }

  const missingPythonModules = await getMissingFloorplanPythonModules(pythonBin);
  if (missingPythonModules.length > 0) {
    const result: LocalWorkerProbe = {
      workers_online: 0,
      provider: 'floorplan-to-blender',
      available: false,
      detail: `FloorplanToBlender Python dependencies are missing: ${missingPythonModules.join(', ')}.`,
      mode: 'direct',
      python_bin: pythonBin,
      missing_python_modules: missingPythonModules,
    };
    cachedWorkerProbe = { expiresAt: now + 15_000, result };
    return result;
  }

  const blenderBin = await resolveExecutable(getBlenderCandidates());
  if (!blenderBin) {
    const result: LocalWorkerProbe = {
      workers_online: 0,
      provider: 'floorplan-to-blender',
      available: false,
      detail:
        'Blender executable is unavailable. Set BLENDER_BIN or FLOORPLAN_TO_BLENDER_BLENDER_BIN to a local Blender binary.',
      mode: 'direct',
      python_bin: pythonBin,
    };
    cachedWorkerProbe = { expiresAt: now + 15_000, result };
    return result;
  }

  const result: LocalWorkerProbe = {
    workers_online: 1,
    provider: 'floorplan-to-blender',
    available: true,
    detail: `Direct FloorplanToBlender worker is available. Python: ${pythonBin}. Blender: ${blenderBin}.`,
    mode: 'direct',
    python_bin: pythonBin,
    blender_bin: blenderBin,
  };
  cachedWorkerProbe = { expiresAt: now + 15_000, result };
  return result;
}

function resolveRunRelativePath(runId: string, inputPath: string) {
  const normalized = inputPath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('/');

  if (!normalized || normalized.startsWith('..') || normalized.includes('/../')) {
    throw new RouteError(400, 'INVALID_ASSET_PATH', 'Invalid run asset path.');
  }

  const runRoot = path.resolve(getRunRoot(runId));
  const absolutePath = path.resolve(runRoot, normalized);
  if (absolutePath !== runRoot && !absolutePath.startsWith(`${runRoot}${path.sep}`)) {
    throw new RouteError(400, 'INVALID_ASSET_PATH', 'Invalid run asset path.');
  }

  return {
    absolutePath,
    relativePath: normalized,
  };
}

async function writeRunRecord(record: LocalRunRecord) {
  await fs.writeFile(getRunMetaPath(record.runId), JSON.stringify(record, null, 2), 'utf8');
}

export async function getLocalRun(runId: string) {
  try {
    const raw = await fs.readFile(getRunMetaPath(runId), 'utf8');
    return JSON.parse(raw) as LocalRunRecord;
  } catch {
    return null;
  }
}

export async function requireLocalRun(runId: string, userId: string) {
  const record = await getLocalRun(runId);
  if (!record || record.userId !== userId) {
    throw new RouteError(404, 'RUN_NOT_FOUND', 'Floorplan run not found.');
  }
  return record;
}

export async function listLocalRunsForUser(userId: string) {
  await ensureRuntimeRoot();
  const entries = await fs.readdir(FLOORPLAN_RUNTIME_ROOT, { withFileTypes: true }).catch(() => []);
  const runs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => getLocalRun(entry.name))
  );
  return runs
    .filter((run): run is LocalRunRecord => run !== null && run.userId === userId)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

async function setRunState(
  runId: string,
  updater: (record: LocalRunRecord) => LocalRunRecord | Promise<LocalRunRecord>
) {
  const current = await getLocalRun(runId);
  if (!current) {
    throw new RouteError(404, 'RUN_NOT_FOUND', 'Floorplan run not found.');
  }
  const updated = await updater(current);
  updated.updatedAt = new Date().toISOString();
  await writeRunRecord(updated);
  return updated;
}

async function writeSvgFiles(runId: string, svgText: string) {
  await fs.writeFile(getRunSvgPath(runId), svgText, 'utf8');
  await fs.writeFile(getRunRawSvgPath(runId), svgText, 'utf8');
}

async function rasterizeRunSvgForGeneration(runId: string) {
  const svgBuffer = await fs.readFile(getRunSvgPath(runId));
  const outputPath = getRunGenerationInputPath(runId);
  await sharp(svgBuffer, { density: 192 })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(outputPath);
  return outputPath;
}

function getImageMetadata(buffer: Buffer) {
  try {
    const result = imageSize(buffer);
    return {
      width: result.width,
      height: result.height,
    };
  } catch {
    return {};
  }
}

export async function createLocalRunFromFile(input: CreateLocalRunInput) {
  await assertFloorplanRepoAvailable();
  await ensureRuntimeRoot();

  const runId = generateId('RUN');
  const runRoot = getRunRoot(runId);
  const outputsRoot = getRunOutputsRoot(runId);
  await fs.mkdir(outputsRoot, { recursive: true });

  const originalExt = path.extname(input.file.name || '').toLowerCase();
  const safeExt = originalExt || '.png';
  const imageFilename = `input_image${safeExt}`;
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());
  const imagePath = getRunInputPath(runId, imageFilename);
  await fs.writeFile(imagePath, fileBuffer);

  const dimensions = getImageMetadata(fileBuffer);
  const svgText = buildDefaultSvg(dimensions.width || 1000, dimensions.height || 1000);
  await writeSvgFiles(runId, svgText);

  const now = new Date().toISOString();
  const record: LocalRunRecord = {
    runId,
    userId: input.userId,
    projectId: input.projectId,
    propertyId: input.propertyId,
    valuationId: input.valuationId,
    name: input.name || input.file.name,
    status: 'COMPLETED',
    currentTask: 'upload',
    message: 'Floorplan uploaded and ready for calibration, editing, and 3D generation.',
    imageFilename,
    imageMimeType: input.file.type || inferMimeType(imageFilename),
    imageWidth: dimensions.width,
    imageHeight: dimensions.height,
    svgFilename: path.basename(getRunSvgPath(runId)),
    rawSvgFilename: path.basename(getRunRawSvgPath(runId)),
    outputs: {},
    meta: {},
    createdAt: now,
    updatedAt: now,
  };

  await writeRunRecord(record);
  return record;
}

export async function updateLocalRunMeta(runId: string, userId: string, meta: Record<string, unknown>) {
  await requireLocalRun(runId, userId);
  return setRunState(runId, (record) => ({
    ...record,
    meta: {
      ...record.meta,
      ...meta,
      ...(typeof meta.scale === 'number' ? { scale: meta.scale } : {}),
    },
  }));
}

export async function updateLocalRunSvg(runId: string, userId: string, svgText: string) {
  await requireLocalRun(runId, userId);
  await writeSvgFiles(runId, svgText);
  return setRunState(runId, (record) => ({
    ...record,
    message: 'Floorplan SVG synchronized.',
  }));
}

export async function readLocalRunSvg(runId: string, userId: string, raw = false) {
  await requireLocalRun(runId, userId);
  const svgPath = raw ? getRunRawSvgPath(runId) : getRunSvgPath(runId);
  return fs.readFile(svgPath, 'utf8');
}

async function assertFloorplanRepoAvailable() {
  const stat = await fs.stat(FLOORPLAN_REPO_ROOT).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new RouteError(
      500,
      'FLOORPLAN_REPO_MISSING',
      'FloorplanToBlender3d repository is missing from the expected interior runtime path.'
    );
  }
}

async function requireLocalWorker() {
  const probe = await probeLocalWorker(true);
  if (!probe.available || !probe.python_bin || !probe.blender_bin) {
    throw new RouteError(503, 'FLOORPLAN_WORKER_UNAVAILABLE', probe.detail);
  }

  return probe;
}

export async function markRunCompleted(runId: string, userId: string, task: LocalRunTask, message: string) {
  await requireLocalRun(runId, userId);
  return setRunState(runId, (record) => ({
    ...record,
    currentTask: task,
    status: 'COMPLETED',
    message,
    error: undefined,
  }));
}

export async function failRun(runId: string, userId: string, task: LocalRunTask, error: string) {
  await requireLocalRun(runId, userId);
  return setRunState(runId, (record) => ({
    ...record,
    currentTask: task,
    status: 'FAILED',
    message: error,
    error,
  }));
}

function uniqueFormats(formats: string[] | undefined) {
  const requested = (formats || ['glb'])
    .map((format) => normalizeFormat(format))
    .filter(Boolean);

  if (requested.includes('ifc')) {
    throw new RouteError(
      501,
      'FORMAT_NOT_SUPPORTED',
      'IFC export is not supported by the bundled FloorplanToBlender worker. Use GLB, GLTF, DAE, or BLEND.'
    );
  }

  return Array.from(new Set(['blend', ...requested]));
}

function relativeRuntimePath(runId: string, ...segments: string[]) {
  return `./runtime/${runId}/${segments.join('/')}`;
}

export async function generateLocalRun3D(input: Generate3DInput) {
  await assertFloorplanRepoAvailable();
  const worker = await requireLocalWorker();

  await requireLocalRun(input.runId, input.userId);
  const formats = uniqueFormats(input.formats);
  const outputsRoot = getRunOutputsRoot(input.runId);

  await fs.mkdir(outputsRoot, { recursive: true });
  await setRunState(input.runId, (record) => ({
    ...record,
    currentTask: 'generate-3d',
    status: 'PROCESSING',
    message: 'Generating 3D model with FloorplanToBlender...',
    error: undefined,
    meta: {
      ...record.meta,
      ...(typeof input.scale === 'number' ? { scale: input.scale } : {}),
    },
  }));

  const runtimeScript = path.join(FLOORPLAN_REPO_ROOT, 'scripts', 'export_floorplan_batch.py');

  try {
    const generationInputPath = await rasterizeRunSvgForGeneration(input.runId);
    await execFileAsync(
      worker.python_bin,
      [
        runtimeScript,
        '--run-id',
        input.runId,
        '--image',
        relativeRuntimePath(input.runId, path.basename(generationInputPath)),
        '--output-dir',
        relativeRuntimePath(input.runId, 'outputs'),
        '--formats',
        formats.join(','),
        '--base-name',
        FLOORPLAN_RUNTIME_OUTPUT_BASENAME,
      ],
      {
        cwd: FLOORPLAN_REPO_ROOT,
        env: {
          ...process.env,
          BLENDER_BIN: worker.blender_bin,
          PYTHONUNBUFFERED: '1',
        },
        timeout: FLOORPLAN_GENERATION_TIMEOUT_MS,
        maxBuffer: 20 * 1024 * 1024,
      }
    );
  } catch (error) {
    const stderr =
      error instanceof Error && 'stderr' in error && typeof error.stderr === 'string'
        ? error.stderr.trim()
        : '';
    const stdout =
      error instanceof Error && 'stdout' in error && typeof error.stdout === 'string'
        ? error.stdout.trim()
        : '';
    const message =
      stderr ||
      stdout ||
      (error instanceof Error ? error.message : 'FloorplanToBlender generation failed.');
    await failRun(input.runId, input.userId, 'generate-3d', message);
    throw new RouteError(500, 'FLOORPLAN_GENERATION_FAILED', message);
  }

  const nextOutputs: LocalRunOutputs = {};
  for (const format of formats) {
    const absolutePath = path.join(outputsRoot, `${FLOORPLAN_RUNTIME_OUTPUT_BASENAME}${toFormatExtension(format)}`);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (stat?.isFile()) {
      nextOutputs[format as keyof LocalRunOutputs] = absolutePath;
    }
  }

  const requestedKeys = formats as Array<keyof LocalRunOutputs>;
  const hasAtLeastOneRequestedOutput = requestedKeys.some((key) => Boolean(nextOutputs[key]));
  if (!hasAtLeastOneRequestedOutput) {
    const fallbackMessage = '3D generation completed, but the requested export file was not produced.';
    await failRun(input.runId, input.userId, 'generate-3d', fallbackMessage);
    throw new RouteError(500, 'FLOORPLAN_OUTPUT_MISSING', fallbackMessage);
  }

  return setRunState(input.runId, (record) => ({
    ...record,
    currentTask: 'generate-3d',
    status: 'COMPLETED',
    message: '3D generation completed.',
    error: undefined,
    outputs: {
      ...record.outputs,
      ...nextOutputs,
    },
  }));
}

export async function getLocalRunDownload(runId: string, userId: string, requestedFormat: string) {
  const record = await requireLocalRun(runId, userId);
  const normalized = normalizeFormat(requestedFormat);

  if (normalized.startsWith('input_image')) {
    const inputPath = getRunInputPath(runId, record.imageFilename);
    return {
      absolutePath: inputPath,
      filename: record.imageFilename,
      mimeType: record.imageMimeType,
    };
  }

  const key = normalized as keyof LocalRunOutputs;
  const knownPath = record.outputs[key];
  if (!knownPath) {
    throw new RouteError(
      404,
      'RUN_OUTPUT_NOT_FOUND',
      `No generated ${normalized.toUpperCase()} file is available for this floorplan run.`
    );
  }

  return {
    absolutePath: knownPath,
    filename: path.basename(knownPath),
    mimeType: inferMimeType(knownPath),
  };
}

export async function getLocalRunAsset(runId: string, userId: string, requestedPath: string) {
  await requireLocalRun(runId, userId);
  const { absolutePath, relativePath } = resolveRunRelativePath(runId, requestedPath);
  const stat = await fs.stat(absolutePath).catch(() => null);
  if (!stat?.isFile()) {
    throw new RouteError(404, 'RUN_ASSET_NOT_FOUND', 'Run asset not found.');
  }

  return {
    absolutePath,
    filename: path.basename(relativePath),
    mimeType: inferMimeType(relativePath),
  };
}

export async function saveImportedRunAsset(runId: string, userId: string, file: File) {
  await requireLocalRun(runId, userId);

  const ext = path.extname(file.name || '').toLowerCase();
  const itemId = generateId('IMD');
  const relativePath = path.posix.join('imported', `${itemId.toLowerCase()}${ext}`);
  const { absolutePath } = resolveRunRelativePath(runId, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    itemId,
    relativePath,
    absolutePath,
  };
}

export async function deleteLocalRun(runId: string, userId: string) {
  await requireLocalRun(runId, userId);
  await fs.rm(getRunRoot(runId), { recursive: true, force: true });
}

export async function deleteAllLocalRunsForUser(userId: string) {
  const runs = await listLocalRunsForUser(userId);
  await Promise.all(runs.map((run) => fs.rm(getRunRoot(run.runId), { recursive: true, force: true })));
}

export async function getLocalWorkerStatus() {
  return probeLocalWorker();
}
