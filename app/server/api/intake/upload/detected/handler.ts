import { NextResponse } from 'next/server';
import { uploadFileToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';
import { requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { createAssetRecord, getProjectById } from '@/lib/db/client';
import type { AssetDocument } from '@/lib/db/schema';
import { generateId } from '@/lib/ids';
import { successResponse } from '@/lib/utils/errorHandling';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const body = await request.json();
    const { projectId, filePath, fileName, kind, displayName, propertyId, propertyType, tags } = body;

    if (!projectId || !filePath || !fileName || !kind) {
      throw new RouteError(
        400,
        'INVALID_INPUT',
        'projectId, filePath, fileName, and kind are required.'
      );
    }

    if (
      !['legal-document', 'exterior-photo', 'layout-plan', 'exterior-glb', 'exterior-video'].includes(
        kind
      )
    ) {
      throw new RouteError(400, 'INVALID_KIND', 'Unsupported intake upload kind.');
    }

    const project = await getProjectById(projectId, user.userId);
    if (!project) {
      throw new RouteError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }

    if (!isCloudinaryConfigured()) {
      throw new RouteError(
        503,
        'CLOUDINARY_NOT_CONFIGURED',
        'Cloudinary is not configured. Upload credentials are required for intake files.'
      );
    }

    // Read the file from the filesystem
    if (!fs.existsSync(filePath)) {
      throw new RouteError(404, 'FILE_NOT_FOUND', 'Detected file not found on filesystem.');
    }

    const fileBuffer = fs.readFileSync(filePath);
    const file = new File([fileBuffer], fileName, {
      type: getMimeType(fileName),
    });

    const assetId = generateId('AST');
    const uploadTags = tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : ['valuation-intake', kind];
    const upload = await uploadFileToCloudinary({
      file,
      folder: `cost-analysis/${user.userId}/${projectId}/intake`,
      publicId: assetId.toLowerCase(),
      tags: uploadTags,
    });

    const asset: AssetDocument = {
      _id: assetId,
      assetId,
      userId: user.userId,
      projectId,
      propertyId: propertyId || undefined,
      valuationId: undefined,
      publicId: upload.public_id,
      originalFilename: fileName,
      displayName: displayName || fileName,
      resourceType:
        upload.resource_type === 'video' || upload.resource_type === 'raw'
          ? upload.resource_type
          : 'image',
      mimeType: file.type || getMimeType(fileName),
      bytes: file.size,
      secureUrl: upload.secure_url,
      thumbnailUrl: upload.secure_url,
      width: upload.width,
      height: upload.height,
      status: 'ready',
      provider: 'cloudinary',
      tags: uploadTags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await createAssetRecord(asset);

    return NextResponse.json(
      successResponse({
        asset,
      }),
      { status: 201 }
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
