import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function inferMimeType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.glb')) return 'model/gltf-binary';
  if (lower.endsWith('.gltf')) return 'model/gltf+json';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }

  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured() {
  return Boolean(cloudinaryConfig());
}

export async function uploadFileToCloudinary(args: {
  file: File;
  folder: string;
  publicId?: string;
  tags?: string[];
}) {
  if (!cloudinaryConfig()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  // Validate file size (max 100MB for Cloudinary free tier)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  if (args.file.size > MAX_FILE_SIZE) {
    throw new Error(`File size (${(args.file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 100MB`);
  }

  const fileBuffer = Buffer.from(await args.file.arrayBuffer());
  const mimeType = args.file.type || inferMimeType(args.file.name || '');
  const isLargeFile = args.file.size > 10 * 1024 * 1024; // > 10MB
  const isModel = /\.(glb|gltf)$/i.test(args.file.name || '');

  const uploadOptions: Record<string, any> = {
    folder: args.folder,
    public_id: args.publicId,
    tags: args.tags,
    resource_type: isModel ? 'raw' : 'auto',
    overwrite: true,
    timeout: isLargeFile ? 60000 : 30000,
  };

  if (isLargeFile) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });

      Readable.from(fileBuffer).pipe(stream);
    });
  }

  const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  return cloudinary.uploader.upload(dataUri, uploadOptions);
}

export async function deleteCloudinaryAsset(publicId: string) {
  if (!cloudinaryConfig()) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
