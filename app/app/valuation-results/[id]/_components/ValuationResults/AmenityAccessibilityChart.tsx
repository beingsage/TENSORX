'use client';

import { max, scaleBand, scaleLinear } from 'd3';

interface AmenityAccessibilityChartProps {
  amenities: Array<{
    name: string;
    category: string;
    distanceMeters: number;
    travelMinutes: number;
  }>;
}

function barColor(distanceMeters: number, maxDistance: number) {
  const ratio = maxDistance <= 0 ? 0 : distanceMeters / maxDistance;

  if (ratio <= 0.2) return '#0891B2';
  if (ratio <= 0.4) return '#2563EB';
  if (ratio <= 0.65) return '#F59E0B';
  return '#EA580C';
}

export function AmenityAccessibilityChart({
  amenities,
}: AmenityAccessibilityChartProps) {
  const rows = amenities.slice(0, 6);

  if (rows.length === 0) {
    return (
      <div className="bg-[#071008] p-5">
        <p className="text-sm font-semibold text-white">Amenity accessibility</p>
        <p className="mt-3 text-sm text-[#9fb29d]">
          No mapped amenities were available for this asset.
        </p>
      </div>
    );
  }

  const width = 420;
  const height = 240;
  const margin = { top: 16, right: 24, bottom: 16, left: 114 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxDistance = max(rows, (amenity) => amenity.distanceMeters) || 1;
  const rowKeys = rows.map((amenity, index) => `${amenity.name}-${index}`);
  const xScale = scaleLinear().domain([0, maxDistance]).range([0, innerWidth]);
  const yScale = scaleBand<string>()
    .domain(rowKeys)
    .range([0, innerHeight])
    .padding(0.18);

  return (
    <div className="bg-[#071008] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            D3 accessibility profile
          </p>
          <p className="text-xs text-[#9fb29d]">
            Walking-time weighted access to nearby demand anchors
          </p>
        </div>
        <div className="bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
          d3
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 h-[240px] w-full"
        role="img"
        aria-label="Amenity accessibility chart"
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {rows.map((amenity, index) => {
            const rowKey = rowKeys[index];
            const y = yScale(rowKey) || 0;
            const barWidth = xScale(amenity.distanceMeters);
            const barHeight = yScale.bandwidth();
            const color = barColor(amenity.distanceMeters, maxDistance);

            return (
              <g key={rowKey}>
                <text
                  x={-12}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  className="fill-[#cfe2ca] text-[11px] font-medium"
                >
                  {amenity.name.length > 18
                    ? `${amenity.name.slice(0, 18)}…`
                    : amenity.name}
                </text>

                <rect
                  x={0}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={12}
                  fill={color}
                  opacity={0.92}
                />

                <text
                  x={Math.min(innerWidth - 4, barWidth + 10)}
                  y={y + barHeight / 2 + 4}
                  className="fill-[#edf9eb] text-[11px] font-semibold"
                >
                  {`${amenity.distanceMeters}m • ${amenity.travelMinutes} min`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
