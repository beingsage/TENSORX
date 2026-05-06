'use client';

import React, { useState } from 'react';

interface NoiseSource {
  name: string;
  distance: number;
  intensity: number;
  icon: string;
  frequency: string;
}

interface NoiseHeatmapProps {
  sources?: NoiseSource[];
  baselineNoise?: number;
}

export function NoiseHeatmap({ sources = [], baselineNoise = 50 }: NoiseHeatmapProps) {
  const [selectedRing, setSelectedRing] = useState(500);

  if (sources.length === 0) {
    return (
      <div className="bg-[#071008] p-6 text-[#edf9eb]">
        <h3 className="font-bold text-lg mb-4 text-white">Estimated Noise Exposure</h3>
        <div className="border border-dashed border-[#27cf6c]/30 bg-white/5 p-6 text-sm text-[#cfe2ca]">
          No nearby noise-source data is available for this property.
        </div>
      </div>
    );
  }

  const calculateNoiseAtDistance = (sourceIntensity: number, sourceDistance: number, atDistance: number) => {
    const ratio = sourceDistance / Math.max(atDistance, 0.01);
    const decay = 20 * Math.log10(ratio) * 0.5;
    return Math.max(baselineNoise, sourceIntensity - decay);
  };

  const currentNoise =
    baselineNoise +
    sources.reduce((total, source) => {
      return total + calculateNoiseAtDistance(source.intensity - baselineNoise, source.distance, selectedRing / 1000);
    }, 0) /
      sources.length;

  const getNoiseColor = (level: number) => {
    if (level >= 80) return 'text-rose-100 bg-rose-400/10 border-rose-400/25';
    if (level >= 70) return 'text-orange-100 bg-orange-400/10 border-orange-400/25';
    if (level >= 60) return 'text-amber-100 bg-amber-400/10 border-amber-400/25';
    if (level >= 50) return 'text-cyan-100 bg-cyan-400/10 border-cyan-400/25';
    return 'text-emerald-100 bg-emerald-400/10 border-emerald-400/25';
  };

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="font-bold text-lg text-white">Estimated Noise Exposure</h3>
        <span className={`border px-3 py-1 text-sm font-bold ${getNoiseColor(currentNoise)}`}>
          {currentNoise.toFixed(0)} dB
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-[#cfe2ca]">Sample radius</label>
          <span className="text-lg font-bold text-white">{selectedRing}m</span>
        </div>
        <input
          type="range"
          min="500"
          max="2500"
          step="500"
          value={selectedRing}
          onChange={(event) => setSelectedRing(parseInt(event.target.value, 10))}
          className="w-full h-2 bg-white/10 appearance-none cursor-pointer"
        />
        <div className="mt-2 flex justify-between text-xs text-[#9fb29d]">
          <span>500m</span>
          <span>1.5km</span>
          <span>2.5km</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase text-[#9fb29d]">Baseline</div>
          <div className="mt-2 text-2xl font-bold text-white">{baselineNoise} dB</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase text-[#9fb29d]">Estimated at radius</div>
          <div className="mt-2 text-2xl font-bold text-white">{currentNoise.toFixed(0)} dB</div>
        </div>
      </div>

      <div className="space-y-3">
        {sources
          .slice()
          .sort((left, right) => left.distance - right.distance)
          .map((source) => {
            const projected = calculateNoiseAtDistance(
              source.intensity,
              source.distance,
              selectedRing / 1000
            );
            return (
              <div key={`${source.name}-${source.distance}`} className="border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{source.icon}</span>
                    <div>
                      <div className="font-semibold text-sm text-white">{source.name}</div>
                      <div className="text-xs text-[#9fb29d] mt-1">
                        {source.distance.toFixed(1)}km away • {source.frequency}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{source.intensity} dB</div>
                    <div className="text-xs text-[#9fb29d]">source</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#9fb29d] mb-1">
                    <span>Projected at {selectedRing}m</span>
                    <span>{projected.toFixed(0)} dB</span>
                  </div>
                  <div className="h-2 bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-orange-400"
                      style={{ width: `${Math.max(8, Math.min(100, projected))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
