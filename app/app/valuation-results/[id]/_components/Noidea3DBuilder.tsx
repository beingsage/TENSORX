'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Bath, BedDouble, Box, Loader2, Trees, Upload } from 'lucide-react';

// Dynamically import noidea components to avoid SSR issues
const NoideasRoomDesigner = dynamic(
  () => import('@/components/noidea/RoomDesignerEmbed').then(mod => ({ default: mod.RoomDesignerEmbed })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#071008] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#7bf29b]" />
          <p className="text-sm text-[#cfe2ca]">Loading 3D Builder...</p>
        </div>
      </div>
    )
  }
);

interface Noidea3DBuilderProps {
  propertyId: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  buildingAge?: number;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  floorPlanImage?: string; // URL to floor plan image
  address?: string;
}

export function Noidea3DBuilder({
  propertyId,
  propertyType,
  bedrooms = 3,
  bathrooms = 2,
  buildingAge = 5,
  hasBalcony = true,
  hasGarden = false,
  floorPlanImage,
  address = 'Property',
}: Noidea3DBuilderProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(floorPlanImage || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUploadedImage(floorPlanImage || null);
  }, [floorPlanImage]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Convert file to data URL for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImage(event.target.result as string);
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error processing image');
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#040906] text-[#edf9eb]">
      <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(11,18,13,0.96),rgba(7,11,9,0.92))] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[14px] border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                <Box className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-white">
                  Interior reconstruction canvas
                </h3>
                <p className="mt-0.5 truncate text-xs text-[#9fb29d]">{address}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#dcead8]">
              {propertyType}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#dcead8]">
              <BedDouble className="h-3.5 w-3.5" />
              {bedrooms} BR
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#dcead8]">
              <Bath className="h-3.5 w-3.5" />
              {bathrooms} BA
            </span>
            {hasGarden ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#dcead8]">
                <Trees className="h-3.5 w-3.5" />
                Garden
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {!uploadedImage ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(39,207,108,0.08),transparent_55%),linear-gradient(180deg,rgba(5,8,5,1),rgba(3,6,4,1))] p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                <Upload className="h-7 w-7" />
              </div>
              <p className="mb-1 text-sm font-semibold text-white">Load floor plan asset</p>
              <p className="mb-5 max-w-sm text-xs leading-6 text-[#9fb29d]">
                Add a plan image to seed the 2D review and 3D massing views for this property.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-300/85 px-4 py-2 text-sm font-semibold text-[#031006] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing plan...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Select floor plan
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-[16px] border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full flex-col">
            <NoideasRoomDesigner
              floorPlanImage={uploadedImage}
              propertyDetails={{
                propertyId,
                propertyType,
                bedrooms,
                bathrooms,
                buildingAge,
                hasBalcony,
                hasGarden,
                address,
              }}
            />
            
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#07100a] px-3 py-3">
              <p className="text-xs text-[#cfe2ca]">
                Plan synced locally for floor review and simplified 3D inspection.
              </p>
              <button
                onClick={handleRemoveImage}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#edf9eb] transition hover:bg-white/[0.08]"
              >
                Use another plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
