'use client';

import React from 'react';

interface ComparableProperty {
  id: string;
  pricePerSqft: number;
  builtupArea: number;
  priceTotal: number;
  distance: number;
  similarity: number;
}

interface ComparisonScatterProps {
  properties: ComparableProperty[];
  currentProperty: {
    pricePerSqft: number;
    builtupArea: number;
  };
}

export function ComparisonScatter({ properties, currentProperty }: ComparisonScatterProps) {
  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="font-bold text-lg mb-4">Comparable Properties</h3>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No saved comparable valuations are available yet for this workspace. Run more valuations
          against nearby properties to populate this chart with real comparables.
        </div>
      </div>
    );
  }

  const minPrice = Math.min(...properties.map(p => p.pricePerSqft), currentProperty.pricePerSqft) * 0.8;
  const maxPrice = Math.max(...properties.map(p => p.pricePerSqft), currentProperty.pricePerSqft) * 1.2;
  const minArea = Math.min(...properties.map(p => p.builtupArea), currentProperty.builtupArea) * 0.8;
  const maxArea = Math.max(...properties.map(p => p.builtupArea), currentProperty.builtupArea) * 1.2;

  const width = 600;
  const height = 400;
  const padding = 50;

  const getX = (area: number) => padding + ((area - minArea) / (maxArea - minArea)) * (width - 2 * padding);
  const getY = (price: number) => height - padding - ((price - minPrice) / (maxPrice - minPrice)) * (height - 2 * padding);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="font-bold text-lg mb-4">Comparable Properties</h3>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="border border-slate-200 rounded">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <React.Fragment key={`grid-v-${ratio}`}>
              <line
                x1={padding + ratio * (width - 2 * padding)}
                y1={padding}
                x2={padding + ratio * (width - 2 * padding)}
                y2={height - padding}
                stroke="#e2e8f0"
                strokeDasharray="4"
              />
              <line
                x1={padding}
                y1={padding + ratio * (height - 2 * padding)}
                x2={width - padding}
                y2={padding + ratio * (height - 2 * padding)}
                stroke="#e2e8f0"
                strokeDasharray="4"
              />
            </React.Fragment>
          ))}

          {/* Axes */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#1f2937" strokeWidth="2" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1f2937" strokeWidth="2" />

          {/* Axis labels */}
          <text x={width / 2} y={height - 10} textAnchor="middle" className="text-xs" fill="#6b7280">
            Built-up Area (sqft)
          </text>
          <text x={20} y={height / 2} textAnchor="middle" className="text-xs" fill="#6b7280" transform={`rotate(-90 20 ${height / 2})`}>
            Price per sqft
          </text>

          {/* Current property - highlighted */}
          <circle
            cx={getX(currentProperty.builtupArea)}
            cy={getY(currentProperty.pricePerSqft)}
            r="8"
            fill="#0066CC"
            stroke="#ffffff"
            strokeWidth="3"
          />

          {/* Comparable properties */}
          {properties.map((prop, idx) => (
            <g key={prop.id}>
              <circle
                cx={getX(prop.builtupArea)}
                cy={getY(prop.pricePerSqft)}
                r={3 + prop.similarity * 4}
                fill={prop.similarity > 0.7 ? '#10B981' : prop.similarity > 0.5 ? '#F59E0B' : '#EF4444'}
                opacity="0.7"
              />
              <title>
                {`Price: ₹${prop.priceTotal / 10000000}Cr, Distance: ${prop.distance}km, Similarity: ${(prop.similarity * 100).toFixed(0)}%`}
              </title>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-600" />
          <span className="text-sm font-semibold">Current Property</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span className="text-sm text-slate-600">High Similarity (&gt;70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <span className="text-sm text-slate-600">Low Similarity (&lt;50%)</span>
        </div>
      </div>
    </div>
  );
}
