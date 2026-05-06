'use client';

import { useEffect, useRef } from 'react';

interface MapProps {
  latitude: number;
  longitude: number;
  propertyName: string;
  zoom?: number;
}

function resolveTileLayer() {
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

export default function GeospatialMap({
  latitude,
  longitude,
  propertyName,
  zoom = 15,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let map: any = null;

    async function mount() {
      if (!mapRef.current) return;

      const leaflet = await import('leaflet');
      if (destroyed || !mapRef.current) return;

      const tileLayer = resolveTileLayer();

      map = leaflet.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      });

      leaflet
        .tileLayer(tileLayer.url, {
          maxZoom: 20,
          attribution: tileLayer.attribution,
        })
        .addTo(map);

      map.setView([latitude, longitude], zoom);

      leaflet
        .circleMarker([latitude, longitude], {
          radius: 7,
          color: '#2563EB',
          fillColor: '#38BDF8',
          fillOpacity: 0.92,
          weight: 2,
        })
        .bindTooltip(propertyName, {
          permanent: false,
          direction: 'top',
        })
        .addTo(map);

      [
        { radius: 500, color: '#16A34A' },
        { radius: 1000, color: '#2563EB' },
        { radius: 2000, color: '#F59E0B' },
      ].forEach((ring) => {
        leaflet
          .circle([latitude, longitude], {
            radius: ring.radius,
            color: ring.color,
            fillOpacity: 0,
            dashArray: '6 6',
            weight: 1.5,
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
  }, [latitude, longitude, propertyName, zoom]);

  return (
    <div className="w-full rounded-lg border bg-white p-4 shadow-md">
      <h3 className="mb-4 text-lg font-semibold">Property Location</h3>
      <div
        ref={mapRef}
        className="h-80 w-full overflow-hidden rounded border bg-slate-50"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}
