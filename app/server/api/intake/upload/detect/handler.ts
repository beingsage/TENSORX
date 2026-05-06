import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { getProjectById } from '@/lib/db/client';
import { successResponse } from '@/lib/utils/errorHandling';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SUPPORTED_EXTERIOR_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.mp4',
  '.webm',
  '.mov',
  '.glb',
  '.gltf',
]);

const HANDLER_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HANDLER_DIR, '../../../../../');
const DEFAULT_EXTERIOR_DIRS = [path.join(APP_ROOT, 'exterior')];

function getExteriorDirs() {
  const configured = process.env.VALUATION_EXTERIOR_SCAN_DIRS
    ?.split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return configured && configured.length > 0
    ? Array.from(new Set(configured))
    : DEFAULT_EXTERIOR_DIRS;
}

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      throw new Error('projectId is required');
    }

    const project = await getProjectById(projectId, user.userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const exteriorDirs = getExteriorDirs();
    const exteriorFiles: Array<{ name: string; path: string; size: number; modified: string }> = [];

    try {
      for (const exteriorDir of exteriorDirs) {
        if (!fs.existsSync(exteriorDir)) {
          continue;
        }

        const files = fs.readdirSync(exteriorDir);
        for (const file of files) {
          const filePath = path.join(exteriorDir, /* turbopackIgnore: true */ file);
          const stats = fs.statSync(filePath);

          if (stats.isFile()) {
            const ext = path.extname(file).toLowerCase();
            if (SUPPORTED_EXTERIOR_EXTENSIONS.has(ext)) {
              exteriorFiles.push({
                name: file,
                path: filePath,
                size: stats.size,
                modified: stats.mtime.toISOString(),
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error reading exterior directory:', error);
    }

    return NextResponse.json(
      successResponse({
        exteriorFiles,
        totalCount: exteriorFiles.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
