'use client';

import React, { useMemo, useState } from 'react';

interface SunlightSimulationProps {
  latitude: number;
  longitude: number;
  buildingHeight?: number;
}

function estimatedSolarAngle(latitude: number, hour: number) {
  const latitudePenalty = Math.min(32, Math.abs(latitude) * 0.55);
  const hourPenalty = Math.abs(hour - 12) * 10.5;
  return Math.max(5, 82 - latitudePenalty - hourPenalty);
}

function estimatedShadowLength(height: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return Number((height / Math.tan(radians)).toFixed(1));
}

export function SunlightSimulation({
  latitude,
  longitude,
  buildingHeight = 10,
}: SunlightSimulationProps) {
  const [hour, setHour] = useState(12);

  const daylightHours = useMemo(() => Array.from({ length: 13 }, (_, index) => index + 6), []);
  const profile = useMemo(
    () =>
      daylightHours.map((entryHour) => {
        const angle = estimatedSolarAngle(latitude, entryHour);
        return {
          hour: entryHour,
          angle,
          shadow: estimatedShadowLength(buildingHeight, angle),
        };
      }),
    [buildingHeight, daylightHours, latitude]
  );

  const currentAngle = estimatedSolarAngle(latitude, hour);
  const currentShadow = estimatedShadowLength(buildingHeight, currentAngle);
  const longestShadow = Math.max(...profile.map((entry) => entry.shadow));
  const shortestShadow = Math.min(...profile.map((entry) => entry.shadow));

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <div className="mb-4">
        <h3 className="font-bold text-lg text-white">Modeled Sunlight & Shadow</h3>
        <p className="text-sm text-[#9fb29d]">
          Geometry estimate using latitude and building height. This is not a LiDAR or site-shadow capture.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-[#cfe2ca]">Hour of day</label>
          <span className="text-lg font-bold text-white">
            {String(hour).padStart(2, '0')}:00
          </span>
        </div>
        <input
          type="range"
          min="6"
          max="18"
          value={hour}
          onChange={(event) => setHour(parseInt(event.target.value, 10))}
          className="w-full h-2 bg-white/10 appearance-none cursor-pointer"
        />
        <div className="mt-2 flex justify-between text-xs text-[#9fb29d]">
          <span>Sunrise band</span>
          <span>Noon</span>
          <span>Sunset band</span>
        </div>
      </div>

      <div className="border border-white/10 bg-white/5 p-4 mb-6">
        <div className="font-semibold text-sm text-white mb-3">Estimated shadow profile</div>
        <svg width="100%" height="180" viewBox="0 0 600 180" className="w-full">
          <polyline
            points={profile
              .map((entry, index) => {
                const x = 40 + (index / Math.max(1, profile.length - 1)) * 520;
                const y = 140 - (entry.shadow / Math.max(1, longestShadow)) * 110;
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {profile.map((entry, index) => {
            const x = 40 + (index / Math.max(1, profile.length - 1)) * 520;
            const y = 140 - (entry.shadow / Math.max(1, longestShadow)) * 110;
            const selected = entry.hour === hour;
            return (
              <g key={`sun-${entry.hour}`}>
                <circle cx={x} cy={y} r={selected ? 5 : 3} fill={selected ? '#2563EB' : '#F59E0B'} />
                <text x={x} y="164" textAnchor="middle" fontSize="11" fill="#9fb29d">
                  {entry.hour}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase text-[#9fb29d]">Current shadow</div>
          <div className="mt-2 text-2xl font-bold text-white">{currentShadow}m</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase text-[#9fb29d]">Solar angle</div>
          <div className="mt-2 text-2xl font-bold text-white">{currentAngle.toFixed(0)}°</div>
        </div>
        <div className="bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase text-[#9fb29d]">Shortest shadow</div>
          <div className="mt-2 text-2xl font-bold text-white">{shortestShadow}m</div>
        </div>
      </div>

      <div className="text-xs text-[#9fb29d]">
        Lat {latitude.toFixed(4)} • Lon {longitude.toFixed(4)} • Height {buildingHeight}m
      </div>
    </div>
  );
}
