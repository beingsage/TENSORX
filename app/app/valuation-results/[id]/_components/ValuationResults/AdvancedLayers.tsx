'use client';

import React from 'react';

interface Layer {
  id: string;
  name: string;
  icon: string;
  category: 'Infrastructure' | 'Safety' | 'Amenities' | 'Environmental';
  description: string;
  opacity: number;
  enabled: boolean;
}

interface AdvancedLayersProps {
  layers?: Layer[];
}

export function AdvancedLayers({ layers = [] }: AdvancedLayersProps) {
  if (layers.length === 0) {
    return (
      <div className="bg-[#071008] p-6 text-[#edf9eb]">
        <h3 className="font-bold text-lg mb-4 text-white">Spatial Overlay Inventory</h3>
        <div className="border border-dashed border-[#27cf6c]/30 bg-white/5 p-6 text-sm text-[#cfe2ca]">
          No additional overlay metadata is available for this property.
        </div>
      </div>
    );
  }

  const categories = ['Infrastructure', 'Safety', 'Amenities', 'Environmental'] as const;

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <div className="mb-4">
        <h3 className="font-bold text-lg text-white">Spatial Overlay Inventory</h3>
        <p className="text-sm text-[#9fb29d]">
          Overlay definitions available from the valuation pipeline. These are descriptive layer
          outputs, not standalone map controls.
        </p>
      </div>

      <div className="space-y-5">
        {categories.map((category) => {
          const categoryLayers = layers.filter((layer) => layer.category === category);
          if (categoryLayers.length === 0) {
            return null;
          }

          return (
            <div key={category}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold text-white">{category}</h4>
                <span className="bg-white/10 px-3 py-1 text-xs font-semibold text-[#cfe2ca]">
                  {categoryLayers.length} layers
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {categoryLayers.map((layer) => (
                  <div key={layer.id} className="border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{layer.icon}</span>
                        <div>
                          <div className="font-semibold text-sm text-white">{layer.name}</div>
                          <div className="text-sm text-[#cfe2ca] mt-1">{layer.description}</div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-bold whitespace-nowrap ${
                          layer.enabled
                            ? 'bg-emerald-400/15 text-emerald-100'
                            : 'bg-white/10 text-[#cfe2ca]'
                        }`}
                      >
                        {layer.enabled ? 'ACTIVE' : 'OPTIONAL'}
                      </span>
                    </div>
                    <div className="mt-3 text-xs font-semibold text-[#9fb29d]">
                      Suggested opacity: {Math.round(layer.opacity * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
