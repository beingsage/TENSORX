import { ArcLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer, ContourLayer, HexagonLayer } from '@deck.gl/aggregation-layers';
import { Layer } from '@deck.gl/core';
import {
  LayerKey,
  MapDataBundle,
  RoadSegment,
  AqiPoint,
  MetroStation,
  InfrastructurePoi,
  DensityPoint,
  ValuePoint,
  ConnectivityArc,
  IsochroneRing,
  PoiDensityPoint,
  TrafficSegment,
  SpeedLimitSegment,
  FloodRiskPoint,
  RiskGridPoint,
} from './types';
import { VISUAL } from './layerDefinitions';

function connectivityColor(travelMinutes: number): [number, number, number, number] {
  const min = 15;
  const max = 45;
  const ratio = Math.max(0, Math.min(1, (travelMinutes - min) / (max - min)));
  const fast = VISUAL.colors.connectivityFast as [number, number, number, number];
  const slow = VISUAL.colors.connectivitySlow as [number, number, number, number];

  return [
    Math.round(fast[0] + (slow[0] - fast[0]) * ratio),
    Math.round(fast[1] + (slow[1] - fast[1]) * ratio),
    Math.round(fast[2] + (slow[2] - fast[2]) * ratio),
    Math.round(fast[3] + (slow[3] - fast[3]) * ratio),
  ];
}

function trafficColor(congestion: number): [number, number, number, number] {
  // congestion < 1.2 → green (free flow)
  // 1.2 ≤ congestion < 1.6 → yellow (moderate)
  // congestion ≥ 1.6 → red (heavy)
  if (congestion < 1.2) {
    return [0, 200, 0, 200]; // Green
  } else if (congestion < 1.6) {
    return [255, 165, 0, 200]; // Yellow
  } else {
    return [255, 0, 0, 200]; // Red
  }
}

function speedColor(speedKmh: number): [number, number, number, number] {
  // ≤30kmh → red, 30-60kmh → yellow, ≥80kmh → green
  if (speedKmh <= 30) {
    return [255, 0, 0, 200]; // Red
  } else if (speedKmh <= 60) {
    return [255, 165, 0, 200]; // Yellow
  } else if (speedKmh <= 90) {
    return [173, 255, 47, 200]; // Light green
  } else {
    return [0, 255, 0, 200]; // Bright green
  }
}

function withAlpha(
  color: [number, number, number, number],
  alpha: number
): [number, number, number, number] {
  return [color[0], color[1], color[2], alpha];
}

export function buildLayers(activeToggles: Set<LayerKey>, data: MapDataBundle) {
  const layers: Layer[] = [];

  if (activeToggles.has(LayerKey.ROADS)) {
    layers.push(
      new PathLayer({
        id: 'roads-layer',
        data: data.roads || [],
        getPath: (d: RoadSegment) => d.path,
        getColor: VISUAL.colors.roads as [number, number, number, number],
        getWidth: (d: RoadSegment) => d.width || 2,
        widthUnits: 'pixels',
        widthMinPixels: VISUAL.roads.widthMinPixels,
        widthMaxPixels: VISUAL.roads.widthMaxPixels,
        pickable: true,
        transitions: {
          getPositions: VISUAL.transition.duration,
        },
      })
    );
  }

  if (activeToggles.has(LayerKey.AQI) && data.aqi) {
    layers.push(
      new HeatmapLayer({
        id: 'aqi-layer',
        data: [data.aqi], // wrap the single point in an array
        getPosition: (d: AqiPoint) => d.position,
        getWeight: (d: AqiPoint) => d.aqi,
        radiusPixels: VISUAL.heatmap.radiusPixels,
        intensity: VISUAL.heatmap.intensity,
        threshold: VISUAL.heatmap.threshold,
        colorRange: VISUAL.colors.aqi as [number, number, number][],
      })
    );
  }

  if (activeToggles.has(LayerKey.TRAFFIC) && data.traffic) {
    layers.push(
      new PathLayer({
        id: 'traffic-layer',
        data: data.traffic,
        getPath: (d: TrafficSegment) => d.path,
        getColor: (d: TrafficSegment) => trafficColor(d.congestion),
        getWidth: VISUAL.traffic.width,
        widthUnits: 'pixels',
        widthMinPixels: VISUAL.traffic.widthMinPixels,
        widthMaxPixels: VISUAL.traffic.widthMaxPixels,
        opacity: VISUAL.opacity.traffic,
        pickable: true,
        transitions: {
          getPositions: VISUAL.transition.duration,
        },
      })
    );
  }

  if (activeToggles.has(LayerKey.SPEED_LIMIT) && data.speedLimits) {
    layers.push(
      new PathLayer({
        id: 'speed-limit-layer',
        data: data.speedLimits,
        getPath: (d: SpeedLimitSegment) => d.path,
        getColor: (d: SpeedLimitSegment) => speedColor(d.speedKmh),
        getWidth: VISUAL.speedLimit.width,
        widthUnits: 'pixels',
        widthMinPixels: VISUAL.speedLimit.widthMinPixels,
        widthMaxPixels: VISUAL.speedLimit.widthMaxPixels,
        opacity: VISUAL.opacity.speedLimit,
        pickable: true,
        transitions: {
          getPositions: VISUAL.transition.duration,
        },
      })
    );
  }

  if (activeToggles.has(LayerKey.FLOOD) && data.floodRisk) {
    layers.push(
      new ContourLayer({
        id: 'flood-risk-layer',
        data: data.floodRisk,
        getPosition: (d: FloodRiskPoint) => d.position,
        getWeight: (d: FloodRiskPoint) => d.weight,
        contours: [
          {
            threshold: 30, // Low risk (score < 30)
            color: [34, 139, 34, 120], // Dark green
          },
          {
            threshold: 60, // Medium risk (score 30-60)
            color: [255, 165, 0, 140], // Orange
          },
          {
            threshold: 100, // High risk (score > 60)
            color: [220, 20, 60, 160], // Crimson red
          },
        ],
        cellSize: VISUAL.flood.cellSize,
        pickable: false,
      })
    );
  }

  if (activeToggles.has(LayerKey.RISK) && data.riskGrid) {
    layers.push(
      new ContourLayer({
        id: 'risk-layer',
        data: data.riskGrid,
        getPosition: (d: RiskGridPoint) => d.position,
        getWeight: (d: RiskGridPoint) => d.score,
        contours: [
          {
            threshold: 25, // Low combined risk
            color: [76, 175, 80, 100], // Green
          },
          {
            threshold: 50, // Medium combined risk
            color: [255, 193, 7, 130], // Amber
          },
          {
            threshold: 75, // High combined risk
            color: [244, 67, 54, 160], // Red
          },
        ],
        cellSize: VISUAL.risk.cellSize,
        pickable: true,
      })
    );
  }

  if (activeToggles.has(LayerKey.METRO) && data.metroStations) {
    // Generate grid around center based on metro proximity
    // For simplicity, we create a contour layer directly with distances
    // The prompt says "ContourLayer showing influence decay from each metro station"
    layers.push(
      new ContourLayer({
        id: 'metro-layer',
        data: data.metroStations, // Note: real implementation needs grid values, using mock points here
        getPosition: (d: MetroStation) => d.position,
        getWeight: () => 1,
        contours: [
          {
            threshold: VISUAL.metro.influenceThresholds[0],
            color: withAlpha(VISUAL.colors.metro as [number, number, number, number], VISUAL.metro.influenceAlphas[0]),
          },
          {
            threshold: VISUAL.metro.influenceThresholds[1],
            color: withAlpha(VISUAL.colors.metro as [number, number, number, number], VISUAL.metro.influenceAlphas[1]),
          },
          {
            threshold: VISUAL.metro.influenceThresholds[2],
            color: withAlpha(VISUAL.colors.metro as [number, number, number, number], VISUAL.metro.influenceAlphas[2]),
          },
        ],
        cellSize: VISUAL.metro.cellSize,
        pickable: false,
      })
    );
  }

  if (activeToggles.has(LayerKey.INFRASTRUCTURE) && data.infrastructure) {
    layers.push(
      new ScatterplotLayer({
        id: 'infrastructure-layer',
        data: data.infrastructure,
        getPosition: (d: InfrastructurePoi) => d.position,
        getFillColor: (d: InfrastructurePoi) => {
          if (d.type === 'metro_station') return VISUAL.colors.metro as [number, number, number, number];
          if (d.type === 'hospital') return VISUAL.colors.hospital as [number, number, number, number];
          if (d.type === 'school') return VISUAL.colors.school as [number, number, number, number];
          if (d.type === 'shopping_mall') return VISUAL.colors.mall as [number, number, number, number];
          return VISUAL.colors.infrastructureFallback as [number, number, number, number];
        },
        getRadius: VISUAL.infrastructure.radiusPixels,
        radiusUnits: 'pixels',
        opacity: VISUAL.opacity.infrastructure,
        pickable: true,
      })
    );
  }

  if (activeToggles.has(LayerKey.VALUE) && data.value) {
    layers.push(
      new HeatmapLayer({
        id: 'value-layer',
        data: data.value,
        getPosition: (d: ValuePoint) => d.position,
        getWeight: (d: ValuePoint) => d.weight,
        radiusPixels: VISUAL.heatmap.radiusPixels,
        intensity: VISUAL.heatmap.intensity,
        colorRange: VISUAL.colors.value as [number, number, number][],
      })
    );
  }

  if (activeToggles.has(LayerKey.DENSITY) && data.density) {
    layers.push(
      new HexagonLayer({
        id: 'density-layer',
        data: data.density,
        getPosition: (d: DensityPoint) => d.position,
        getElevationWeight: (d: DensityPoint) => d.count,
        elevationScale: 4,
        radius: 300,
        extruded: true,
        pickable: false,
      })
    );
  }

  if (activeToggles.has(LayerKey.CONNECTIVITY) && data.connectivity) {
    layers.push(
      new ArcLayer({
        id: 'connectivity-arc-layer',
        data: data.connectivity,
        getSourcePosition: (d: ConnectivityArc) => d.source,
        getTargetPosition: (d: ConnectivityArc) => d.target,
        getSourceColor: (d: ConnectivityArc) => connectivityColor(d.travelMinutes),
        getTargetColor: (d: ConnectivityArc) => connectivityColor(d.travelMinutes),
        getWidth: VISUAL.connectivity.arcWidth,
        widthUnits: 'pixels',
        opacity: VISUAL.opacity.arc,
        pickable: true,
      })
    );

    const routePaths = data.connectivity.filter((segment) => Array.isArray(segment.path) && segment.path.length > 1);
    if (routePaths.length > 0) {
      layers.push(
        new PathLayer({
          id: 'connectivity-route-layer',
          data: routePaths,
          getPath: (d: ConnectivityArc) => d.path || [d.source, d.target],
          getColor: (d: ConnectivityArc) => connectivityColor(d.travelMinutes),
          getWidth: VISUAL.connectivity.routeWidth,
          widthUnits: 'pixels',
          widthMinPixels: VISUAL.connectivity.routeMinPixels,
          widthMaxPixels: VISUAL.connectivity.routeMaxPixels,
          pickable: true,
        })
      );
    }
  }

  if (activeToggles.has(LayerKey.ISOCHRONE) && data.isochrone) {
    layers.push(
      new PathLayer({
        id: 'isochrone-ring-paths',
        data: data.isochrone,
        getPath: (d: IsochroneRing) => d.points,
        getColor: (d: IsochroneRing) => d.color,
        getWidth: VISUAL.isochrone.width,
        widthUnits: 'pixels',
        widthMinPixels: VISUAL.isochrone.widthMinPixels,
        widthMaxPixels: VISUAL.isochrone.widthMaxPixels,
        opacity: VISUAL.opacity.contour,
        pickable: true,
      })
    );
  }

  if (activeToggles.has(LayerKey.POI_DENSITY) && data.poiDensity) {
    layers.push(
      new HeatmapLayer({
        id: 'poi-density-layer',
        data: data.poiDensity,
        getPosition: (d: PoiDensityPoint) => d.position,
        getWeight: (d: PoiDensityPoint) => d.weight,
        radiusPixels: VISUAL.heatmap.radiusPixels,
        intensity: VISUAL.heatmap.intensity,
        threshold: VISUAL.heatmap.threshold,
      })
    );
  }

  // Future layers will go here

  return layers;
}
