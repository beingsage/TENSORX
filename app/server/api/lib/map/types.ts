export enum LayerKey {
  BASE_MAP = 'BASE_MAP',
  ROADS = 'ROADS',
  WATER = 'WATER',
  GREEN = 'GREEN',
  DENSITY = 'DENSITY',
  VALUE = 'VALUE',
  LIQUIDITY = 'LIQUIDITY',
  AQI = 'AQI',
  TRAFFIC = 'TRAFFIC',
  RISK = 'RISK',
  METRO = 'METRO',
  FLOOD = 'FLOOD',
  BEST_BUY = 'BEST_BUY',
  CONNECTIVITY = 'CONNECTIVITY',
  ISOCHRONE = 'ISOCHRONE',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SPEED_LIMIT = 'SPEED_LIMIT',
  POI_DENSITY = 'POI_DENSITY',
  INVESTMENT_GRID = 'INVESTMENT_GRID',
}

export type Position = [number, number]; // [lng, lat]

export interface RoadSegment {
  path: Position[];
  width: number;
}

export interface AqiPoint {
  aqi: number;
  components: {
    pm2_5: number;
    pm10: number;
    no2: number;
    o3: number;
  };
  position: Position;
}

export type InfrastructureType = 'metro_station' | 'hospital' | 'school' | 'shopping_mall';

export interface MetroStation {
  name: string;
  position: Position;
}

export interface InfrastructurePoi {
  name: string;
  type: InfrastructureType;
  position: Position;
}

export interface ValuePoint {
  position: Position;
  weight: number;
}

export interface DensityPoint {
  position: Position;
  count: number;
}

export interface ConnectivityArc {
  source: Position;
  target: Position;
  travelMinutes: number;
  path?: Position[];
}

export interface IsochroneRing {
  ring: 'close' | 'medium' | 'far';
  color: [number, number, number, number];
  points: Position[];
}

export interface PoiDensityPoint {
  position: Position;
  weight: number;
  type: 'school' | 'hospital' | 'shopping_mall' | 'park';
}

export interface TrafficSegment {
  path: Position[];
  congestion: number; // ratio: actualTime / freeFlowTime. <1.2=free, 1.2-1.6=moderate, >1.6=congested
}

export interface SpeedLimitSegment {
  path: Position[];
  speedKmh: number;
}

export interface FloodRiskPoint {
  position: Position;
  weight: number; // 0-100 score
}

export interface RiskGridPoint {
  position: Position;
  score: number; // 0-100, combined flood + legal
  floodComponent: number;
  legalComponent: number;
}

export interface MapDataBundle {
  roads?: RoadSegment[];
  aqi?: AqiPoint;
  metroStations?: MetroStation[];
  infrastructure?: InfrastructurePoi[];
  value?: ValuePoint[];
  density?: DensityPoint[];
  connectivity?: ConnectivityArc[];
  isochrone?: IsochroneRing[];
  poiDensity?: PoiDensityPoint[];
  traffic?: TrafficSegment[];
  speedLimits?: SpeedLimitSegment[];
  floodRisk?: FloodRiskPoint[];
  riskGrid?: RiskGridPoint[];
}

export type StreetViewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'no_coverage'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; imageId: string; metadata?: Record<string, unknown> };
