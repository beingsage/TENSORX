/**
 * Comparable Properties Component
 */

'use client';

import React from 'react';

interface Comparable {
  id: string;
  address: string;
  price: number;
  pricePerSqft: number;
  area: number;
  condition: number;
  daysOnMarket: number;
  distance: number;
}

interface ComparablesProps {
  subject: {
    price: number;
    pricePerSqft: number;
    distance: number;
  };
  comparables: Comparable[];
}

export default function ComparableProperties({ subject, comparables }: ComparablesProps) {
  return (
    <div className="w-full border rounded-lg bg-white p-6 shadow-md">
      <h3 className="text-lg font-semibold mb-4">Market Comparables</h3>

      {/* Scatter Plot */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <svg width="100%" height="300" viewBox="0 0 400 250" className="border rounded bg-white">
          {/* Axes */}
          <line x1="40" y1="220" x2="380" y2="220" stroke="#333" strokeWidth="2" />
          <line x1="40" y1="20" x2="40" y2="220" stroke="#333" strokeWidth="2" />

          {/* Grid */}
          {[1, 2, 3, 4, 5].map((i) => (
            <g key={`grid-${i}`}>
              <line x1="40" y1={20 + (i * 40)} x2="380" y2={20 + (i * 40)} stroke="#eee" strokeWidth="0.5" />
              <line x1={40 + (i * 68)} y1="20" x2={40 + (i * 68)} y2="220" stroke="#eee" strokeWidth="0.5" />
            </g>
          ))}

          {/* Subject property (highlighted) */}
          <circle
            cx={40 + (subject.pricePerSqft / 50) * 68}
            cy={220 - ((subject.price / 5000000) * 200)}
            r="6"
            fill="#FF5722"
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={40 + (subject.pricePerSqft / 50) * 68}
            y={235}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#FF5722"
          >
            Subject
          </text>

          {/* Comparable properties */}
          {comparables.map((comp, idx) => (
            <g key={idx}>
              <circle
                cx={40 + (comp.pricePerSqft / 50) * 68}
                cy={220 - ((comp.price / 5000000) * 200)}
                r="4"
                fill="#2196F3"
                opacity="0.7"
              />
            </g>
          ))}

          {/* Axis labels */}
          <text x="200" y="250" textAnchor="middle" fontSize="12" fontWeight="bold">
            Price per Sqft (₹)
          </text>
          <text x="15" y="120" textAnchor="middle" fontSize="12" fontWeight="bold" transform="rotate(-90 15 120)">
            Total Price (₹)
          </text>
        </svg>
      </div>

      {/* Comparables Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left">Address</th>
              <th className="px-4 py-2 text-right">Price (₹L)</th>
              <th className="px-4 py-2 text-right">Price/Sqft</th>
              <th className="px-4 py-2 text-right">Area (sqft)</th>
              <th className="px-4 py-2 text-right">Days on Market</th>
              <th className="px-4 py-2 text-right">Distance (km)</th>
            </tr>
          </thead>
          <tbody>
            {comparables.slice(0, 5).map((comp, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{comp.address}</td>
                <td className="px-4 py-2 text-right">{(comp.price / 100000).toFixed(1)}</td>
                <td className="px-4 py-2 text-right">₹{comp.pricePerSqft}</td>
                <td className="px-4 py-2 text-right">{comp.area.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{comp.daysOnMarket}</td>
                <td className="px-4 py-2 text-right">{comp.distance.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="p-3 bg-blue-50 rounded">
          <div className="text-xs text-gray-600">Avg Price/Sqft</div>
          <div className="text-lg font-bold text-blue-600">
            ₹{Math.round(comparables.reduce((sum, c) => sum + c.pricePerSqft, 0) / Math.max(comparables.length, 1))}
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded">
          <div className="text-xs text-gray-600">Avg Days on Market</div>
          <div className="text-lg font-bold text-green-600">
            {Math.round(comparables.reduce((sum, c) => sum + c.daysOnMarket, 0) / Math.max(comparables.length, 1))}
          </div>
        </div>
        <div className="p-3 bg-orange-50 rounded">
          <div className="text-xs text-gray-600">Price Variance</div>
          <div className="text-lg font-bold text-orange-600">
            ±{(
              (Math.max(...comparables.map((c) => c.pricePerSqft)) -
                Math.min(...comparables.map((c) => c.pricePerSqft))) /
              2
            ).toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  );
}
