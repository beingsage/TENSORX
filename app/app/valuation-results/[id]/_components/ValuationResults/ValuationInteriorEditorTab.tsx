'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { IntakeReconstructionJob } from '@/lib/db/schema';
import type { SerializedAssetPreview } from '@/lib/valuation/report';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '56909186950-20kpuogci6mlge54871pks80e06941cr.apps.googleusercontent.com';

const ValuationEmbeddedEditor = dynamic(
  () =>
    import('@/modules/valuation-interior/ValuationEmbeddedEditor').then(
      (module) => module.ValuationEmbeddedEditor
    ),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[#030705]" />,
  }
);

type LayoutState = {
  asset: SerializedAssetPreview;
  runId?: string | null;
  isLocal?: boolean;
};

type ValuationInteriorEditorTabProps = {
  projectId?: string;
  propertyId: string;
  propertyType: string;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  assetIds?: string[];
  layoutAssetIds?: string[];
  initialLayoutAsset?: SerializedAssetPreview;
  initialLayoutRun?: IntakeReconstructionJob;
};

function toLayoutPreview(asset: any): SerializedAssetPreview {
  return {
    assetId: String(asset.assetId),
    displayName: String(asset.displayName || asset.originalFilename || 'Floor plan'),
    originalFilename: asset.originalFilename ? String(asset.originalFilename) : undefined,
    secureUrl: String(asset.secureUrl),
    thumbnailUrl: asset.thumbnailUrl ? String(asset.thumbnailUrl) : undefined,
    resourceType: asset.resourceType ? String(asset.resourceType) as SerializedAssetPreview['resourceType'] : undefined,
    mimeType: String(asset.mimeType || 'application/octet-stream'),
    width: typeof asset.width === 'number' ? asset.width : undefined,
    height: typeof asset.height === 'number' ? asset.height : undefined,
    tags: Array.isArray(asset.tags) ? asset.tags.map((tag: unknown) => String(tag)) : [],
  };
}

async function toLocalLayoutPreview(file: File): Promise<LayoutState> {
  const secureUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read plan image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read plan image.'));
    reader.readAsDataURL(file);
  });

  const dimensions = await new Promise<{ width?: number; height?: number }>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({});
    image.src = secureUrl;
  });

  return {
    asset: {
      assetId: `local-${Date.now()}`,
      displayName: file.name || 'Local floor plan',
      originalFilename: file.name || 'Local floor plan',
      secureUrl,
      mimeType: file.type || 'image/*',
      width: dimensions.width,
      height: dimensions.height,
      tags: ['local-layout'],
    },
    runId: null,
    isLocal: true,
  };
}

function canRenderPlan(asset?: SerializedAssetPreview) {
  if (!asset?.secureUrl) return false;
  if (asset.mimeType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|bmp|tiff?|gif|avif|svg)(\?|#|$)/i.test(asset.secureUrl);
}

export function ValuationInteriorEditorTab({
  projectId,
  propertyId,
  propertyType,
  address,
  bedrooms,
  bathrooms,
  assetIds = [],
  layoutAssetIds = [],
  initialLayoutAsset,
  initialLayoutRun,
}: ValuationInteriorEditorTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remountKey, setRemountKey] = useState(0);
  const [layoutState, setLayoutState] = useState<LayoutState | null>(
    canRenderPlan(initialLayoutAsset)
      ? {
          asset: initialLayoutAsset as SerializedAssetPreview,
          runId: initialLayoutRun?.runId || null,
        }
      : null
  );

  const nextAssetIds = useMemo(() => {
    const retained = assetIds.filter((assetId) => !layoutAssetIds.includes(assetId));
    return (nextLayoutAssetId: string) => Array.from(new Set([...retained, nextLayoutAssetId]));
  }, [assetIds, layoutAssetIds]);

  async function uploadLayout(file: File) {
    const payload = new FormData();
    payload.append('file', file);
    payload.append('projectId', projectId || '');
    payload.append('kind', 'layout-plan');
    payload.append('displayName', file.name);
    payload.append('propertyId', propertyId);
    payload.append('propertyType', propertyType);
    payload.append('tags', 'valuation-intake,layout-plan');
    payload.append('startReconstruction', 'true');

    const uploadResponse = await fetch('/api/intake/upload', {
      method: 'POST',
      body: payload,
    });
    const uploadResult = await uploadResponse.json().catch(() => null);

    if (!uploadResponse.ok || !uploadResult?.success) {
      throw new Error(
        uploadResult?.error?.message || uploadResult?.message || 'Layout upload failed.'
      );
    }

    const uploadedAsset = toLayoutPreview(uploadResult.data.asset);
    const reconstruction = (uploadResult.data.reconstruction || null) as IntakeReconstructionJob | null;

    const propertyResponse = await fetch(`/api/properties/${propertyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetIds: nextAssetIds(uploadedAsset.assetId),
        layoutAssetIds: [uploadedAsset.assetId],
        reconstruction: {
          layout: reconstruction || undefined,
        },
      }),
    });
    const propertyResult = await propertyResponse.json().catch(() => null);

    if (!propertyResponse.ok || !propertyResult?.success) {
      throw new Error(
        propertyResult?.error?.message ||
          propertyResult?.message ||
          'Failed to attach the new layout to this property.'
      );
    }

    setLayoutState({
      asset: uploadedAsset,
      runId: reconstruction?.runId || null,
    });
    setRemountKey((current) => current + 1);
  }

  async function handleFileSelection(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const localLayout = await toLocalLayoutPreview(file);
      setLayoutState(localLayout);
      setRemountKey((current) => current + 1);

      if (!projectId) {
        setError('Using local plan only. Project save is unavailable for this valuation.');
        return;
      }

      try {
        await uploadLayout(file);
        setError(null);
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? `${uploadError.message} Using local plan only in this browser session.`
            : 'Cloud save failed. Using local plan only in this browser session.'
        );
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Layout load failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  if (!layoutState) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_42%),linear-gradient(180deg,rgba(3,7,5,1),rgba(2,5,4,1))] px-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFileSelection(event.target.files?.[0] || null)}
          disabled={uploading}
        />

        <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-[0_40px_100px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-cyan-400/18 bg-cyan-400/10 text-cyan-100">
            <Upload className="h-7 w-7" />
          </div>
          <p className="mt-5 text-lg font-semibold text-white">Upload a 2D plan</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The interior editor opens after a floor plan image is attached to this valuation.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/85 px-4 py-2 text-sm font-semibold text-[#031006] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Select plan image
              </>
            )}
          </button>
          {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
        </div>
      </div>
    );
  }

  const editorContent = (
    <div className="relative h-full w-full overflow-hidden bg-[#030705]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFileSelection(event.target.files?.[0] || null)}
        disabled={uploading}
      />

      <ValuationEmbeddedEditor
        key={`${layoutState.asset.assetId}-${remountKey}`}
        address={address}
        propertyType={propertyType}
        planName={layoutState.asset.displayName}
        initialPlanUrl={layoutState.asset.secureUrl}
        initialRunId={layoutState.runId}
        bedrooms={bedrooms}
        bathrooms={bathrooms}
        onReplacePlan={() => fileInputRef.current?.click()}
      />

      {uploading ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <div className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-white">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading plan...
            </span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-rose-400/25 bg-rose-500/15 px-4 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </div>
  );

  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{editorContent}</GoogleOAuthProvider>
  ) : (
    editorContent
  );
}
