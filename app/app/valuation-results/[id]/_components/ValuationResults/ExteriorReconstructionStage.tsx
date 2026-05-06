'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Building2, Image, Sparkles } from 'lucide-react';
import type { IntakeReconstructionJob } from '@/lib/db/schema';
import type { SerializedAssetPreview } from '@/lib/valuation/report';
import { Building3DModel } from './Building3DModel';
import { ThreeGlbViewer } from './ThreeGlbViewer';

type StagePhoto = {
  url: string;
  label: string;
  mimeType?: string;
};

function normalizeAsset(asset: StagePhoto | SerializedAssetPreview): StagePhoto {
  return {
    url: 'secureUrl' in asset ? asset.secureUrl : asset.url,
    label: 'displayName' in asset ? asset.displayName : asset.label,
    mimeType: asset.mimeType,
  };
}

function isGlbAsset(asset: StagePhoto) {
  return /\.(glb|gltf)(\?|#|$)/i.test(asset.url) || /model\/(gltf-binary|gltf\+json|gltf)/i.test(asset.mimeType || '');
}

function isVideoAsset(asset: StagePhoto) {
  return asset.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(asset.url);
}

function isImageAsset(asset: StagePhoto) {
  return asset.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(asset.url);
}

function toProxyGlbUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return url;
  }
  return `/api/proxy-glb?url=${encodeURIComponent(url)}`;
}

function reconstructionTone(status?: IntakeReconstructionJob['status']) {
  if (status === 'completed') return 'border-emerald-400/40 bg-emerald-500/12 text-emerald-100';
  if (status === 'running' || status === 'queued')
    return 'border-amber-400/40 bg-amber-500/12 text-amber-100';
  if (status === 'failed') return 'border-rose-400/40 bg-rose-500/12 text-rose-100';
  return 'border-cyan-400/40 bg-cyan-500/12 text-cyan-100';
}

function resolvePreviewKind(url?: string | null) {
  if (!url) return 'empty';
  if (/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url)) return 'image';
  return 'frame';
}

export function ExteriorReconstructionStage({
  propertyName,
  propertyType,
  buildingAge,
  bedrooms,
  bathrooms,
  hasGarden,
  photos,
  fallbackPhotos,
  reconstruction,
}: {
  propertyName: string;
  propertyType: string;
  buildingAge: number;
  bedrooms?: number;
  bathrooms?: number;
  hasGarden?: boolean;
  photos: SerializedAssetPreview[];
  fallbackPhotos?: StagePhoto[];
  reconstruction?: IntakeReconstructionJob;
}) {
  const stagePhotos = useMemo(() => {
    const uploaded = photos.map((photo, index) => ({
      url: photo.secureUrl,
      label: photo.displayName || `Exterior capture ${index + 1}`,
    }));

    if (uploaded.length) {
      return uploaded;
    }

    return fallbackPhotos || [];
  }, [fallbackPhotos, photos]);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (activePhoto >= stagePhotos.length) {
      setActivePhoto(0);
    }
  }, [activePhoto, stagePhotos.length]);

  useEffect(() => {
    if (stagePhotos.length < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setActivePhoto((current) => (current + 1) % stagePhotos.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [stagePhotos.length]);

  const previewUrl = reconstruction?.previewUrl?.trim() || '';
  const normalizedPhotos = useMemo(
    () => photos.map(normalizeAsset),
    [photos]
  );
  const glbAsset = normalizedPhotos.find(isGlbAsset);
  const videoAsset = normalizedPhotos.find(isVideoAsset);
  const imageAsset = normalizedPhotos.find(isImageAsset);
  const activeImage = (imageAsset || stagePhotos[activePhoto]) as StagePhoto;
  const previewKind = resolvePreviewKind(previewUrl);
  const glbPreviewUrl = glbAsset ? toProxyGlbUrl(glbAsset.url) : null;
  const stageMode = glbAsset
    ? '3D asset available'
    : videoAsset
      ? 'Video preview available'
      : previewUrl
        ? 'Live preview'
        : reconstruction?.status === 'completed'
          ? 'Completed run'
          : 'Demo mode';

  return (
    <div className="overflow-hidden bg-[#071008] text-[#edf9eb]">
      <div className="flex flex-col gap-4 border-b border-[#27cf6c]/35 bg-[#071008]/85 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#7bf29b]/75">
            Exterior Reconstruction
          </p>
          <h3 className="mt-1 text-xl font-semibold text-white">
            Exterior capture and 3D preview
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-[#c6ddc2]">
            {propertyName} · {propertyType}. This tab displays uploaded exterior media and
            any available 3D model asset. If a GLB or video is attached, it renders it directly
            inside the exterior canvas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full border px-3 py-1.5 font-medium ${reconstructionTone(
              reconstruction?.status
            )}`}
          >
            {reconstruction?.provider || 'nerfstudio'} · {reconstruction?.status || 'unconfigured'}
          </span>
          <span className="rounded-full border border-[#ff8f98]/55 bg-[#ff8f98]/10 px-3 py-1.5 text-[#ffd7db]">
            {stageMode}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[#d8e8d4]">
            {stagePhotos.length} media source{stagePhotos.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="grid gap-px bg-[#27cf6c]/20 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="bg-[#050805] p-4">
          <div className="relative min-h-[520px] overflow-hidden bg-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(48,255,121,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,143,152,0.15),_transparent_30%)]" />

            {glbPreviewUrl ? (
              <div className="absolute inset-0">
                <ThreeGlbViewer
                  url={glbPreviewUrl}
                  badgeLabel="GLB Preview"
                  title="Exterior reconstruction mesh"
                  hint="Browser-side GLB stage"
                  background="#020603"
                />
              </div>
            ) : null}

            {videoAsset && !glbAsset ? (
              <video
                controls
                src={videoAsset.url}
                className="absolute inset-0 h-full w-full object-cover bg-black"
              />
            ) : null}

            {videoAsset ? null : previewKind === 'image' ? (
              <img
                src={previewUrl}
                alt={`${propertyName} reconstruction preview`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}

            {videoAsset ? null : previewKind === 'frame' ? (
              <iframe
                src={previewUrl}
                title={`${propertyName} reconstruction preview`}
                className="absolute inset-0 h-full w-full bg-black"
              />
            ) : null}

            {!glbAsset && !videoAsset && !previewUrl && activeImage ? (
              <img
                src={activeImage.url}
                alt={activeImage.label}
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
            ) : null}

            {!glbAsset && !videoAsset && !previewUrl && !activeImage ? (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                <div className="max-w-md space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#27cf6c]/40 bg-[#0c1c10] text-[#7bf29b]">
                    <Image className="h-8 w-8" />
                  </div>
                  <p className="text-lg font-semibold text-white">
                    Exterior media is not attached yet
                  </p>
                  <p className="text-sm text-[#bfd5bb]">
                    Upload exterior glb/video or exterior captures during intake and this stage will switch from property-backed media.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 bg-black/45 px-4 py-3 backdrop-blur">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7bf29b]/80">
                  Stage feed
                </p>
                <p className="mt-1 text-sm text-white">
                  {previewUrl ? 'Preview stream ready' : activeImage?.label || 'Awaiting capture'}
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#d6ead1]">
                {stageMode}
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent px-4 pb-4 pt-16">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9cb49a]">
                    Run status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {reconstruction?.message || 'Demo sequence active until live preview is linked.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9cb49a]">
                    Job handle
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {reconstruction?.jobId || reconstruction?.runId || 'Demo-only'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9cb49a]">
                    Output target
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">
                    {reconstruction?.outputPath || 'Attach previewUrl later to replace this stage.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {stagePhotos.length > 1 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {stagePhotos.map((photo, index) => (
                <button
                  key={`${photo.url}-${index}`}
                  type="button"
                  onClick={() => setActivePhoto(index)}
                  className={`overflow-hidden border transition ${
                    activePhoto === index
                      ? 'border-[#ff8f98] shadow-[0_0_0_1px_rgba(255,143,152,0.35)]'
                      : 'border-white/10 hover:border-[#27cf6c]/45'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="h-24 w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 bg-[#08110b] p-4">
          <div className="overflow-hidden border border-[#27cf6c]/35 bg-black/25">
            <div className="border-b border-[#27cf6c]/35 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7bf29b]/75">
                Massing Proxy
              </p>
              <p className="mt-1 text-sm text-[#d6ead1]">
                Exterior demo surface aligned with the current property profile.
              </p>
            </div>
            <div className="h-[360px]">
              <Building3DModel
                propertyType={propertyType}
                bedrooms={bedrooms}
                bathrooms={bathrooms}
                buildingAge={buildingAge}
                hasBalcony
                hasGarden={hasGarden}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="border border-white/10 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[#27cf6c]/35 bg-[#0d1d10] p-2 text-[#7bf29b]">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9cb49a]">
                    Exterior stack
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {propertyType} · {buildingAge} years
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[#ff8f98]/35 bg-[#251217] p-2 text-[#ffd7db]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9cb49a]">
                    Reconstruction source
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {reconstruction?.provider === 'nerfstudio'
                      ? 'NeRFstudio pipeline'
                      : 'Uploaded imagery demo'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-2 text-[#d6ead1]">
                  <Box className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9cb49a]">
                    Attached media
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {photos.length
                      ? `${photos.length} uploaded exterior asset${photos.length === 1 ? '' : 's'}`
                      : `${stagePhotos.length} fallback photo${stagePhotos.length === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-[#27cf6c]/28 bg-[#0b170d] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7bf29b]/75">
              Integration note
            </p>
            <p className="mt-3 text-sm leading-6 text-[#d4e6cf]">
              This stage is already aligned to the property’s stored reconstruction metadata.
              When the deployment pipeline starts writing a `previewUrl`, this tab will switch
              from media-backed demo mode to the live external viewer without needing another
              layout change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
