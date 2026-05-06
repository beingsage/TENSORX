'use client';

import { useEffect, useRef } from 'react';
import type { SpatialAmenity, SpatialBuilding } from '@/lib/providers/openData';

interface ParcelLeafletMapProps {
  center: { lat: number; lng: number };
  subjectBuilding: SpatialBuilding | null;
  amenities: SpatialAmenity[];
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

export function ParcelLeafletMap({
  center,
  subjectBuilding,
  amenities,
}: ParcelLeafletMapProps) {
  const mapNodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let map: any = null;

    async function mount() {
      if (!mapNodeRef.current) return;

      const leaflet = await import('leaflet');
      if (destroyed || !mapNodeRef.current) return;

      const tileLayerConfig = resolveLeafletTileLayer();

      map = leaflet.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      leaflet
        .tileLayer(tileLayerConfig.url, {
          maxZoom: 20,
          attribution: tileLayerConfig.attribution,
        })
        .addTo(map);

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
        map.fitBounds(polygon.getBounds(), {
          padding: [18, 18],
        });
      } else {
        leaflet
          .circleMarker([center.lat, center.lng], {
            radius: 7,
            color: '#2563EB',
            fillColor: '#60A5FA',
            fillOpacity: 0.92,
          })
          .addTo(map);
        map.setView([center.lat, center.lng], 17);
      }

      amenities.slice(0, 5).forEach((amenity) => {
        leaflet
          .circleMarker([amenity.point.lat, amenity.point.lng], {
            radius: amenity.kind === 'metro' ? 6 : 4,
            color: amenity.kind === 'metro' ? '#7C3AED' : '#0F172A',
            fillColor: amenity.kind === 'metro' ? '#A855F7' : '#E2E8F0',
            fillOpacity: 0.9,
            weight: 1.5,
          })
          .bindTooltip(amenity.name, {
            direction: 'top',
            opacity: 0.95,
          })
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
  }, [amenities, center.lat, center.lng, subjectBuilding]);

  return (
    <div className="bg-[#071008] p-4 text-[#edf9eb]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Leaflet parcel view</p>
          <p className="text-xs text-[#9fb29d]">
            Subject footprint with immediate amenity markers
          </p>
        </div>
        <div className="bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
          Leaflet
        </div>
      </div>
      <div
        ref={mapNodeRef}
        className="mt-4 h-[240px] overflow-hidden border border-[#27cf6c]/25"
      />
    </div>
  );
}
