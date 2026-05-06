'use client';

import { useEffect, useRef } from 'react';
import type { SpatialSnapshot } from '@/lib/providers/openData';

interface IntakeMapPreviewProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  displayName?: string;
  previewStatus: 'idle' | 'loading' | 'ready' | 'error';
  previewMessage?: string | null;
  spatialContext?: SpatialSnapshot | null;
}

function resolveLeafletTileLayer() {
  const olaKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY?.trim();

  if (olaKey) {
    return {
      url: `https://api.olamaps.io/tiles/v1/styles/default-light-standard/{z}/{x}/{y}.png?api_key=${olaKey}`,
      attribution: 'Ola Maps',
    };
  }

  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap contributors',
  };
}

export function IntakeMapPreview({
  latitude,
  longitude,
  address,
  city,
  state,
  pincode,
  displayName,
  previewStatus,
  previewMessage,
  spatialContext,
}: IntakeMapPreviewProps) {
  const mapNodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (latitude === undefined || longitude === undefined || !mapNodeRef.current) {
      return;
    }

    const centerLat = latitude;
    const centerLng = longitude;
    let destroyed = false;
    let map: any = null;

    async function mount() {
      const leaflet = await import('leaflet');
      if (destroyed || !mapNodeRef.current) {
        return;
      }

      const tileLayer = resolveLeafletTileLayer();
      map = leaflet.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      leaflet.tileLayer(tileLayer.url, {
        maxZoom: 20,
        attribution: tileLayer.attribution,
      }).addTo(map);

      const subjectBuilding = spatialContext?.subjectBuilding;

      if (subjectBuilding?.footprint?.length) {
        const polygon = leaflet.polygon(
          subjectBuilding.footprint.map((point) => [point.lat, point.lng]),
          {
            color: '#2563EB',
            weight: 2,
            fillColor: '#60A5FA',
            fillOpacity: 0.32,
          }
        );
        polygon.addTo(map);
        map.fitBounds(polygon.getBounds(), { padding: [24, 24] });
      } else {
        leaflet
          .circleMarker([centerLat, centerLng], {
            radius: 9,
            color: '#0F172A',
            fillColor: '#38BDF8',
            fillOpacity: 0.92,
            weight: 2,
          })
          .addTo(map);
        map.setView([centerLat, centerLng], 16);
      }

      (spatialContext?.amenities || []).slice(0, 8).forEach((amenity) => {
        leaflet
          .circleMarker([amenity.point.lat, amenity.point.lng], {
            radius: amenity.kind === 'metro' ? 5 : 4,
            color: amenity.kind === 'metro' ? '#7C3AED' : '#334155',
            fillColor: amenity.kind === 'metro' ? '#A78BFA' : '#E2E8F0',
            fillOpacity: 0.9,
            weight: 1.5,
          })
          .bindTooltip(amenity.name, { direction: 'top' })
          .addTo(map);
      });
    }

    mount();

    return () => {
      destroyed = true;
      if (map) {
        map.remove();
      }
    };
  }, [latitude, longitude, spatialContext]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Geo Preview</p>
        <p className="mt-2 text-xs leading-5 text-white/45">
          Latitude and longitude drive the preview. Address and pincode autofill are sourced from live reverse or forward geocoding.
        </p>
      </div>

      <div className="p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Coordinates</p>
            <p className="mt-2 text-sm font-medium text-white">
              {latitude !== undefined && longitude !== undefined
                ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                : 'Waiting for geocode'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Status</p>
            <p className="mt-2 text-sm font-medium capitalize text-white">
              {previewStatus}
            </p>
            {previewMessage ? (
              <p className="mt-1 text-xs text-white/55">{previewMessage}</p>
            ) : null}
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white/75">
          <p className="font-medium text-white">{displayName || address || 'Property preview'}</p>
          <p className="mt-1">
            {[city, state, pincode].filter(Boolean).join(', ') || 'Address details will appear here.'}
          </p>
        </div>

        {latitude !== undefined && longitude !== undefined ? (
          <div
            ref={mapNodeRef}
            className="h-[360px] overflow-hidden rounded-[24px] border border-white/10"
          />
        ) : (
          <div className="flex h-[360px] items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-slate-950/25 px-6 text-center text-sm text-white/55">
            Enter an address and pincode, or provide latitude and longitude, to load the preview map.
          </div>
        )}
      </div>
    </div>
  );
}
