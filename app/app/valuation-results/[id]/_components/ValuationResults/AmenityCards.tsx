'use client';

import React, { useState } from 'react';

interface Amenity {
  type: string;
  name: string;
  distance: number; // in meters
  icon: string;
  travelTime?: number; // in minutes
}

interface AmenityCardsProps {
  amenities: Amenity[];
}

export function AmenityCards({ amenities }: AmenityCardsProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Group amenities by type
  const groupedAmenities = amenities.reduce(
    (acc, amenity) => {
      if (!acc[amenity.type]) acc[amenity.type] = [];
      acc[amenity.type].push(amenity);
      return acc;
    },
    {} as Record<string, Amenity[]>
  );

  const types = Object.keys(groupedAmenities);

  const getDistanceLabel = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="w-full overflow-hidden bg-[#071008] text-[#edf9eb]">
      {/* Header */}
      <div className="border-b border-[#27cf6c]/30 bg-[#08110b] p-4 text-white">
        <h3 className="font-bold text-sm">Nearby Amenities</h3>
        <p className="text-xs text-[#9fb29d]">Distance from property</p>
      </div>

      {/* Type Selector Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#27cf6c]/25 bg-[#050805] p-3">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(selectedType === type ? null : type)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              selectedType === type
                ? 'bg-[#27cf6c] text-[#041106]'
                : 'border border-white/10 bg-white/5 text-[#cfe2ca] hover:border-[#27cf6c]/45'
            }`}
          >
            {type} ({groupedAmenities[type].length})
          </button>
        ))}
      </div>

      {/* Amenities Grid */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {selectedType
          ? // Show selected type amenities
            groupedAmenities[selectedType].map((amenity, idx) => (
              <AmenityCard key={idx} amenity={amenity} />
            ))
          : // Show all amenities grouped by type
            types.map((type) => (
              <div key={type}>
                <h4 className="text-xs font-bold text-[#9fb29d] uppercase mb-2 px-2">{type}</h4>
                <div className="space-y-2">
                  {groupedAmenities[type].slice(0, 3).map((amenity, idx) => (
                    <AmenityCard key={`${type}-${idx}`} amenity={amenity} />
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

interface AmenityCardProps {
  amenity: Amenity;
}

function AmenityCard({ amenity }: AmenityCardProps) {
  const getDistanceColor = (meters: number) => {
    if (meters < 500) return 'text-emerald-100';
    if (meters < 1000) return 'text-amber-100';
    return 'text-rose-100';
  };

  const getDistanceBgColor = (meters: number) => {
    if (meters < 500) return 'bg-emerald-400/10 border-emerald-400/25';
    if (meters < 1000) return 'bg-amber-400/10 border-amber-400/25';
    return 'bg-rose-400/10 border-rose-400/25';
  };

  return (
    <div className={`border p-3 ${getDistanceBgColor(amenity.distance)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-xl">{amenity.icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">{amenity.name}</h4>
            <p className="text-xs text-[#cfe2ca] mt-1">
              {amenity.distance < 1000
                ? `${Math.round(amenity.distance)}m away`
                : `${(amenity.distance / 1000).toFixed(1)}km away`}
            </p>
            {amenity.travelTime && (
              <p className="text-xs text-[#9fb29d] mt-1">🕒 {amenity.travelTime} min</p>
            )}
          </div>
        </div>

        {/* Distance Badge */}
        <div className={`whitespace-nowrap bg-black/20 px-2 py-1 text-xs font-bold ${getDistanceColor(amenity.distance)}`}>
          {amenity.distance < 1000
            ? `${Math.round(amenity.distance)}m`
            : `${(amenity.distance / 1000).toFixed(1)}km`}
        </div>
      </div>
    </div>
  );
}
