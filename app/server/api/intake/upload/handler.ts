import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { uploadFileToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';
import { requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { createAssetRecord, getProjectById } from '@/lib/db/client';
import type { AssetDocument, IntakeReconstructionJob } from '@/lib/db/schema';
import { generateId } from '@/lib/ids';
import { successResponse } from '@/lib/utils/errorHandling';
import { extractDocumentInsight } from '@/lib/intake/documentExtraction';
import { createLocalRunFromFile } from '@/lib/runs/localRuns';

type UploadKind =
  | 'legal-document'
  | 'exterior-photo'
  | 'layout-plan'
  | 'exterior-glb'
  | 'exterior-video';

const SUPPORTED_UPLOAD_KINDS: UploadKind[] = [
  'legal-document',
  'exterior-photo',
  'layout-plan',
  'exterior-glb',
  'exterior-video',
];

function parseTags(raw: FormDataEntryValue | null, kind: UploadKind) {
  const baseTags = ['valuation-intake', kind];
  const extraTags = String(raw || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return Array.from(new Set([...baseTags, ...extraTags]));
}

const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'cost-analysis');

async function ensureLocalUploadDirectory(directory: string) {
  await fs.mkdir(directory, { recursive: true });
}

function getLocalUploadUrl(userId: string, projectId: string, assetId: string, filename: string) {
  const ext = path.extname(filename) || '';
  return `/uploads/cost-analysis/${encodeURIComponent(userId)}/${encodeURIComponent(projectId)}/intake/${encodeURIComponent(assetId)}${ext}`;
}

async function saveFileLocally(file: File, userId: string, projectId: string, assetId: string) {
  const extension = path.extname(file.name) || '';
  const directory = path.join(LOCAL_UPLOAD_ROOT, userId, projectId, 'intake');
  await ensureLocalUploadDirectory(directory);

  const filename = `${assetId}${extension}`;
  const absolutePath = path.join(directory, filename);
  await fs.writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    secureUrl: getLocalUploadUrl(userId, projectId, assetId, file.name),
    publicId: assetId,
  };
}

async function startLocalLayoutRun(
  userId: string,
  file: File,
  meta: { projectId: string; propertyId?: string; propertyType?: string }
) {
  const run = await createLocalRunFromFile({
    userId,
    file,
    projectId: meta.projectId,
    propertyId: meta.propertyId,
    name: file.name,
  });

  const now = new Date().toISOString();
  const reconstruction: IntakeReconstructionJob = {
    provider: 'floorplan-to-blender',
    status: 'completed',
    runId: run.runId,
    message:
      'Layout uploaded to FloorplanToBlender. The plan is ready for calibration, editing, and 3D generation.',
    createdAt: now,
    updatedAt: now,
  };

  return reconstruction;
}

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = String(formData.get('projectId') || '').trim();
    const kind = String(formData.get('kind') || '').trim() as UploadKind;

    if (!(file instanceof File) || !projectId || !kind) {
      throw new RouteError(
        400,
        'INVALID_INPUT',
        'file, projectId, and kind are required for intake uploads.'
      );
    }

    // Validate file size early
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      throw new RouteError(
        413,
        'FILE_TOO_LARGE',
        `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 100MB`
      );
    }

    // Validate file type for layout plans (images only)
    if (kind === 'layout-plan') {
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|svg)$/i.test(file.name);
      if (!isImage) {
        throw new RouteError(
          400,
          'INVALID_FILE_TYPE',
          'Layout plans must be image files (PNG, JPEG, WebP, BMP, GIF, SVG). For 3D models, upload as exterior-glb instead.'
        );
      }
    }

    // Validate file type for exterior GLB (models only)
    if (kind === 'exterior-glb') {
      const isModel = file.type === 'model/gltf-binary' || file.type === 'model/gltf+json' || /\.(glb|gltf)$/i.test(file.name);
      if (!isModel) {
        throw new RouteError(
          400,
          'INVALID_FILE_TYPE',
          'Exterior media must be a GLB or GLTF 3D model file.'
        );
      }
    }

    if (!SUPPORTED_UPLOAD_KINDS.includes(kind)) {
      throw new RouteError(400, 'INVALID_KIND', 'Unsupported intake upload kind.');
    }

    const project = await getProjectById(projectId, user.userId);
    if (!project) {
      throw new RouteError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }

    const assetId = generateId('AST');
    const tags = parseTags(formData.get('tags'), kind);
    
    console.log(`[Upload] Starting upload for ${kind}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    const canFallbackLocally = kind === 'exterior-glb';
    let upload: any = null;
    let localFallback = false;

    if (isCloudinaryConfigured()) {
      try {
        upload = await uploadFileToCloudinary({
          file,
          folder: `cost-analysis/${user.userId}/${projectId}/intake`,
          publicId: assetId.toLowerCase(),
          tags,
        });
        console.log(`[Upload] Successfully uploaded ${kind} to Cloudinary:`, { publicId: upload.public_id, resourceType: upload.resource_type });
      } catch (uploadError) {
        console.error(`[Upload] Cloudinary upload failed for ${kind}:`, uploadError instanceof Error ? uploadError.message : uploadError);
        if (canFallbackLocally) {
          const localUpload = await saveFileLocally(file, user.userId, projectId, assetId);
          upload = {
            public_id: localUpload.publicId,
            resource_type: 'raw',
            secure_url: localUpload.secureUrl,
          };
          localFallback = true;
          console.log(`[Upload] Saved ${kind} locally as fallback:`, localUpload.secureUrl);
        } else {
          throw new RouteError(
            502,
            'UPLOAD_FAILED',
            `Failed to upload file to Cloudinary: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
          );
        }
      }
    } else if (canFallbackLocally) {
      const localUpload = await saveFileLocally(file, user.userId, projectId, assetId);
      upload = {
        public_id: localUpload.publicId,
        resource_type: 'raw',
        secure_url: localUpload.secureUrl,
      };
      localFallback = true;
      console.log(`[Upload] Saved ${kind} locally because Cloudinary is not configured:`, localUpload.secureUrl);
    } else {
      throw new RouteError(
        503,
        'CLOUDINARY_NOT_CONFIGURED',
        'Cloudinary is not configured. Upload credentials are required for intake files.'
      );
    }

    const asset: AssetDocument = {
      _id: assetId,
      assetId,
      userId: user.userId,
      projectId,
      propertyId: String(formData.get('propertyId') || '').trim() || undefined,
      valuationId: String(formData.get('valuationId') || '').trim() || undefined,
      publicId: upload.public_id,
      originalFilename: file.name,
      displayName: String(formData.get('displayName') || file.name).trim(),
      resourceType:
        upload.resource_type === 'video' || upload.resource_type === 'raw'
          ? upload.resource_type
          : 'image',
      mimeType: file.type || 'application/octet-stream',
      bytes: file.size,
      secureUrl: upload.secure_url,
      thumbnailUrl: upload.secure_url,
      width: upload.width,
      height: upload.height,
      status: 'ready',
      provider: localFallback ? 'local' : 'cloudinary',
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await createAssetRecord(asset);
    console.log(`[Upload] Asset record created:`, { assetId, resourceType: asset.resourceType });

    const extraction =
      kind === 'legal-document'
        ? await extractDocumentInsight({
            file,
            assetId,
          })
        : null;

    const reconstruction =
      kind === 'layout-plan' && String(formData.get('startReconstruction') || '').trim() === 'true'
        ? await startLocalLayoutRun(user.userId, file, {
            projectId,
            propertyId: String(formData.get('propertyId') || '').trim() || undefined,
            propertyType: String(formData.get('propertyType') || '').trim() || undefined,
          }).catch((error) => {
            console.error(`[Upload] Layout run creation failed:`, error instanceof Error ? error.message : error);
            return {
              provider: 'floorplan-to-blender',
              status: 'failed',
              message: error instanceof Error ? error.message : 'FloorplanToBlender upload failed.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          })
        : null;

    return NextResponse.json(
      successResponse({
        asset,
        extraction,
        reconstruction,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('[Upload] Error:', error instanceof Error ? error.message : error);
    return routeErrorResponse(error);
  }
}
