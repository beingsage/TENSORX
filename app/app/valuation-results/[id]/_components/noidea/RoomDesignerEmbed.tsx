'use client';

import { Suspense, useEffect, useRef, useState } from 'react';

interface PropertyDetails {
  propertyId: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  buildingAge: number;
  hasBalcony: boolean;
  hasGarden: boolean;
  address: string;
}

interface RoomDesignerEmbedProps {
  floorPlanImage: string;
  propertyDetails: PropertyDetails;
}

// Simple floor plan renderer component
function FloorPlanRenderer({ floorPlanImage, propertyDetails }: RoomDesignerEmbedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#050b08';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#09130d';
      ctx.fillRect(20, 24, width - 40, height - 48);

      const viewportX = 36;
      const viewportY = 78;
      const viewportWidth = width - 72;
      const viewportHeight = height - 164;

      const imageAspect = img.width / img.height;
      const viewportAspect = viewportWidth / viewportHeight;

      let drawWidth = viewportWidth;
      let drawHeight = viewportHeight;
      let offsetX = viewportX;
      let offsetY = viewportY;

      if (imageAspect > viewportAspect) {
        drawHeight = drawWidth / imageAspect;
        offsetY = viewportY + (viewportHeight - drawHeight) / 2;
      } else {
        drawWidth = drawHeight * imageAspect;
        offsetX = viewportX + (viewportWidth - drawWidth) / 2;
      }

      ctx.fillStyle = '#edf3ea';
      ctx.fillRect(offsetX - 8, offsetY - 8, drawWidth + 16, drawHeight + 16);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      ctx.fillStyle = 'rgba(6, 12, 8, 0.84)';
      ctx.fillRect(20, 24, width - 40, 40);
      ctx.fillStyle = '#f3f8f1';
      ctx.font = '600 15px system-ui';
      ctx.fillText(propertyDetails.address, 32, 49);

      ctx.font = '12px system-ui';
      ctx.fillStyle = 'rgba(218, 233, 214, 0.84)';
      ctx.fillText(
        `${propertyDetails.bedrooms}BR • ${propertyDetails.bathrooms}BA • ${propertyDetails.propertyType}`,
        32,
        108
      );

      ctx.fillStyle = 'rgba(6, 12, 8, 0.84)';
      ctx.fillRect(20, height - 68, width - 40, 44);
      ctx.fillStyle = '#f3f8f1';
      ctx.fillText(`Age ${propertyDetails.buildingAge}y`, 32, height - 42);
      ctx.fillStyle = 'rgba(218, 233, 214, 0.84)';
      ctx.fillText(
        `Features: ${propertyDetails.hasBalcony ? 'Balcony' : 'No balcony'}${propertyDetails.hasGarden ? ' • Garden' : ''}`,
        32,
        height - 26
      );
    };

    img.onload = draw;
    img.src = floorPlanImage;

    const resizeObserver = new ResizeObserver(() => {
      if (img.complete) draw();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [floorPlanImage, propertyDetails]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

function Scene3D({ floorPlanImage, propertyDetails }: RoomDesignerEmbedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const planImage = new Image();
    planImage.crossOrigin = 'anonymous';

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, '#09120d');
      background.addColorStop(1, '#040906');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(117, 255, 178, 0.06)';
      ctx.beginPath();
      ctx.ellipse(width * 0.72, height * 0.16, width * 0.32, height * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      const centerX = width / 2;
      const centerY = height * 0.62;
      const roomWidth = Math.min(width * 0.34 + propertyDetails.bedrooms * 10, width * 0.42);
      const roomDepth = Math.min(width * 0.18 + propertyDetails.bathrooms * 12, width * 0.28);
      const roomHeight = Math.min(height * 0.26 + propertyDetails.buildingAge * 0.8, height * 0.34);

      const floor = [
        { x: centerX - roomWidth, y: centerY },
        { x: centerX + roomWidth, y: centerY },
        { x: centerX + roomWidth + roomDepth, y: centerY - roomDepth * 0.46 },
        { x: centerX - roomWidth + roomDepth, y: centerY - roomDepth * 0.46 },
      ];

      const top = floor.map((point) => ({ x: point.x, y: point.y - roomHeight }));

      const drawPolygon = (
        points: Array<{ x: number; y: number }>,
        fillStyle: string,
        strokeStyle: string
      ) => {
        ctx.beginPath();
        points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      };

      drawPolygon([floor[0], floor[1], top[1], top[0]], '#d9d3c8', 'rgba(81, 93, 84, 0.55)');
      drawPolygon([floor[1], floor[2], top[2], top[1]], '#c5beb1', 'rgba(81, 93, 84, 0.55)');
      drawPolygon(top, '#ede7dd', 'rgba(81, 93, 84, 0.55)');
      drawPolygon(floor, '#18231d', 'rgba(81, 93, 84, 0.45)');

      ctx.fillStyle = '#52695d';
      ctx.fillRect(centerX - 44, centerY - 52, 88, 36);
      ctx.fillRect(centerX - 12, centerY - 76, 24, 24);
      ctx.fillStyle = '#7f8f84';
      ctx.fillRect(centerX + 76, centerY - 72, 54, 26);
      ctx.fillRect(centerX - 132, centerY - 102, 60, 30);

      if (propertyDetails.hasBalcony) {
        ctx.strokeStyle = '#6bcf8f';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX + roomWidth - 24, centerY - 112, 36, 48);
      }

      if (propertyDetails.hasGarden) {
        ctx.fillStyle = '#1b5c33';
        ctx.beginPath();
        ctx.ellipse(centerX - roomWidth - 28, centerY + 12, 52, 18, -0.16, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(6, 12, 8, 0.88)';
      ctx.fillRect(24, 24, width - 48, 42);
      ctx.fillStyle = '#f3f8f1';
      ctx.font = '600 15px system-ui';
      ctx.fillText(propertyDetails.address, 36, 50);

      ctx.font = '12px system-ui';
      ctx.fillStyle = 'rgba(218, 233, 214, 0.84)';
      ctx.fillText(
        `${propertyDetails.bedrooms}BR • ${propertyDetails.bathrooms}BA • ${propertyDetails.propertyType}`,
        36,
        90
      );
      ctx.fillText(
        propertyDetails.hasBalcony
          ? 'Balcony line retained in mock volume'
          : 'Interior massing from property assumptions',
        36,
        108
      );

      if (planImage.complete && planImage.naturalWidth > 0) {
        const thumbWidth = 112;
        const thumbHeight = 84;
        const thumbX = width - thumbWidth - 28;
        const thumbY = height - thumbHeight - 28;
        ctx.fillStyle = '#edf3ea';
        ctx.fillRect(thumbX - 6, thumbY - 6, thumbWidth + 12, thumbHeight + 12);
        ctx.drawImage(planImage, thumbX, thumbY, thumbWidth, thumbHeight);
        ctx.fillStyle = 'rgba(6, 12, 8, 0.84)';
        ctx.fillRect(thumbX - 6, thumbY - 30, thumbWidth + 12, 22);
        ctx.fillStyle = '#f3f8f1';
        ctx.fillText('Source plan', thumbX + 10, thumbY - 14);
      }
    };

    planImage.onload = draw;
    planImage.src = floorPlanImage;

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [floorPlanImage, propertyDetails]);

  return (
    <Suspense fallback={null}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </Suspense>
  );
}

export function RoomDesignerEmbed({
  floorPlanImage,
  propertyDetails,
}: RoomDesignerEmbedProps) {
  const [view, setView] = useState<'2d' | '3d'>('2d');

  return (
    <div className="flex h-full w-full flex-col bg-[#07100b]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#09130d] px-3 py-2.5">
        <div className="flex gap-2">
          <button
            onClick={() => setView('2d')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
              view === '2d'
                ? 'bg-emerald-300 text-[#041008]'
                : 'bg-white/[0.06] text-[#c8d6c5] hover:bg-white/[0.1]'
            }`}
          >
            Plan review
          </button>
          <button
            onClick={() => setView('3d')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
              view === '3d'
                ? 'bg-emerald-300 text-[#041008]'
                : 'bg-white/[0.06] text-[#c8d6c5] hover:bg-white/[0.1]'
            }`}
          >
            Spatial massing
          </button>
        </div>

        <div className="text-[11px] uppercase tracking-[0.16em] text-[#9fb29d]">
          {propertyDetails.bedrooms}BR • {propertyDetails.bathrooms}BA • {propertyDetails.propertyType}
        </div>
      </div>

      <div className="border-b border-white/10 bg-black/15 px-3 py-2 text-xs text-[#a6b9a3]">
        {view === '2d'
          ? 'Floor plan evidence with valuation context overlay.'
          : 'Simplified 3D massing view for interior proportion review.'}
      </div>

      <div className="flex-1 overflow-hidden">
        {view === '2d' ? (
          <FloorPlanRenderer floorPlanImage={floorPlanImage} propertyDetails={propertyDetails} />
        ) : (
          <Scene3D floorPlanImage={floorPlanImage} propertyDetails={propertyDetails} />
        )}
      </div>
    </div>
  );
}
