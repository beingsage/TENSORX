'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { SpatialSnapshot } from '@/api/lib/providers/openData';
import { LayerKey } from '@/api/lib/map/types';
import type {
  ConnectivityArc,
  DensityPoint,
  InfrastructurePoi,
  IsochroneRing,
  MapDataBundle,
  MetroStation,
  PoiDensityPoint,
  Position,
  RoadSegment,
  ValuePoint,
} from '@/api/lib/map/types';
import { buildLayers } from '@/api/lib/map/buildLayers';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  FALLBACK_ROADS,
} from '@/api/lib/providers/snapToRoad';
import {
  FALLBACK_AQI,
} from '@/api/lib/providers/aqi';
import {
  FALLBACK_METRO_STATIONS,
  FALLBACK_POIS,
  FALLBACK_INFRASTRUCTURE,
} from '@/api/lib/providers/nearbyPlaces';
import {
  FALLBACK_TRAFFIC,
} from '@/api/lib/providers/traffic';
import {
  FALLBACK_SPEED_LIMITS,
} from '@/api/lib/providers/speedLimits';
import {
  FALLBACK_ELEVATION,
} from '@/api/lib/providers/elevation';
import {
  FALLBACK_RISK_GRID,
} from '@/api/lib/providers/risk';
interface MapVisualizationProps {
  latitude: number;
  longitude: number;
  propertyType: string;
  address: string;
  spatialContext?: SpatialSnapshot;
  demandSignal?: number;
  liquidityIndex?: number;
  infrastructureNote?: string;
  insightText?: string;
  analysisMode?: boolean;
}

const OPEN_MAPLIBRE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_OLA_STYLE = 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json';
const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
} as const;
const FALLBACK_CONNECTIVITY: ConnectivityArc[] = [
  { source: [77.5946, 12.9716], target: [77.6101, 12.9352], travelMinutes: 18 },
  { source: [77.5946, 12.9716], target: [77.5667, 12.9141], travelMinutes: 25 },
  { source: [77.5946, 12.9716], target: [77.6245, 12.9784], travelMinutes: 14 },
];
const FALLBACK_ISOCHRONE: IsochroneRing[] = [
  { ring: 'close', color: [0, 100, 255, 180], points: [[77.5946, 12.9816], [77.6046, 12.9716], [77.5946, 12.9616], [77.5846, 12.9716], [77.5946, 12.9816]] },
  { ring: 'medium', color: [255, 165, 0, 180], points: [[77.5946, 13.0016], [77.6246, 12.9716], [77.5946, 12.9416], [77.5646, 12.9716], [77.5946, 13.0016]] },
  { ring: 'far', color: [255, 50, 0, 180], points: [[77.5946, 13.0316], [77.6546, 12.9716], [77.5946, 12.9116], [77.5346, 12.9716], [77.5946, 13.0316]] },
];
const DISABLE_DECK_OVERLAY_FOR_DEBUG = false;
const FORCE_RASTER_STYLE_FOR_DEBUG = false;
const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716];
const FALLBACK_ANCHOR: Position = [77.5946, 12.9716];

function offsetPosition(position: Position, center: Position): Position {
  const deltaLng = center[0] - FALLBACK_ANCHOR[0];
  const deltaLat = center[1] - FALLBACK_ANCHOR[1];
  return [position[0] + deltaLng, position[1] + deltaLat];
}

function localizeRoads(center: Position): RoadSegment[] {
  return FALLBACK_ROADS.map((segment) => ({
    ...segment,
    path: segment.path.map((point) => offsetPosition(point, center)),
  }));
}

function localizeConnectivity(center: Position): ConnectivityArc[] {
  return FALLBACK_CONNECTIVITY.map((arc) => ({
    ...arc,
    source: offsetPosition(arc.source, center),
    target: offsetPosition(arc.target, center),
  }));
}

function localizeIsochrone(center: Position): IsochroneRing[] {
  return FALLBACK_ISOCHRONE.map((ring) => ({
    ...ring,
    points: ring.points.map((point) => offsetPosition(point, center)),
  }));
}

function localizeMetro(center: Position): MetroStation[] {
  return FALLBACK_METRO_STATIONS.map((station) => ({
    ...station,
    position: offsetPosition(station.position, center),
  }));
}

function localizeInfrastructure(center: Position): InfrastructurePoi[] {
  return FALLBACK_INFRASTRUCTURE.map((poi) => ({
    ...poi,
    position: offsetPosition(poi.position, center),
  }));
}

function localizePoiDensity(center: Position): PoiDensityPoint[] {
  return FALLBACK_POIS.map((poi) => ({
    ...poi,
    position: offsetPosition(poi.position, center),
  }));
}

function localizeValue(center: Position): ValuePoint[] {
  const baseValue: ValuePoint[] = [
    { position: [77.6399, 12.9784], weight: 95 },
    { position: [77.5667, 12.9141], weight: 45 },
    { position: [77.7499, 12.9698], weight: 60 },
  ];
  return baseValue.map((point) => ({
    ...point,
    position: offsetPosition(point.position, center),
  }));
}

function localizeDensity(center: Position): DensityPoint[] {
  const baseDensity: DensityPoint[] = [
    { position: [77.5946, 12.9716], count: 850 },
    { position: [77.6399, 12.9784], count: 620 },
  ];
  return baseDensity.map((point) => ({
    ...point,
    position: offsetPosition(point.position, center),
  }));
}

function localizeTraffic(center: Position): any[] {
  return FALLBACK_TRAFFIC.map((segment) => ({
    ...segment,
    path: segment.path.map((point) => offsetPosition(point, center)),
  }));
}

function localizeSpeedLimits(center: Position): any[] {
  return FALLBACK_SPEED_LIMITS.map((segment) => ({
    ...segment,
    path: segment.path.map((point) => offsetPosition(point, center)),
  }));
}

function localizeFloodRisk(center: Position): any[] {
  return FALLBACK_ELEVATION.map((point) => {
    const floodScore = point.elevation < 900 ? 100 : point.elevation < 920 ? 50 : 0;
    return {
      position: offsetPosition(point.position, center),
      weight: floodScore,
    };
  });
}

function localizeRiskGrid(center: Position): any[] {
  return FALLBACK_RISK_GRID.map((point) => ({
    position: offsetPosition(point.position, center),
    score: point.score,
    floodComponent: point.floodComponent,
    legalComponent: point.legalComponent,
  }));
}

function isNearCenter(points: Position[], center: Position, maxDelta = 1.2): boolean {
  if (points.length === 0) return false;
  return points.some((point) => Math.abs(point[0] - center[0]) <= maxDelta && Math.abs(point[1] - center[1]) <= maxDelta);
}

function resolveCenter(longitude: number, latitude: number): [number, number] {
  const isLngValid = Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  const isLatValid = Number.isFinite(latitude) && Math.abs(latitude) <= 90;
  if (isLngValid && isLatValid) {
    return [longitude, latitude];
  }
  return DEFAULT_CENTER;
}

function resolveMapStyle() {
  const directStyle = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  if (directStyle) {
    return {
      url: directStyle,
      apiKey: null as string | null,
    };
  }

  const olaKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY?.trim();
  if (olaKey) {
    return {
      url: process.env.NEXT_PUBLIC_OLA_MAPS_STYLE_URL?.trim() || DEFAULT_OLA_STYLE,
      apiKey: olaKey,
    };
  }

  return {
    url: OPEN_MAPLIBRE_STYLE,
    apiKey: null as string | null,
  };
}

export function MapVisualization({
  latitude,
  longitude,
  spatialContext,
  analysisMode = false,
}: MapVisualizationProps) {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mapLoadedRef = useRef<boolean>(false);
  const isInitializing = useRef<boolean>(false);
  const styleCandidatesRef = useRef<Array<string | typeof OSM_RASTER_STYLE>>([]);
  const styleIndexRef = useRef<number>(0);

  const [debugMapState, setDebugMapState] = useState<{
    loaded: boolean;
    activeStyle: string;
    lastError: string | null;
    center: [number, number];
  }>({
    loaded: false,
    activeStyle: 'pending',
    lastError: null,
    center: DEFAULT_CENTER,
  });

  const [activeToggles, setActiveToggles] = useState<Set<LayerKey>>(
    new Set([LayerKey.BASE_MAP, LayerKey.ROADS, LayerKey.AQI])
  );

  const [data, setData] = useState<MapDataBundle>({});
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    title: string;
    lines: string[];
  } | null>(null);
  const AVAILABLE_LAYER_KEYS: LayerKey[] = [
    LayerKey.ROADS,
    LayerKey.TRAFFIC,
    LayerKey.SPEED_LIMIT,
    LayerKey.FLOOD,
    LayerKey.RISK,
    LayerKey.AQI,
    LayerKey.METRO,
    LayerKey.INFRASTRUCTURE,
    LayerKey.VALUE,
    LayerKey.DENSITY,
    LayerKey.CONNECTIVITY,
    LayerKey.ISOCHRONE,
    LayerKey.POI_DENSITY,
  ];

  // 1. Initial Data Fetching
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!isMounted) return;
      const center: Position = [longitude, latitude];
      const fallbackRoads = localizeRoads(center);
      const fallbackConnectivity = localizeConnectivity(center);
      const fallbackIsochrone = localizeIsochrone(center);
      const fallbackMetro = localizeMetro(center);
      const fallbackInfrastructure = localizeInfrastructure(center);
      const fallbackPoiDensity = localizePoiDensity(center);
      const fallbackValue = localizeValue(center);
      const fallbackDensity = localizeDensity(center);
      const fallbackTraffic = localizeTraffic(center);
      const fallbackSpeedLimits = localizeSpeedLimits(center);
      const fallbackFloodRisk = localizeFloodRisk(center);
      const fallbackRiskGrid = localizeRiskGrid(center);

      setData(prev => ({
        ...prev,
        roads: fallbackRoads,
        aqi: { ...FALLBACK_AQI, position: [longitude, latitude] as [number, number] },
        metroStations: fallbackMetro,
        infrastructure: fallbackInfrastructure,
        value: fallbackValue,
        density: fallbackDensity,
        connectivity: fallbackConnectivity,
        isochrone: fallbackIsochrone,
        poiDensity: fallbackPoiDensity,
        traffic: fallbackTraffic,
        speedLimits: fallbackSpeedLimits,
        floodRisk: fallbackFloodRisk,
        riskGrid: fallbackRiskGrid,
      }));

      try {
        const [roadsResult, connectivityResult, isochroneResult, metroResult, infrastructureResult, poiDensityResult, trafficResult, speedLimitsResult, floodRiskResult, riskResult] = await Promise.allSettled([
          fetch('/api/map/roads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
          fetch('/api/map/connectivity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude,
              longitude,
              destinations: spatialContext?.amenities?.slice(0, 5).map(a => ({ lat: a.point.lat, lng: a.point.lng }))
            }),
          }),
          fetch('/api/map/isochrone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
          fetch('/api/map/metro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
          fetch('/api/map/infrastructure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
          fetch('/api/map/poi-density', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
          fetch('/api/map/traffic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
          fetch('/api/map/speed-limits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
          fetch('/api/map/flood-risk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
          fetch('/api/map/risk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          }),
        ]);

        if (!isMounted) return;

        if (roadsResult.status === 'fulfilled' && roadsResult.value.ok) {
          const roadsPayload = (await roadsResult.value.json()) as { roads?: RoadSegment[] };
          if (Array.isArray(roadsPayload.roads) && roadsPayload.roads.length > 0) {
            const samplePoints = roadsPayload.roads.flatMap((segment) => segment.path).slice(0, 8);
            setData(prev => ({
              ...prev,
              roads: isNearCenter(samplePoints, center) ? roadsPayload.roads : fallbackRoads,
            }));
          }
        }

        if (connectivityResult.status === 'fulfilled' && connectivityResult.value.ok) {
          const connectivityPayload = (await connectivityResult.value.json()) as { connectivity?: ConnectivityArc[] };
          if (Array.isArray(connectivityPayload.connectivity) && connectivityPayload.connectivity.length > 0) {
            const samplePoints = connectivityPayload.connectivity.flatMap((arc) => [arc.source, arc.target]);
            setData(prev => ({
              ...prev,
              connectivity: isNearCenter(samplePoints, center) ? connectivityPayload.connectivity : fallbackConnectivity,
            }));
          }
        }

        if (isochroneResult.status === 'fulfilled' && isochroneResult.value.ok) {
          const isochronePayload = (await isochroneResult.value.json()) as { isochrone?: IsochroneRing[] };
          if (Array.isArray(isochronePayload.isochrone) && isochronePayload.isochrone.length > 0) {
            const samplePoints = isochronePayload.isochrone.flatMap((ring) => ring.points).slice(0, 12);
            setData(prev => ({
              ...prev,
              isochrone: isNearCenter(samplePoints, center) ? isochronePayload.isochrone : fallbackIsochrone,
            }));
          }
        }

        if (metroResult.status === 'fulfilled' && metroResult.value.ok) {
          const metroPayload = (await metroResult.value.json()) as { metroStations?: MetroStation[] };
          if (Array.isArray(metroPayload.metroStations) && metroPayload.metroStations.length > 0) {
            const samplePoints = metroPayload.metroStations.map((station) => station.position);
            setData(prev => ({
              ...prev,
              metroStations: isNearCenter(samplePoints, center) ? metroPayload.metroStations : fallbackMetro,
            }));
          }
        }

        if (infrastructureResult.status === 'fulfilled' && infrastructureResult.value.ok) {
          const infrastructurePayload = (await infrastructureResult.value.json()) as { infrastructure?: InfrastructurePoi[] };
          if (Array.isArray(infrastructurePayload.infrastructure) && infrastructurePayload.infrastructure.length > 0) {
            const samplePoints = infrastructurePayload.infrastructure.map((poi) => poi.position);
            setData(prev => ({
              ...prev,
              infrastructure: isNearCenter(samplePoints, center)
                ? infrastructurePayload.infrastructure
                : fallbackInfrastructure,
            }));
          }
        }

        if (poiDensityResult.status === 'fulfilled' && poiDensityResult.value.ok) {
          const poiPayload = (await poiDensityResult.value.json()) as { poiDensity?: PoiDensityPoint[] };
          if (Array.isArray(poiPayload.poiDensity) && poiPayload.poiDensity.length > 0) {
            const samplePoints = poiPayload.poiDensity.map((point) => point.position);
            setData(prev => ({
              ...prev,
              poiDensity: isNearCenter(samplePoints, center) ? poiPayload.poiDensity : fallbackPoiDensity,
            }));
          }
        }

        if (trafficResult.status === 'fulfilled' && trafficResult.value.ok) {
          const trafficPayload = (await trafficResult.value.json()) as { traffic?: any[] };
          if (Array.isArray(trafficPayload.traffic) && trafficPayload.traffic.length > 0) {
            const samplePoints = trafficPayload.traffic.flatMap((segment: any) => segment.path).slice(0, 8);
            setData(prev => ({
              ...prev,
              traffic: isNearCenter(samplePoints, center) ? trafficPayload.traffic : fallbackTraffic,
            }));
          }
        }

        if (speedLimitsResult.status === 'fulfilled' && speedLimitsResult.value.ok) {
          const speedLimitsPayload = (await speedLimitsResult.value.json()) as { speedLimits?: any[] };
          if (Array.isArray(speedLimitsPayload.speedLimits) && speedLimitsPayload.speedLimits.length > 0) {
            const samplePoints = speedLimitsPayload.speedLimits.flatMap((segment: any) => segment.path).slice(0, 8);
            setData(prev => ({
              ...prev,
              speedLimits: isNearCenter(samplePoints, center) ? speedLimitsPayload.speedLimits : fallbackSpeedLimits,
            }));
          }
        }

        if (floodRiskResult.status === 'fulfilled' && floodRiskResult.value.ok) {
          const floodRiskPayload = (await floodRiskResult.value.json()) as { floodRisk?: any[] };
          if (Array.isArray(floodRiskPayload.floodRisk) && floodRiskPayload.floodRisk.length > 0) {
            const samplePoints = floodRiskPayload.floodRisk.map((point: any) => point.position);
            setData(prev => ({
              ...prev,
              floodRisk: isNearCenter(samplePoints, center) ? floodRiskPayload.floodRisk : fallbackFloodRisk,
            }));
          }
        }

        if (riskResult.status === 'fulfilled' && riskResult.value.ok) {
          const riskPayload = (await riskResult.value.json()) as { riskGrid?: any[] };
          if (Array.isArray(riskPayload.riskGrid) && riskPayload.riskGrid.length > 0) {
            const samplePoints = riskPayload.riskGrid.map((point: any) => point.position);
            setData(prev => ({
              ...prev,
              riskGrid: isNearCenter(samplePoints, center) ? riskPayload.riskGrid : fallbackRiskGrid,
            }));
          }
        }
      } catch {
        // fallbacks remain active
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [latitude, longitude]);

  // 2. Map Initialization (Exactly once)
  useEffect(() => {
    // Check our new synchronous lock in addition to the mapRef
    if (mapRef.current || !mapNodeRef.current || isInitializing.current) return;

    let aborted = false;
    isInitializing.current = true; // Lock initialization immediately

    async function initMap() {
      try {
        // Safely handle ESM/CJS interop for dynamic imports
        const maplibreModule = await import('maplibre-gl');
        const maplibregl = maplibreModule.default || maplibreModule;
        const { MapboxOverlay } = await import('@deck.gl/mapbox');

        if (aborted) return;

        const styleConfig = resolveMapStyle();
        const olaKey = styleConfig.apiKey;
        const center = resolveCenter(longitude, latitude);
        const styleCandidates: Array<string | typeof OSM_RASTER_STYLE> = FORCE_RASTER_STYLE_FOR_DEBUG
          ? [OSM_RASTER_STYLE]
          : [styleConfig.url, OPEN_MAPLIBRE_STYLE, OSM_RASTER_STYLE];
        styleCandidatesRef.current = styleCandidates;
        styleIndexRef.current = 0;
        setDebugMapState((previous) => ({
          ...previous,
          activeStyle: typeof styleCandidates[0] === 'string' ? styleCandidates[0] : 'inline-osm-raster-style',
          lastError: null,
          center,
        }));

        mapRef.current = new maplibregl.Map({
          container: mapNodeRef.current!,
          style: styleCandidates[0] as any,
          center,
          zoom: analysisMode ? 14.5 : 15,
          pitch: 48,
          bearing: -12,
          attributionControl: false,
          transformRequest: (url) => {
            if (olaKey && url.includes('api.olamaps.io') && !url.includes('api_key=')) {
              const separator = url.includes('?') ? '&' : '?';
              return { url: `${url}${separator}api_key=${olaKey}` };
            }
            return { url };
          },
        });

        if (!resizeObserverRef.current && typeof ResizeObserver !== 'undefined' && mapNodeRef.current) {
          resizeObserverRef.current = new ResizeObserver(() => {
            mapRef.current?.resize();
          });
          resizeObserverRef.current.observe(mapNodeRef.current);
        }

        const attachOverlay = () => {
          if (DISABLE_DECK_OVERLAY_FOR_DEBUG) return;
          if (!mapRef.current || overlayRef.current) return;
          overlayRef.current = new MapboxOverlay({
            interleaved: true,
            layers: buildLayers(activeToggles, data),
            pickingRadius: 8,
            onHover: (info: { x: number; y: number; object?: unknown; layer: { id: string } | null }) => {
              const details = describeHoverObject(
                info.layer?.id,
                info.object && typeof info.object === 'object' ? (info.object as Record<string, unknown>) : null
              );
              if (!details) {
                setHoverInfo(null);
                return;
              }
              setHoverInfo({
                x: info.x,
                y: info.y,
                title: details.title,
                lines: details.lines,
              });
            },
          });
          mapRef.current.addControl(overlayRef.current as any);
        };

        const ensure3DBuildings = () => {
          if (!mapRef.current) return;
          const map = mapRef.current;
          const currentStyle = map.getStyle?.();
          if (!currentStyle?.layers || !currentStyle?.sources) return;

          if (currentStyle.layers.some((layer: { type?: string }) => layer.type === 'fill-extrusion')) {
            return;
          }

          const sourceEntries = Object.entries(currentStyle.sources) as Array<[string, { type?: string }]>;
          const vectorSourceId = sourceEntries.find(([, source]) => source?.type === 'vector')?.[0];
          if (!vectorSourceId || map.getLayer('map-3d-buildings')) return;

          const labelLayerId =
            currentStyle.layers.find(
              (layer: { id: string; type?: string; layout?: Record<string, unknown> }) =>
                layer.type === 'symbol' && Boolean(layer.layout?.['text-field'])
            )?.id || undefined;

          try {
            map.addLayer(
              {
                id: 'map-3d-buildings',
                type: 'fill-extrusion',
                source: vectorSourceId,
                'source-layer': 'building',
                minzoom: 14,
                paint: {
                  'fill-extrusion-color': '#9ca3af',
                  'fill-extrusion-opacity': 0.65,
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    14,
                    0,
                    15,
                    ['coalesce', ['get', 'render_height'], ['get', 'height'], 20],
                  ],
                  'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
                },
              },
              labelLayerId
            );
          } catch {
            // Some styles may not expose a compatible building source-layer.
          }
        };

        if (DISABLE_DECK_OVERLAY_FOR_DEBUG && mapRef.current && overlayRef.current) {
          try {
            mapRef.current.removeControl(overlayRef.current as any);
          } catch {
            // ignore detach issues in debug mode
          }
          overlayRef.current = null;
        }

        if (mapRef.current.loaded()) {
          mapLoadedRef.current = true;
          const mapContainer = mapRef.current.getContainer?.() as HTMLElement | undefined;
          const canvas = mapContainer?.querySelector('canvas') as HTMLCanvasElement | null;
          if (mapContainer) {
            mapContainer.style.opacity = '1';
            mapContainer.style.visibility = 'visible';
            mapContainer.style.display = 'block';
            mapContainer.style.zIndex = '1';
          }
          if (canvas) {
            canvas.style.opacity = '1';
            canvas.style.visibility = 'visible';
            canvas.style.display = 'block';
            canvas.style.filter = 'none';
            canvas.style.mixBlendMode = 'normal';
          }
          mapRef.current.resize();
          ensure3DBuildings();
          setDebugMapState((previous) => ({ ...previous, loaded: true }));
          attachOverlay();
        } else {
          mapRef.current.once('load', () => {
            mapLoadedRef.current = true;
            const mapContainer = mapRef.current?.getContainer?.() as HTMLElement | undefined;
            const canvas = mapContainer?.querySelector('canvas') as HTMLCanvasElement | null;
            if (mapContainer) {
              mapContainer.style.opacity = '1';
              mapContainer.style.visibility = 'visible';
              mapContainer.style.display = 'block';
              mapContainer.style.zIndex = '1';
            }
            if (canvas) {
              canvas.style.opacity = '1';
              canvas.style.visibility = 'visible';
              canvas.style.display = 'block';
              canvas.style.filter = 'none';
              canvas.style.mixBlendMode = 'normal';
            }
            mapRef.current?.resize();
            ensure3DBuildings();
            setDebugMapState((previous) => ({ ...previous, loaded: true }));
            attachOverlay();
          });
        }

        mapRef.current.on('styledata', () => {
          if (!mapRef.current) return;
          mapRef.current.resize();
          if (mapRef.current.loaded()) {
            mapLoadedRef.current = true;
            ensure3DBuildings();
            attachOverlay();
          }
        });

        mapRef.current.on('error', (event: { error?: Error }) => {
          const message = event.error?.message || '';
          setDebugMapState((previous) => ({ ...previous, lastError: message || 'Map error with no message' }));
          if (
            mapRef.current &&
            styleIndexRef.current < styleCandidatesRef.current.length - 1 &&
            (message.includes('api.olamaps.io') ||
              message.includes('tiles.openfreemap.org') ||
              message.includes('demotiles.maplibre.org') ||
              message.toLowerCase().includes('401') ||
              message.toLowerCase().includes('403') ||
              message.toLowerCase().includes('failed to load'))
          ) {
            styleIndexRef.current += 1;
            const nextStyle = styleCandidatesRef.current[styleIndexRef.current];
            if (nextStyle) {
              setDebugMapState((previous) => ({
                ...previous,
                activeStyle: typeof nextStyle === 'string' ? nextStyle : 'inline-osm-raster-style',
                loaded: false,
              }));
              mapRef.current.setStyle(nextStyle as any);
            }
          }
        });
      } finally {
        // Ensure the lock is released only if the component unmounted during setup
        if (aborted) {
          isInitializing.current = false;
        }
      }
    }

    initMap();

    return () => {
      aborted = true;
      isInitializing.current = false; // Release lock on cleanup

      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      mapLoadedRef.current = false;
      overlayRef.current = null;
    };
  }, [analysisMode, latitude, longitude]);

  // 3. Layer Updates — trigger when map loads AND when data/toggles change
  useEffect(() => {
    if (!overlayRef.current) return;

    const applyLayers = () => {
      overlayRef.current?.setProps({
        layers: buildLayers(activeToggles, data),
        pickingRadius: 8,
        onHover: (info: { x: number; y: number; object?: unknown; layer: { id: string } | null }) => {
          const details = describeHoverObject(
            info.layer?.id,
            info.object && typeof info.object === 'object' ? (info.object as Record<string, unknown>) : null
          );
          if (!details) {
            setHoverInfo(null);
            return;
          }
          setHoverInfo({
            x: info.x,
            y: info.y,
            title: details.title,
            lines: details.lines,
          });
        },
      });
    };

    if (mapLoadedRef.current) {
      applyLayers();
    } else if (mapRef.current) {
      const map = mapRef.current;
      map.once('load', applyLayers);
      return () => map.off('load', applyLayers);
    }
  }, [activeToggles, data]);

  const toggleLayer = (layer: LayerKey) => {
    setActiveToggles(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const describeHoverObject = (
    layerId: string | undefined,
    object: Record<string, unknown> | null
  ): { title: string; lines: string[] } | null => {
    if (!layerId || !object) return null;

    if (layerId === 'roads-layer') {
      const width = typeof object.width === 'number' ? object.width : 2;
      return { title: 'Road Segment', lines: [`Width: ${width}px`] };
    }

    if (layerId === 'aqi-layer') {
      const aqi = typeof object.aqi === 'number' ? object.aqi : null;
      return { title: 'Air Quality', lines: [aqi ? `AQI: ${aqi}` : 'AQI data point'] };
    }

    if (layerId === 'traffic-layer') {
      const congestion = typeof object.congestion === 'number' ? object.congestion : null;
      const congestionLabel = congestion ? 
        (congestion < 1.2 ? 'Free flow' : congestion < 1.6 ? 'Moderate' : 'Heavy congestion')
        : 'Traffic data';
      return { title: 'Road Congestion', lines: [congestionLabel, congestion ? `Ratio: ${congestion.toFixed(2)}x` : ''] };
    }

    if (layerId === 'speed-limit-layer') {
      const speedKmh = typeof object.speedKmh === 'number' ? object.speedKmh : null;
      const speedLabel = speedKmh ? 
        (speedKmh <= 30 ? 'Restricted' : speedKmh <= 60 ? 'Urban' : speedKmh <= 90 ? 'Standard' : 'Highway')
        : 'Speed data';
      return { title: 'Speed Limit', lines: [speedLabel, speedKmh ? `${speedKmh} km/h` : ''] };
    }

    if (layerId === 'flood-risk-layer') {
      const weight = typeof object.weight === 'number' ? object.weight : null;
      const riskLabel = weight ? 
        (weight > 60 ? 'High flood risk' : weight > 30 ? 'Medium risk' : 'Low risk')
        : 'Flood data';
      return { title: 'Flood Risk', lines: [riskLabel, weight ? `Score: ${Math.round(weight)}` : ''] };
    }

    if (layerId === 'risk-layer') {
      const score = typeof object.score === 'number' ? object.score : null;
      const flood = typeof object.floodComponent === 'number' ? object.floodComponent : null;
      const legal = typeof object.legalComponent === 'number' ? object.legalComponent : null;
      const riskLabel = score ? 
        (score > 75 ? 'High combined risk' : score > 50 ? 'Medium risk' : 'Low risk')
        : 'Risk data';
      return { 
        title: 'Combined Risk',
        lines: [
          riskLabel,
          score ? `Overall: ${Math.round(score)}` : '',
          flood ? `Flood: ${Math.round(flood)}` : '',
          legal ? `Legal: ${Math.round(legal)}` : '',
        ]
      };
    }

    if (layerId === 'metro-layer') {
      return { title: 'Metro Influence', lines: ['Proximity contour'] };
    }

    if (layerId === 'infrastructure-layer') {
      const name = typeof object.name === 'string' ? object.name : 'Infrastructure';
      const type = typeof object.type === 'string' ? object.type : 'poi';
      return { title: name, lines: [`Type: ${type}`] };
    }

    if (layerId === 'value-layer') {
      const weight = typeof object.weight === 'number' ? object.weight : null;
      return { title: 'Property Value', lines: [weight ? `Score: ${weight}` : 'Heat point'] };
    }

    if (layerId === 'density-layer') {
      const count = typeof object.count === 'number' ? object.count : null;
      return { title: 'Density', lines: [count ? `Count: ${count}` : 'Density bin'] };
    }

    if (layerId === 'connectivity-arc-layer' || layerId === 'connectivity-route-layer') {
      const minutes = typeof object.travelMinutes === 'number' ? object.travelMinutes : null;
      return { title: 'Connectivity', lines: [minutes ? `Travel: ${minutes} min` : 'Route segment'] };
    }

    if (layerId === 'isochrone-ring-paths') {
      const ring = typeof object.ring === 'string' ? object.ring : 'travel-time ring';
      return { title: 'Travel Time Reach', lines: [`Ring: ${ring}`] };
    }

    if (layerId === 'poi-density-layer') {
      const type = typeof object.type === 'string' ? object.type : 'poi';
      const weight = typeof object.weight === 'number' ? object.weight : null;
      return { title: 'POI Density', lines: [weight ? `${type} (weight ${weight})` : type] };
    }

    return null;
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* 
        Note: The wrapper here has flex-1 and a min-height. Ensure the 
        component importing <MapVisualization /> also has a defined height 
        so `h-full` does not collapse to 0px. 
      */}
      <div
        className="flex-1 relative rounded-xl overflow-hidden border border-slate-300"
        style={{ minHeight: 400, background: '#1a1a1a' }}
      >
        <div ref={mapNodeRef} className="h-full w-full min-h-[400px]" />
        {hoverInfo ? (
          <div
            className="pointer-events-none absolute z-20 rounded bg-black/80 px-2 py-1 text-[11px] text-white"
            style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12, maxWidth: 220 }}
          >
            <div className="font-semibold">{hoverInfo.title}</div>
            {hoverInfo.lines.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
        ) : null}
        <div className="absolute left-2 top-2 z-10 rounded bg-black/70 px-2 py-1 text-[10px] text-white">
          <div>loaded: {String(debugMapState.loaded)}</div>
          <div>style: {debugMapState.activeStyle}</div>
          <div>error: {debugMapState.lastError || 'none'}</div>
          <div>center: {debugMapState.center[0].toFixed(4)}, {debugMapState.center[1].toFixed(4)}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {AVAILABLE_LAYER_KEYS.map(key => (
          <button
            key={key}
            onClick={() => toggleLayer(key as LayerKey)}
            className={`px-3 py-1 rounded text-sm ${activeToggles.has(key as LayerKey)
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 text-slate-700'
              }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}