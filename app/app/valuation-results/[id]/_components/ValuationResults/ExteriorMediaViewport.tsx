'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box } from 'lucide-react';
import type { SerializedAssetPreview } from '@/lib/valuation/report';
import { cn } from '@/lib/utils';
import { ThreeGlbViewer } from './ThreeGlbViewer';

type ExteriorMediaViewportProps = {
  assets: SerializedAssetPreview[];
  previewUrl?: string | null;
};

type ViewMode = 'glb' | 'video' | 'split';

function assetUrl(asset: SerializedAssetPreview) {
  return asset.secureUrl;
}

function assetName(asset: SerializedAssetPreview) {
  return `${asset.displayName || ''} ${asset.originalFilename || ''}`.toLowerCase();
}

function isGlbAsset(asset: SerializedAssetPreview) {
  return (
    /\.(glb|gltf)(\?|#|$)/i.test(assetUrl(asset)) ||
    /\.(glb|gltf)\b/i.test(assetName(asset)) ||
    /model\/(gltf-binary|gltf\+json|gltf)/i.test(asset.mimeType || '') ||
    (asset.resourceType === 'raw' && asset.tags.some((tag) => /glb|gltf/i.test(tag)))
  );
}

function isVideoAsset(asset: SerializedAssetPreview) {
  return (
    asset.mimeType?.startsWith('video/') ||
    asset.resourceType === 'video' ||
    /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(assetUrl(asset)) ||
    /\.(mp4|webm|mov|m4v)\b/i.test(assetName(asset))
  );
}

function toProxyGlbUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return url;
  }
  return `/api/proxy-glb?url=${encodeURIComponent(url)}`;
}

function previewAssetFromUrl(previewUrl?: string | null) {
  if (!previewUrl) return null;

  const trimmedUrl = previewUrl.trim();
  if (!trimmedUrl) return null;

  const lower = trimmedUrl.toLowerCase();
  if (!/\.(glb|gltf|mp4|webm|mov|m4v)(\?|#|$)/i.test(lower)) {
    return null;
  }

  return {
    assetId: 'preview-url',
    displayName: 'Preview asset',
    originalFilename: trimmedUrl.split('/').pop() || undefined,
    secureUrl: trimmedUrl,
    mimeType: /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(lower)
      ? 'video/mp4'
      : 'model/gltf-binary',
    tags: ['reconstruction-preview'],
    resourceType: /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(lower) ? 'video' : 'raw',
  } satisfies SerializedAssetPreview;
}

export function ExteriorMediaViewport({
  assets,
  previewUrl,
}: ExteriorMediaViewportProps) {
  const previewAsset = useMemo(() => previewAssetFromUrl(previewUrl), [previewUrl]);
  const glbAsset = useMemo(
    () => assets.find(isGlbAsset) || (previewAsset && isGlbAsset(previewAsset) ? previewAsset : null),
    [assets, previewAsset]
  );
  const videoAsset = useMemo(
    () =>
      assets.find(isVideoAsset) ||
      (previewAsset && isVideoAsset(previewAsset) ? previewAsset : null),
    [assets, previewAsset]
  );
  const [mode, setMode] = useState<ViewMode>(
    glbAsset && videoAsset ? 'split' : videoAsset ? 'video' : 'glb'
  );
  const [glbFailed, setGlbFailed] = useState(false);

  const showSplit = mode === 'split' && glbAsset && videoAsset && !glbFailed;

  const resolvedGlbUrl = useMemo(
    () => (glbAsset ? toProxyGlbUrl(assetUrl(glbAsset)) : null),
    [glbAsset]
  );

  useEffect(() => {
    setGlbFailed(false);
  }, [resolvedGlbUrl]);

  useEffect(() => {
    if (glbAsset && videoAsset && !glbFailed && mode !== 'split') {
      setMode('split');
      return;
    }

    if (mode === 'glb' && (!glbAsset || glbFailed) && videoAsset) {
      setMode('video');
      return;
    }

    if (mode === 'video' && !videoAsset && glbAsset && !glbFailed) {
      setMode('glb');
      return;
    }

    if (mode === 'split' && (!glbAsset || glbFailed || !videoAsset)) {
      if (glbAsset && !glbFailed) {
        setMode('glb');
      } else if (videoAsset) {
        setMode('video');
      }
      return;
    }

    if (!videoAsset && glbAsset && !glbFailed) {
      setMode('glb');
      return;
    }

    if (!glbAsset && videoAsset) {
      setMode('video');
    }
  }, [glbAsset, glbFailed, mode, videoAsset]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {!glbAsset && !videoAsset ? (
        <div className="flex h-full w-full items-center justify-center bg-[#020603]">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Box className="h-12 w-12 text-white/30" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white/70">No exterior media</h3>
            <p className="text-sm text-white/40">
              Upload exterior photos, videos, or 3D models to view the reconstruction
            </p>
            <p className="mt-4 text-xs text-white/30">
              Supported formats: GLB, GLTF, MP4, WebM, MOV, M4V
            </p>
          </div>
        </div>
      ) : null}

      {showSplit ? (
        <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2 lg:p-4">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black">
            <ThreeGlbViewer
              url={resolvedGlbUrl}
              badgeLabel="GLB Preview"
              title="Exterior mesh"
              hint="Browser-side GLB stage"
              background="#020603"
              onError={() => setGlbFailed(true)}
            />
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black">
            <div className="absolute left-4 top-4 z-10 rounded-full bg-slate-950/85 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-200">
              Video Preview
            </div>
            <video
              controls
              src={assetUrl(videoAsset)}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </div>
      ) : null}

      {resolvedGlbUrl && mode === 'glb' && !glbFailed ? (
        <ThreeGlbViewer
          url={resolvedGlbUrl}
          badgeLabel="GLB Preview"
          title="Exterior mesh"
          hint="Browser-side GLB stage"
          background="#020603"
          onError={() => setGlbFailed(true)}
        />
      ) : null}

      {videoAsset && mode === 'video' ? (
        <video
          controls
          src={assetUrl(videoAsset)}
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      ) : null}

      {glbAsset && videoAsset ? (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full border border-white/12 bg-black/55 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setMode('split')}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition',
              mode === 'split'
                ? 'bg-white text-black'
                : 'text-white/75 hover:text-white'
            )}
          >
            Split
          </button>
          <button
            type="button"
            onClick={() => {
              if (!glbFailed) {
                setMode('glb');
              }
            }}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition',
              mode === 'glb'
                ? 'bg-white text-black'
                : glbFailed
                  ? 'cursor-not-allowed text-white/30'
                  : 'text-white/75 hover:text-white'
            )}
          >
            GLB
          </button>
          <button
            type="button"
            onClick={() => setMode('video')}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition',
              mode === 'video' ? 'bg-white text-black' : 'text-white/75 hover:text-white'
            )}
          >
            Video
          </button>
        </div>
      ) : null}
    </div>
  );
}
