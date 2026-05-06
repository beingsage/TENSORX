'use client';

import React, { useMemo } from 'react';

interface RiskDimension {
  name: string;
  score: number; // 0-100
  color: string;
}

interface RiskRadarProps {
  dimensions: RiskDimension[];
  overallScore: number;
}

export function RiskRadar({ dimensions, overallScore }: RiskRadarProps) {
  const size = 300;
  const center = size / 2;
  const maxRadius = size / 3;

  // Generate radar points
  const points = useMemo(() => {
    return dimensions.map((dim, idx) => {
      const angle = (idx / dimensions.length) * Math.PI * 2 - Math.PI / 2;
      const radius = (dim.score / 100) * maxRadius;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return { x, y, ...dim, angle };
    });
  }, [dimensions]);

  // Generate concentric circles
  const circles = [20, 40, 60, 80, 100];

  // Calculate polygon path
  const polygonPoints = points
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm">Risk Assessment Radar</h3>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-red-600">{overallScore}</div>
          <span className="text-xs text-slate-600">/100</span>
        </div>
      </div>

      <svg width={size} height={size} className="w-full border border-slate-200 rounded bg-slate-50">
        {/* Background circles */}
        {circles.map((score) => {
          const r = (score / 100) * maxRadius;
          return (
            <circle
              key={`circle-${score}`}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Axis lines */}
        {points.map((p, idx) => (
          <line
            key={`axis-${idx}`}
            x1={center}
            y1={center}
            x2={center + maxRadius * Math.cos(p.angle)}
            y2={center + maxRadius * Math.sin(p.angle)}
            stroke="#D1D5DB"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(244, 63, 94, 0.2)"
          stroke="#F43F5E"
          strokeWidth="2"
        />

        {/* Data points */}
        {points.map((p, idx) => (
          <circle
            key={`point-${idx}`}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={p.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Labels */}
        {points.map((p, idx) => {
          const labelDistance = maxRadius + 40;
          const labelX = center + labelDistance * Math.cos(p.angle);
          const labelY = center + labelDistance * Math.sin(p.angle);
          return (
            <text
              key={`label-${idx}`}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="500"
              fill="#374151"
            >
              {p.name}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
        {dimensions.map((dim) => (
          <div key={dim.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: dim.color }}></div>
            <span className="text-slate-600">
              {dim.name}: <span className="font-bold">{dim.score}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Risk Level Indicator */}
      <div className="mt-4 p-3 bg-slate-50 rounded">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">OVERALL RISK LEVEL</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
              overallScore >= 80
                ? 'bg-red-600'
                : overallScore >= 60
                  ? 'bg-yellow-600'
                  : overallScore >= 40
                    ? 'bg-orange-600'
                    : 'bg-green-600'
            }`}
          >
            {overallScore >= 80
              ? 'CRITICAL'
              : overallScore >= 60
                ? 'HIGH'
                : overallScore >= 40
                  ? 'MEDIUM'
                  : 'LOW'}
          </span>
        </div>
      </div>
    </div>
  );
}
