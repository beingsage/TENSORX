/**
 * Risk Radar Chart Component
 */

'use client';

import React from 'react';

interface RiskDimension {
  label: string;
  value: number; // 0-100
  threshold?: number; // Warning threshold
}

interface RiskRadarProps {
  risks: RiskDimension[];
  overallRiskScore: number;
}

export default function RiskRadar({ risks, overallRiskScore }: RiskRadarProps) {
  const numPoints = risks.length;
  const angleSlice = (Math.PI * 2) / numPoints;
  const radius = 120;
  const centerX = 160;
  const centerY = 160;

  const getPoint = (index: number, value: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  const getLabelPoint = (index: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const r = radius + 40;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  const pathData = risks
    .map((risk, i) => {
      const point = getPoint(i, risk.value);
      return `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    })
    .join(' ') + ' Z';

  const axisLines = risks
    .map((_, i) => {
      const labelPoint = getLabelPoint(i);
      return `M ${centerX} ${centerY} L ${labelPoint.x} ${labelPoint.y}`;
    })
    .join(' ');

  // Risk level color
  const getRiskColor = (value: number) => {
    if (value > 80) return '#dc2626';
    if (value > 60) return '#f97316';
    if (value > 40) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="w-full border rounded-lg bg-white p-6 shadow-md">
      <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>

      <div className="flex gap-6">
        {/* Radar Chart */}
        <div className="flex-shrink-0">
          <svg width={320} height={320} className="border rounded">
            {/* Background circles */}
            {[20, 40, 60, 80, 100].map((val) => (
              <circle
                key={val}
                cx={centerX}
                cy={centerY}
                r={(val / 100) * radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
            ))}

            {/* Axis lines */}
            <path d={axisLines} stroke="#d1d5db" strokeWidth="0.5" />

            {/* Risk polygon */}
            <path d={pathData} fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeWidth="2" />

            {/* Data points */}
            {risks.map((risk, i) => {
              const point = getPoint(i, risk.value);
              return (
                <circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}

            {/* Labels */}
            {risks.map((risk, i) => {
              const labelPoint = getLabelPoint(i);
              return (
                <text
                  key={`label-${i}`}
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#374151"
                >
                  {risk.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Risk Details */}
        <div className="flex-1">
          <div className="mb-6 p-4 rounded bg-gray-50">
            <div className="text-sm text-gray-600">Overall Risk Score</div>
            <div className="text-3xl font-bold" style={{ color: getRiskColor(overallRiskScore) }}>
              {overallRiskScore.toFixed(0)}/100
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {overallRiskScore > 80
                ? '🔴 Critical - Immediate attention needed'
                : overallRiskScore > 60
                ? '🟠 High - Significant concerns'
                : overallRiskScore > 40
                ? '🟡 Moderate - Monitor closely'
                : '🟢 Low - Acceptable risk profile'}
            </div>
          </div>

          {/* Individual Risk Items */}
          <div className="space-y-2">
            {risks.map((risk, idx) => (
              <div key={idx} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{risk.label}</span>
                  <span className="font-bold" style={{ color: getRiskColor(risk.value) }}>
                    {risk.value.toFixed(0)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, risk.value)}%`,
                      backgroundColor: getRiskColor(risk.value),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
