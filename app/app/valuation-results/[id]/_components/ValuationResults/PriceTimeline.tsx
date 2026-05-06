'use client';

import React, { useMemo } from 'react';

interface PricePoint {
  date: string;
  price: number;
  label?: string;
}

interface PriceTimelineProps {
  data: PricePoint[];
  currentPrice: number;
  valuationConfidence: number;
}

export function PriceTimeline({
  data,
  currentPrice,
  valuationConfidence,
}: PriceTimelineProps) {
  const { minPrice, maxPrice, priceChange, percentChange } = useMemo(() => {
    const prices = data.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const change = currentPrice - (data[0]?.price || currentPrice);
    const pct = ((change / (data[0]?.price || currentPrice)) * 100).toFixed(1);
    return {
      minPrice: min,
      maxPrice: max,
      priceChange: change,
      percentChange: pct,
    };
  }, [data, currentPrice]);

  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;

  // Calculate SVG paths
  const range = maxPrice - minPrice || 1;
  const points = data.map((point, idx) => {
    const x = padding + (idx / (data.length - 1 || 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((point.price - minPrice) / range) * (chartHeight - padding * 2);
    return { x, y, ...point };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="font-bold text-sm mb-4">Price History & Market Trend</h3>

        {/* Price Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 p-3 rounded">
            <div className="text-xs text-slate-600 font-semibold uppercase mb-1">Highest</div>
            <div className="text-lg font-bold text-slate-900">
              ₹{(maxPrice / 10000000).toFixed(1)}Cr
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded">
            <div className="text-xs text-slate-600 font-semibold uppercase mb-1">Current</div>
            <div className="text-lg font-bold text-blue-600">
              ₹{(currentPrice / 10000000).toFixed(1)}Cr
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded">
            <div className="text-xs text-slate-600 font-semibold uppercase mb-1">Lowest</div>
            <div className="text-lg font-bold text-slate-900">
              ₹{(minPrice / 10000000).toFixed(1)}Cr
            </div>
          </div>
        </div>

        {/* Price Change */}
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div>
            <div className="text-xs text-slate-600 font-semibold">VALUE CHANGE (from first entry)</div>
            <div className="text-sm text-slate-700 mt-1">
              {priceChange >= 0 ? '📈' : '📉'} ₹{Math.abs(priceChange / 10000000).toFixed(2)}Cr
              <span className={`ml-2 font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange >= 0 ? '+' : ''}{percentChange}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-600 font-semibold">CONFIDENCE</div>
            <div className="text-2xl font-bold text-green-600">{(valuationConfidence * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="overflow-x-auto border border-slate-200 rounded bg-slate-50 p-4">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="min-w-full"
        >
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`grid-${i}`}
              x1={padding}
              y1={padding + (i / 4) * (chartHeight - padding * 2)}
              x2={chartWidth - padding}
              y2={padding + (i / 4) * (chartHeight - padding * 2)}
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}

          {/* Area under line */}
          <path
            d={areaPath}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="none"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
          />

          {/* Data points */}
          {points.map((p, idx) => (
            <circle
              key={`point-${idx}`}
              cx={p.x}
              cy={p.y}
              r="4"
              fill={idx === points.length - 1 ? '#10B981' : '#3B82F6'}
              stroke="white"
              strokeWidth="2"
            />
          ))}

          {/* Current price indicator */}
          {points[points.length - 1] && (
            <g>
              <line
                x1={points[points.length - 1].x}
                y1={padding - 20}
                x2={points[points.length - 1].x}
                y2={chartHeight - padding}
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <text
                x={points[points.length - 1].x}
                y={padding - 25}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#10B981"
              >
                NOW
              </text>
            </g>
          )}

          {/* Axes */}
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={chartHeight - padding}
            stroke="#6B7280"
            strokeWidth="2"
          />
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#6B7280"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Timeline Labels */}
      <div className="mt-4 flex justify-between text-xs text-slate-600 px-10">
        <span>{data[0]?.date}</span>
        <span>Market History</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
