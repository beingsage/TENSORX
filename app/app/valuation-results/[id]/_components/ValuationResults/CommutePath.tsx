'use client';

import React from 'react';

interface CommutePath {
  destination: string;
  travelTime: number;
  distance: number;
  icon: string;
}

interface CommutePathProps {
  paths: CommutePath[];
}

export function CommutePath({ paths }: CommutePathProps) {
  const maxTime = Math.max(...paths.map(p => p.travelTime));
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <h3 className="font-bold text-lg mb-4 text-white">Commute Times</h3>
      <div className="space-y-6">
        {paths.map((path, idx) => (
          <div key={path.destination} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{path.icon}</span>
                <div>
                  <div className="font-semibold text-sm text-white">{path.destination}</div>
                  <div className="text-xs text-[#9fb29d]">{path.distance} km</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-white">{path.travelTime} min</div>
              </div>
            </div>

            {/* Horizontal bar */}
            <div className="h-6 bg-white/10 overflow-hidden relative">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${(path.travelTime / maxTime) * 100}%`,
                  backgroundColor: colors[idx % colors.length],
                }}
              />
              {/* Time markers */}
              <div className="absolute inset-0 flex items-center justify-between px-2">
                <span className="text-xs font-bold text-white drop-shadow">{path.travelTime}m</span>
              </div>
            </div>

            {/* Travel mode indicators */}
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-cyan-400/10 text-cyan-100 text-xs font-semibold">Public</span>
              {path.travelTime < 20 && (
                <span className="px-2 py-1 bg-emerald-400/10 text-emerald-100 text-xs font-semibold">Walking</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Average commute */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-cyan-400/10 p-4">
            <div className="text-xs text-cyan-100 font-semibold uppercase">Avg Commute</div>
            <div className="text-2xl font-bold text-white mt-2">
              {Math.round(paths.reduce((acc, p) => acc + p.travelTime, 0) / paths.length)} min
            </div>
          </div>
          <div className="bg-emerald-400/10 p-4">
            <div className="text-xs text-emerald-100 font-semibold uppercase">Total Distance</div>
            <div className="text-2xl font-bold text-white mt-2">
              {(paths.reduce((acc, p) => acc + p.distance, 0)).toFixed(1)} km
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
