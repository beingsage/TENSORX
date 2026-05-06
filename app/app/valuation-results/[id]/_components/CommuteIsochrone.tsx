/**
 * Commute Time Isochrone Component
 */

'use client';

import React from 'react';

interface IsochroneZone {
  time: number; // Minutes
  location: string;
  color: string;
}

interface CommuteIsochroneProps {
  zones: IsochroneZone[];
  subject: {
    lat: number;
    lng: number;
    name: string;
  };
}

export default function CommuteIsochrone({ zones, subject }: CommuteIsochroneProps) {
  return (
    <div className="w-full border rounded-lg bg-white p-6 shadow-md">
      <h3 className="text-lg font-semibold mb-4">Commute Time Zones</h3>

      {/* Isochrone Visualization */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <svg width="100%" height="300" viewBox="0 0 400 300" className="border rounded bg-white">
          {/* Background */}
          <rect width="400" height="300" fill="#e8f5e9" />

          {/* Zones (concentric circles) */}
          <g opacity="0.6">
            <circle cx="200" cy="150" r="120" fill="#ffebee" stroke="#ef5350" strokeWidth="1" strokeDasharray="5,5" />
            <circle cx="200" cy="150" r="90" fill="#fff3e0" stroke="#ff9800" strokeWidth="1" strokeDasharray="5,5" />
            <circle cx="200" cy="150" r="60" fill="#e8f5e9" stroke="#66bb6a" strokeWidth="2" />
          </g>

          {/* Labels */}
          <text x="200" y="65" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#d32f2f">
            30 min
          </text>
          <text x="200" y="95" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#f57c00">
            15 min
          </text>
          <text x="200" y="140" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#388e3c">
            5 min
          </text>

          {/* Subject property */}
          <circle cx="200" cy="150" r="5" fill="#FF5722" stroke="white" strokeWidth="2" />
          <text x="200" y="170" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#FF5722">
            {subject.name}
          </text>

          {/* Key destinations */}
          <g>
            <circle cx="290" cy="80" r="3" fill="#1976d2" />
            <text x="295" y="85" fontSize="9" fill="#333">Office</text>

            <circle cx="120" cy="220" r="3" fill="#d32f2f" />
            <text x="125" y="225" fontSize="9" fill="#333">School</text>

            <circle cx="320" cy="200" r="3" fill="#388e3c" />
            <text x="325" y="205" fontSize="9" fill="#333">Mall</text>
          </g>
        </svg>
      </div>

      {/* Zone Details */}
      <div className="space-y-2">
        {zones.map((zone, idx) => (
          <div
            key={idx}
            className="p-3 rounded flex items-center justify-between"
            style={{ backgroundColor: zone.color + '20', borderLeft: `4px solid ${zone.color}` }}
          >
            <div>
              <div className="font-medium">{zone.time} minutes</div>
              <div className="text-xs text-gray-600">{zone.location}</div>
            </div>
            <div
              className="px-3 py-1 rounded text-white text-xs font-bold"
              style={{ backgroundColor: zone.color }}
            >
              {zone.time < 10 ? '✓ Excellent' : zone.time < 20 ? 'Good' : 'Fair'}
            </div>
          </div>
        ))}
      </div>

      {/* Investment Score */}
      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-medium text-gray-700">Accessibility Score</div>
            <div className="text-xs text-gray-600">Based on key destinations</div>
          </div>
          <div className="text-2xl font-bold text-blue-600">8.5/10</div>
        </div>
      </div>
    </div>
  );
}
