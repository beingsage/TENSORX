import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { getAsset } from '@/lib/db/client';
import type { IntakeReconstructionJob } from '@/lib/db/schema';

type NerfstudioJob = IntakeReconstructionJob & {
  projectId?: string;
};

const GLOBAL_KEY = '__costAnalysisNerfstudioJobs';

function jobsStore() {
  const globalScope = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Map<string, NerfstudioJob>;
  };

  if (!globalScope[GLOBAL_KEY]) {
    globalScope[GLOBAL_KEY] = new Map<string, NerfstudioJob>();
  }

  return globalScope[GLOBAL_KEY]!;
}

function nowIso() {
  return new Date().toISOString();
}

function setJob(jobId: string, patch: NerfstudioJob) {
  jobsStore().set(jobId, patch);
  return patch;
}

function updateJob(jobId: string, patch: Partial<NerfstudioJob>) {
  const existing = jobsStore().get(jobId);
  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  };
  jobsStore().set(jobId, updated);
  return updated;
}

function resolveCommand() {
  return process.env.NERFSTUDIO_TRAIN_COMMAND?.trim() || '';
}

async function downloadImage(url: string, filePath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status}).`);
  }

  const content = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, content);
}

export function getNerfstudioJob(jobId: string) {
  return jobsStore().get(jobId) || null;
}

export async function startNerfstudioJob(args: {
  assetIds: string[];
  userId: string;
  projectId?: string;
  jobId: string;
}) {
  const { assetIds, userId, projectId, jobId } = args;

  const assets = await Promise.all(assetIds.map((assetId) => getAsset(assetId, userId)));
  const validAssets = assets.filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

  const createdAt = nowIso();
  const baseJob: NerfstudioJob = {
    provider: 'nerfstudio',
    status: 'queued',
    jobId,
    assetIds,
    projectId,
    createdAt,
    updatedAt: createdAt,
    message: 'Preparing exterior photo dataset for NeRFstudio.',
  };

  if (!validAssets.length) {
    return setJob(jobId, {
      ...baseJob,
      status: 'failed',
      message: 'No valid uploaded exterior assets were found for this job.',
    });
  }

  const commandTemplate = resolveCommand();
  if (!commandTemplate) {
    return setJob(jobId, {
      ...baseJob,
      status: 'unconfigured',
      message:
        'Set NERFSTUDIO_TRAIN_COMMAND with {inputDir}, {outputDir}, and {jobId} placeholders to enable local reconstruction.',
    });
  }

  const runtimeRoot = path.join(process.cwd(), '.runtime', 'nerfstudio', jobId);
  const inputDir = path.join(runtimeRoot, 'input');
  const outputDir = path.join(runtimeRoot, 'output');

  await fs.mkdir(inputDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  await Promise.all(
    validAssets.map((asset, index) =>
      downloadImage(
        asset.secureUrl,
        path.join(inputDir, `${String(index + 1).padStart(2, '0')}-${asset.originalFilename}`)
      )
    )
  );

  const command = commandTemplate
    .replaceAll('{inputDir}', inputDir)
    .replaceAll('{outputDir}', outputDir)
    .replaceAll('{jobId}', jobId);

  const job = setJob(jobId, {
    ...baseJob,
    status: 'running',
    command,
    outputPath: outputDir,
    message: `Running local NeRFstudio command for ${validAssets.length} exterior image(s).`,
  });

  const child = spawn(command, {
    shell: true,
    cwd: process.cwd(),
    env: process.env,
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
    updateJob(jobId, {
      message: truncateTail(stdout, 400) || job.message,
    });
  });

  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
    updateJob(jobId, {
      message: truncateTail(stderr, 400) || 'NeRFstudio is running.',
    });
  });

  child.on('close', (code) => {
    updateJob(jobId, {
      status: code === 0 ? 'completed' : 'failed',
      message:
        code === 0
          ? `NeRFstudio job completed. Output directory: ${outputDir}`
          : truncateTail(stderr || stdout, 600) || `NeRFstudio exited with code ${code}.`,
      outputPath: outputDir,
    });
  });

  child.on('error', (error) => {
    updateJob(jobId, {
      status: 'failed',
      message: error.message,
      outputPath: outputDir,
    });
  });

  return job;
}

function truncateTail(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(-max);
}
