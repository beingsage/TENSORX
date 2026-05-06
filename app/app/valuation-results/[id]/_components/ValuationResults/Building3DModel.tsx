'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { SpatialBuilding } from '@/lib/providers/openData';
import { centroidOfPolygon, toLocalMeters } from '@/lib/utils/geo';

interface Building3DModelProps {
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  buildingAge?: number;
  spatialBuilding?: SpatialBuilding | null;
}

function projectIsometric(x: number, y: number, z: number) {
  return {
    x: x - y * 0.55,
    y: (x + y) * 0.18 - z,
  };
}

function formatTag(tags: SpatialBuilding['tags']) {
  const values = [
    tags.name,
    tags.building,
    tags['building:use'],
    tags['roof:shape'],
  ].filter(Boolean) as string[];

  return values.slice(0, 3);
}

export function Building3DModel({
  propertyType = 'apartment',
  bedrooms = 3,
  bathrooms = 2,
  hasBalcony = true,
  hasGarden = false,
  buildingAge = 5,
  spatialBuilding,
}: Building3DModelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rotation, setRotation] = useState(0.42);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#EDF4FB';
    ctx.fillRect(0, 0, width, height);

    const origin = spatialBuilding?.centroid || { lat: 0, lng: 0 };
    const footprintPoints =
      spatialBuilding?.footprint && spatialBuilding.footprint.length >= 3
        ? spatialBuilding.footprint
        : [
            { lat: 0, lng: 0 },
            { lat: 0, lng: 0.00012 },
            { lat: 0.00008, lng: 0.00012 },
            { lat: 0.00008, lng: 0 },
          ];

    const center = centroidOfPolygon(footprintPoints);
    const localized = footprintPoints.map((point) => {
      const local = toLocalMeters(point, center);
      return {
        x: local.x * Math.cos(rotation) - local.y * Math.sin(rotation),
        y: local.x * Math.sin(rotation) + local.y * Math.cos(rotation),
      };
    });

    const extentX = Math.max(...localized.map((point) => Math.abs(point.x)), 1);
    const extentY = Math.max(...localized.map((point) => Math.abs(point.y)), 1);
    const scale = Math.min((width - 150) / (extentX * 2.3), (height - 160) / (extentY * 2.2));
    const extrusionHeight =
      (spatialBuilding?.heightMeters ||
        (spatialBuilding?.levels ? spatialBuilding.levels * 3.1 : 12 + bedrooms * 1.8)) *
      3.1;
    const centerX = width / 2;
    const centerY = height / 2 + 48;

    const topFace = localized.map((point) => {
      const projected = projectIsometric(point.x * scale, point.y * scale, extrusionHeight);
      return {
        x: centerX + projected.x,
        y: centerY + projected.y,
      };
    });

    const baseFace = localized.map((point) => {
      const projected = projectIsometric(point.x * scale, point.y * scale, 0);
      return {
        x: centerX + projected.x,
        y: centerY + projected.y,
      };
    });

    ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.beginPath();
    ctx.ellipse(centerX + 18, centerY + 72, width * 0.2, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    const sideFaces = topFace.map((point, index) => {
      const next = (index + 1) % topFace.length;
      return {
        topA: point,
        topB: topFace[next],
        baseA: baseFace[index],
        baseB: baseFace[next],
      };
    });

    sideFaces
      .sort((left, right) => {
        const leftDepth = left.baseA.y + left.baseB.y;
        const rightDepth = right.baseA.y + right.baseB.y;
        return leftDepth - rightDepth;
      })
      .forEach((face, index) => {
        ctx.fillStyle = index % 2 === 0 ? '#94A3B8' : '#CBD5E1';
        ctx.beginPath();
        ctx.moveTo(face.baseA.x, face.baseA.y);
        ctx.lineTo(face.baseB.x, face.baseB.y);
        ctx.lineTo(face.topB.x, face.topB.y);
        ctx.lineTo(face.topA.x, face.topA.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

    const roofGradient = ctx.createLinearGradient(0, centerY - 120, width, centerY);
    roofGradient.addColorStop(0, '#60A5FA');
    roofGradient.addColorStop(1, '#1D4ED8');

    ctx.fillStyle = roofGradient;
    ctx.beginPath();
    topFace.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (topFace.length >= 4) {
      const windowRows = Math.max(2, Math.min(5, spatialBuilding?.levels || bedrooms));
      for (let row = 1; row <= windowRows; row += 1) {
        const left = baseFace[0];
        const right = baseFace[Math.floor(baseFace.length / 2)];
        const y = centerY - row * 22;
        ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
        ctx.fillRect(left.x + 20, y, 16, 16);
        ctx.fillRect(right.x - 34, y - 4, 14, 14);
      }
    }

    ctx.fillStyle = buildingAge > 20 ? '#DC2626' : buildingAge > 10 ? '#D97706' : '#16A34A';
    ctx.beginPath();
    ctx.arc(centerX, centerY - extrusionHeight - 26, 9, 0, Math.PI * 2);
    ctx.fill();

    setIsLoading(false);
  }, [bedrooms, buildingAge, propertyType, rotation, spatialBuilding]);

  const tagLabels = spatialBuilding
    ? [
        ...formatTag(spatialBuilding.tags),
        spatialBuilding.levels ? `${spatialBuilding.levels} levels` : null,
        spatialBuilding.areaSqM ? `${Math.round(spatialBuilding.areaSqM)} sqm footprint` : null,
      ].filter(Boolean)
    : [];

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    setRotation(Math.max(-0.8, Math.min(0.8, (x / rect.width) * 1.6 - 0.8)));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-lg">
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-3 text-white">
        <h3 className="font-bold text-sm">3D Building Model</h3>
        <p className="text-xs opacity-90">
          {spatialBuilding ? 'Extruded from mapped footprint' : 'Parametric massing view'}
        </p>
      </div>

      <div
        className="relative flex-1 cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="text-xs text-slate-600">Rendering model...</p>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div className="space-y-3 border-t bg-slate-50 p-3">
        <div className="flex flex-wrap gap-2">
          <div className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            {bedrooms} BR
          </div>
          <div className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
            {bathrooms} BA
          </div>
          {hasBalcony ? (
            <div className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
              Balcony
            </div>
          ) : null}
          {hasGarden ? (
            <div className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
              Garden
            </div>
          ) : null}
          <div
            className={`rounded px-2 py-1 text-xs font-semibold ${
              buildingAge > 20
                ? 'bg-red-100 text-red-700'
                : buildingAge > 10
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {buildingAge} yrs
          </div>
        </div>

        {tagLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tagLabels.map((tag) => (
              <div
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
              >
                {tag}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
