'use client';

import { useMemo, useRef, useState } from 'react';
import { Loader2, Upload, BoxIcon } from 'lucide-react';
import type { SerializedAssetPreview } from '@/lib/valuation/report';
import { ExteriorMediaViewport } from './ExteriorMediaViewport';

type ExteriorMediaTabProps = {
  projectId?: string;
  propertyId: string;
  assets: SerializedAssetPreview[];
  previewUrl?: string | null;
};

function isValidExteriorFile(file: File): boolean {
  const validTypes = [
    'model/gltf-binary',
    'model/gltf+json',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v',
  ];
  const validExtensions = ['.glb', '.gltf', '.mp4', '.webm', '.mov', '.m4v'];
  
  const hasValidType = validTypes.some(type => file.type.includes(type));
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  return hasValidType || hasValidExtension;
}

async function uploadExteriorMedia(
  file: File,
  projectId: string,
  propertyId: string,
  kind: 'glb' | 'video'
): Promise<SerializedAssetPreview> {
  const payload = new FormData();
  payload.append('file', file);
  payload.append('projectId', projectId);
  payload.append('kind', `exterior-${kind}`);
  payload.append('displayName', file.name);
  payload.append('propertyId', propertyId);
  payload.append('tags', `valuation-intake,exterior-${kind}`);

  const uploadResponse = await fetch('/api/intake/upload', {
    method: 'POST',
    body: payload,
  });
  const uploadResult = await uploadResponse.json().catch(() => null);

  if (!uploadResponse.ok || !uploadResult?.success) {
    throw new Error(
      uploadResult?.error?.message || uploadResult?.message || 'Upload failed.'
    );
  }

  return {
    assetId: String(uploadResult.data.asset.assetId),
    displayName: String(uploadResult.data.asset.displayName || uploadResult.data.asset.originalFilename || file.name),
    originalFilename: uploadResult.data.asset.originalFilename ? String(uploadResult.data.asset.originalFilename) : file.name,
    secureUrl: String(uploadResult.data.asset.secureUrl),
    thumbnailUrl: uploadResult.data.asset.thumbnailUrl ? String(uploadResult.data.asset.thumbnailUrl) : undefined,
    resourceType: uploadResult.data.asset.resourceType as SerializedAssetPreview['resourceType'],
    mimeType: String(uploadResult.data.asset.mimeType || file.type),
    width: typeof uploadResult.data.asset.width === 'number' ? uploadResult.data.asset.width : undefined,
    height: typeof uploadResult.data.asset.height === 'number' ? uploadResult.data.asset.height : undefined,
    tags: Array.isArray(uploadResult.data.asset.tags) ? uploadResult.data.asset.tags.map((tag: unknown) => String(tag)) : [],
  };
}

export function ExteriorMediaTab({
  projectId,
  propertyId,
  assets,
  previewUrl,
}: ExteriorMediaTabProps) {
  const glbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaAssets, setMediaAssets] = useState<SerializedAssetPreview[]>(assets);

  const hasGlb = useMemo(() => 
    mediaAssets.some(a => /\.(glb|gltf)(\?|#|$)/i.test(a.secureUrl) || /model\/(gltf-binary|gltf\+json|gltf)/i.test(a.mimeType || '')),
    [mediaAssets]
  );

  const hasVideo = useMemo(() => 
    mediaAssets.some(a => a.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(a.secureUrl)),
    [mediaAssets]
  );

  async function handleMediaUpload(file: File | null, kind: 'glb' | 'video') {
    if (!file) return;
    
    if (!isValidExteriorFile(file)) {
      setError(`Invalid file type. Please upload a valid ${kind === 'glb' ? 'GLB/GLTF model' : 'video (MP4, WebM, MOV, M4V)'}.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      if (!projectId) {
        setError('Project ID is required for exterior media uploads.');
        return;
      }

      const uploadedAsset = await uploadExteriorMedia(file, projectId, propertyId, kind);
      
      // Update property with new asset
      const propertyResponse = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: [...mediaAssets.map(a => a.assetId), uploadedAsset.assetId],
          reconstruction: {
            exterior: {
              ...(kind === 'glb' && { glbAssetId: uploadedAsset.assetId }),
              ...(kind === 'video' && { videoAssetId: uploadedAsset.assetId }),
            },
          },
        }),
      });

      if (!propertyResponse.ok) {
        throw new Error('Failed to attach media to property.');
      }

      setMediaAssets([...mediaAssets, uploadedAsset]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to upload ${kind}.`);
    } finally {
      setUploading(false);
      if (glbInputRef.current) glbInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }

  if (!hasGlb && !hasVideo && !previewUrl && mediaAssets.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#020603] px-6">
        <input
          ref={glbInputRef}
          type="file"
          accept=".glb,.gltf"
          className="hidden"
          onChange={(e) => void handleMediaUpload(e.target.files?.[0] || null, 'glb')}
          disabled={uploading}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept=".mp4,.webm,.mov,.m4v,video/*"
          className="hidden"
          onChange={(e) => void handleMediaUpload(e.target.files?.[0] || null, 'video')}
          disabled={uploading}
        />

        <div className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-[0_40px_100px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-cyan-400/18 bg-cyan-400/10 text-cyan-100">
            <BoxIcon className="h-7 w-7" />
          </div>
          <p className="mt-5 text-lg font-semibold text-white">Upload exterior media</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Upload a 3D model (GLB/GLTF) or video to enhance the exterior preview. If new valuation created the property without these assets, add them here.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => glbInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/85 px-4 py-2 text-sm font-semibold text-[#031006] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload GLB/GLTF
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/85 px-4 py-2 text-sm font-semibold text-[#031006] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Video
                </>
              )}
            </button>
          </div>
          {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020603]">
      <input
        ref={glbInputRef}
        type="file"
        accept=".glb,.gltf"
        className="hidden"
        onChange={(e) => void handleMediaUpload(e.target.files?.[0] || null, 'glb')}
        disabled={uploading}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept=".mp4,.webm,.mov,.m4v,video/*"
        className="hidden"
        onChange={(e) => void handleMediaUpload(e.target.files?.[0] || null, 'video')}
        disabled={uploading}
      />

      <ExteriorMediaViewport
        assets={mediaAssets}
        previewUrl={previewUrl}
      />

      {/* Upload prompt overlay when media is missing */}
      {!hasGlb && !hasVideo && !previewUrl && mediaAssets.length > 0 ? (
        <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 flex gap-2">
          <button
            type="button"
            onClick={() => glbInputRef.current?.click()}
            disabled={uploading}
            className="rounded-full border border-cyan-400/20 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : '+ Add GLB/GLTF'}
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading}
            className="rounded-full border border-emerald-400/20 bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/25 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : '+ Add Video'}
          </button>
        </div>
      ) : null}

      {/* Floating upload buttons when no GLB or video */}
      {mediaAssets.length > 0 && (!hasGlb || !hasVideo) ? (
        <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2">
          {!hasGlb && (
            <button
              type="button"
              onClick={() => glbInputRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : '+ Add GLB/GLTF'}
            </button>
          )}
          {!hasVideo && (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-emerald-400/20 bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/25 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : '+ Add Video'}
            </button>
          )}
        </div>
      ) : null}

      {error ? (
        <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-rose-400/25 bg-rose-500/15 px-4 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}
