'use client';

import React, { useEffect, useState } from 'react';

interface DemographicData {
  distance: number;
  population: number;
  medianAge: number;
  medianIncome: number;
  educationLevel: string;
  employmentRate: number;
  familyComposition: string;
}

interface DemographicRingsProps {
  rings?: DemographicData[];
}

export function DemographicRings({ rings = [] }: DemographicRingsProps) {
  const [selectedRing, setSelectedRing] = useState(0);

  useEffect(() => {
    if (selectedRing >= rings.length) {
      setSelectedRing(0);
    }
  }, [rings.length, selectedRing]);

  if (rings.length === 0) {
    return (
      <div className="bg-[#071008] p-6 text-[#edf9eb]">
        <h3 className="font-bold text-lg mb-4 text-white">Demographic Analysis</h3>
        <div className="border border-dashed border-[#27cf6c]/30 bg-white/5 p-6 text-sm text-[#cfe2ca]">
          Demographic ring data is not available for this location yet.
        </div>
      </div>
    );
  }

  const currentRing = rings[selectedRing];
  const maxPopulation = Math.max(...rings.map((ring) => ring.population), 1);
  const maxIncome = Math.max(...rings.map((ring) => ring.medianIncome), 1);

  return (
    <div className="bg-[#071008] p-6 text-[#edf9eb]">
      <h3 className="font-bold text-lg mb-4 text-white">Demographic Analysis</h3>

      <div className="mb-6 bg-white/5 p-8 h-64 flex items-center justify-center relative">
        <svg width="300" height="300" className="w-full h-full" viewBox="0 0 300 300">
          {rings.map((ring, index) => {
            const radius = 34 + index * 42;
            return (
              <g key={`${ring.distance}-${index}`}>
                <circle
                  cx="150"
                  cy="150"
                  r={radius}
                  fill="none"
                  stroke={selectedRing === index ? '#2563EB' : '#CBD5E1'}
                  strokeWidth={selectedRing === index ? '3' : '2'}
                  opacity={selectedRing === index ? 1 : 0.7}
                />
                <text
                  x="150"
                  y={150 - radius + 16}
                  textAnchor="middle"
                  className="text-xs font-bold"
                  fill={selectedRing === index ? '#7BF29B' : '#9fb29d'}
                >
                  {ring.distance}km
                </text>
              </g>
            );
          })}
          <circle cx="150" cy="150" r="7" fill="#7BF29B" />
          <text x="150" y="172" textAnchor="middle" className="text-xs font-bold" fill="#7BF29B">
            Subject
          </text>
        </svg>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {rings.map((ring, index) => (
          <button
            key={`${ring.distance}-${index}`}
            onClick={() => setSelectedRing(index)}
            className={`px-4 py-2 border transition-all ${
              selectedRing === index
                ? 'border-[#27cf6c] bg-[#27cf6c]/10 text-white font-semibold'
                : 'border-white/10 bg-white/5 hover:border-[#27cf6c]/45 text-[#cfe2ca]'
            }`}
          >
            {ring.distance}km
          </button>
        ))}
      </div>

      <div className="bg-white/5 p-6 mb-6">
        <div className="mb-4">
          <div className="text-sm font-semibold text-[#9fb29d] uppercase">
            Within {currentRing.distance}km
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {(currentRing.population / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-[#9fb29d] mt-1">estimated residents</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-3">
            <div className="text-xs font-semibold text-[#9fb29d] uppercase">Median Age</div>
            <div className="text-2xl font-bold text-white mt-2">{currentRing.medianAge} yrs</div>
          </div>
          <div className="bg-black/20 p-3">
            <div className="text-xs font-semibold text-[#9fb29d] uppercase">Median Income</div>
            <div className="text-2xl font-bold text-white mt-2">
              ₹{(currentRing.medianIncome / 100000).toFixed(1)}L
            </div>
          </div>
          <div className="bg-black/20 p-3 col-span-2">
            <div className="text-xs font-semibold text-[#9fb29d] uppercase">Employment Rate</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-400"
                  style={{ width: `${currentRing.employmentRate}%` }}
                />
              </div>
              <span className="text-lg font-bold text-white">{currentRing.employmentRate}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-white/5 border border-white/10 p-4">
          <div className="text-sm font-semibold text-white mb-1">Education Profile</div>
          <div className="text-sm text-[#cfe2ca]">{currentRing.educationLevel}</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-4">
          <div className="text-sm font-semibold text-white mb-1">Household Mix</div>
          <div className="text-sm text-[#cfe2ca]">{currentRing.familyComposition}</div>
        </div>
      </div>

      <div className="border border-white/10 bg-white/5 p-4">
        <div className="font-semibold text-sm text-white mb-3">Ring comparison</div>
        <div className="space-y-3">
          {rings.map((ring, index) => (
            <div key={`compare-${ring.distance}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-[#9fb29d]">
                <span>{ring.distance}km</span>
                <span>
                  {(ring.population / 1000).toFixed(0)}K residents • ₹
                  {(ring.medianIncome / 100000).toFixed(1)}L income
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-2 bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${(ring.population / maxPopulation) * 100}%` }}
                  />
                </div>
                <div className="h-2 bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(ring.medianIncome / maxIncome) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
