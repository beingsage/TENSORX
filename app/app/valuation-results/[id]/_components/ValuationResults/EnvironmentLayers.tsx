'use client';

import React from 'react';

interface EnvironmentLayer {
  name: string;
  id: string;
  color: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  icon: string;
}

interface EnvironmentLayersProps {
  layers: EnvironmentLayer[];
}

export function EnvironmentLayers({ layers }: EnvironmentLayersProps) {
  if (layers.length === 0) {
    return (
      <div className="bg-[#071008] p-6 text-[#edf9eb]">
        <h3 className="font-bold text-lg mb-4 text-white">Environmental Layers</h3>
        <div className="border border-dashed border-[#27cf6c]/30 bg-white/5 p-6 text-sm text-[#cfe2ca]">
          No environmental layers are available for this property.
        </div>
      </div>
    );
  }

  const riskCounts = {
    high: layers.filter((layer) => layer.riskLevel === 'high').length,
    medium: layers.filter((layer) => layer.riskLevel === 'medium').length,
    low: layers.filter((layer) => layer.riskLevel === 'low').length,
  };

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <h3 className="font-bold text-lg mb-4 text-white">Environmental Layers</h3>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-rose-400/25 bg-rose-400/10 p-3">
          <div className="text-xs font-semibold text-rose-100 uppercase">High Risk</div>
          <div className="text-2xl font-bold text-white mt-1">{riskCounts.high}</div>
        </div>
        <div className="border border-amber-400/25 bg-amber-400/10 p-3">
          <div className="text-xs font-semibold text-amber-100 uppercase">Medium Risk</div>
          <div className="text-2xl font-bold text-white mt-1">{riskCounts.medium}</div>
        </div>
        <div className="border border-emerald-400/25 bg-emerald-400/10 p-3">
          <div className="text-xs font-semibold text-emerald-100 uppercase">Low Risk</div>
          <div className="text-2xl font-bold text-white mt-1">{riskCounts.low}</div>
        </div>
      </div>

      <div className="space-y-3">
        {layers.map((layer) => (
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
                  layer.riskLevel === 'high'
                    ? 'bg-rose-400/15 text-rose-100'
                    : layer.riskLevel === 'medium'
                      ? 'bg-amber-400/15 text-amber-100'
                      : 'bg-emerald-400/15 text-emerald-100'
                }`}
              >
                {layer.riskLevel.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
