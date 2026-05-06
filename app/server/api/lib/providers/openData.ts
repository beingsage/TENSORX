import {
  boundsFromCollections,
  centroidOfPolygon,
  haversineDistanceKm,
  polygonAreaSqM,
  pointInPolygon,
  polylineLengthKm,
  type Bounds,
  type LatLng,
} from '@/lib/utils/geo';

type JsonRecord = Record<string, any>;

interface CacheEntry<T> {
  expiresAt: number;
  value: Promise<T>;
}

const responseCache = new Map<string, CacheEntry<any>>();
const APP_NAME = process.env.OSM_APP_NAME || 'cost-analysis-app';
const CONTACT_EMAIL = process.env.NOMINATIM_EMAIL;
const USER_AGENT = CONTACT_EMAIL
  ? `${APP_NAME}/1.0 (${CONTACT_EMAIL})`
  : `${APP_NAME}/1.0`;

let nominatimQueue: Promise<void> = Promise.resolve();
let lastNominatimAt = 0;

function withCache<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = factory().catch((error) => {
    responseCache.delete(key);
    throw error;
  });

  responseCache.set(key, {
    expiresAt: now + ttlMs,
    value,
  });

  return value;
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 12000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status} for ${url}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function throttleNominatim<T>(task: () => Promise<T>) {
  const scheduled = nominatimQueue.then(async () => {
    const waitMs = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastNominatimAt = Date.now();
    return task();
  });

  nominatimQueue = scheduled.then(
    () => undefined,
    () => undefined
  );

  return scheduled;
}

function asPoint(element: JsonRecord): LatLng | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }
  return { lat, lng };
}

function asGeometry(element: JsonRecord): LatLng[] {
  const geometry = element.geometry || element.geom || [];
  if (!Array.isArray(geometry)) return [];
  return geometry
    .map((point) => {
      if (typeof point?.lat !== 'number' || typeof point?.lon !== 'number') {
        return null;
      }
      return { lat: point.lat, lng: point.lon };
    })
    .filter(Boolean) as LatLng[];
}

function normalizeName(tags: JsonRecord, fallback: string) {
  return (
    tags.name ||
    tags['name:en'] ||
    tags.operator ||
    tags.brand ||
    tags.ref ||
    fallback
  );
}

function amenityKind(tags: JsonRecord) {
  const railway = String(tags.railway || '').toLowerCase();
  const station = String(tags.station || '').toLowerCase();
  const amenity = String(tags.amenity || '').toLowerCase();
  const shop = String(tags.shop || '').toLowerCase();
  const leisure = String(tags.leisure || '').toLowerCase();
  const office = String(tags.office || '').toLowerCase();
  const aeroway = String(tags.aeroway || '').toLowerCase();
  const publicTransport = String(tags.public_transport || '').toLowerCase();

  if (
    railway === 'subway_entrance' ||
    railway === 'station' ||
    railway === 'halt' ||
    railway === 'tram_stop' ||
    station === 'subway' ||
    publicTransport === 'station'
  ) {
    return 'metro';
  }
  if (
    amenity === 'school' ||
    amenity === 'college' ||
    amenity === 'university' ||
    amenity === 'kindergarten'
  ) {
    return 'school';
  }
  if (
    amenity === 'hospital' ||
    amenity === 'clinic' ||
    amenity === 'doctors'
  ) {
    return 'hospital';
  }
  if (
    amenity === 'marketplace' ||
    shop === 'mall' ||
    shop === 'supermarket' ||
    shop === 'department_store' ||
    shop === 'convenience'
  ) {
    return 'commercial';
  }
  if (leisure === 'park' || leisure === 'garden') {
    return 'park';
  }
  if (office === 'estate_agent') {
    return 'broker';
  }
  if (aeroway === 'aerodrome' || aeroway === 'terminal') {
    return 'airport';
  }
  if (amenity === 'bus_station' || publicTransport === 'platform') {
    return 'transit';
  }
  return 'other';
}

export interface GeocodeLookup {
  latitude: number;
  longitude: number;
  displayName: string;
  city: string;
  state?: string;
  postcode?: string;
  micromarket?: string;
  source: 'nominatim';
}

export interface SpatialAmenity {
  id: string;
  name: string;
  kind:
    | 'metro'
    | 'school'
    | 'hospital'
    | 'commercial'
    | 'park'
    | 'broker'
    | 'transit'
    | 'airport'
    | 'other';
  subtype: string;
  point: LatLng;
  distanceKm: number;
  tags: Record<string, string>;
}

export interface SpatialBuilding {
  id: string;
  centroid: LatLng;
  footprint: LatLng[];
  distanceKm: number;
  areaSqM: number;
  levels?: number;
  heightMeters?: number;
  tags: Record<string, string>;
}

export interface SpatialLine {
  id: string;
  kind: string;
  name: string;
  points: LatLng[];
  lengthKm: number;
  tags: Record<string, string>;
}

export interface SpatialArea {
  id: string;
  kind: string;
  points: LatLng[];
  areaSqM: number;
  tags: Record<string, string>;
}

export interface SpatialSnapshot {
  center: LatLng;
  subjectBuilding: SpatialBuilding | null;
  nearbyBuildings: SpatialBuilding[];
  amenities: SpatialAmenity[];
  roads: SpatialLine[];
  railLines: SpatialLine[];
  greenAreas: SpatialArea[];
  waterBodies: SpatialArea[];
  bounds: Bounds;
}

export interface EnvironmentalSnapshot {
  weather: {
    temperatureC?: number;
    apparentTemperatureC?: number;
    precipitationMm?: number;
    windSpeedKph?: number;
  };
  airQuality: {
    usAqi?: number;
    pm25?: number;
    no2?: number;
    ozone?: number;
  };
  flood: {
    currentRiverDischarge?: number;
    peakRiverDischargeNext7Days?: number;
  };
}

export async function geocodeAddress(
  address: string,
  pincode?: string
): Promise<GeocodeLookup | null> {
  const query = [address, pincode].filter(Boolean).join(', ');
  if (!query) return null;

  return withCache(`nominatim:search:${query}`, 24 * 60 * 60 * 1000, () =>
    throttleNominatim(async () => {
      const searchParams = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
        addressdetails: '1',
      });

      if (CONTACT_EMAIL) {
        searchParams.set('email', CONTACT_EMAIL);
      }

      const results = await fetchJson<JsonRecord[]>(
        `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
        {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en',
            'User-Agent': USER_AGENT,
          },
        }
      );

      const first = results[0];
      if (!first) return null;

      const addressParts = first.address || {};
      return {
        latitude: Number(first.lat),
        longitude: Number(first.lon),
        displayName: first.display_name || query,
        city:
          addressParts.city ||
          addressParts.town ||
          addressParts.village ||
          addressParts.county ||
          addressParts.state_district ||
          'unknown',
        state: addressParts.state,
        postcode: addressParts.postcode,
        micromarket:
          addressParts.suburb ||
          addressParts.neighbourhood ||
          addressParts.residential ||
          addressParts.city_district ||
          addressParts.hamlet,
        source: 'nominatim',
      };
    })
  );
}

export async function reverseGeocode(point: LatLng): Promise<GeocodeLookup | null> {
  const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  return withCache(`nominatim:reverse:${key}`, 24 * 60 * 60 * 1000, () =>
    throttleNominatim(async () => {
      const searchParams = new URLSearchParams({
        lat: point.lat.toFixed(6),
        lon: point.lng.toFixed(6),
        format: 'jsonv2',
        addressdetails: '1',
      });

      if (CONTACT_EMAIL) {
        searchParams.set('email', CONTACT_EMAIL);
      }

      const result = await fetchJson<JsonRecord>(
        `https://nominatim.openstreetmap.org/reverse?${searchParams.toString()}`,
        {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en',
            'User-Agent': USER_AGENT,
          },
        }
      );

      const addressParts = result.address || {};
      return {
        latitude: Number(result.lat ?? point.lat),
        longitude: Number(result.lon ?? point.lng),
        displayName: result.display_name || `${point.lat}, ${point.lng}`,
        city:
          addressParts.city ||
          addressParts.town ||
          addressParts.village ||
          addressParts.county ||
          addressParts.state_district ||
          'unknown',
        state: addressParts.state,
        postcode: addressParts.postcode,
        micromarket:
          addressParts.suburb ||
          addressParts.neighbourhood ||
          addressParts.residential ||
          addressParts.city_district ||
          addressParts.hamlet,
        source: 'nominatim',
      };
    })
  );
}

export async function fetchSpatialSnapshot(center: LatLng): Promise<SpatialSnapshot> {
  const key = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;

  return withCache(`overpass:spatial:${key}`, 45 * 60 * 1000, async () => {
    const query = `
[out:json][timeout:25];
(
  way(around:250,${center.lat},${center.lng})[building];
  nwr(around:1500,${center.lat},${center.lng})[amenity~"school|college|university|kindergarten|hospital|clinic|doctors|marketplace|bus_station"];
  nwr(around:1500,${center.lat},${center.lng})[shop~"mall|supermarket|department_store|convenience"];
  nwr(around:2000,${center.lat},${center.lng})[railway~"station|halt|subway_entrance|tram_stop"];
  nwr(around:2000,${center.lat},${center.lng})[public_transport~"station|platform|stop_position"];
  nwr(around:1500,${center.lat},${center.lng})[leisure~"park|garden"];
  nwr(around:1500,${center.lat},${center.lng})[office="estate_agent"];
  nwr(around:30000,${center.lat},${center.lng})[aeroway="aerodrome"];
  way(around:600,${center.lat},${center.lng})[highway];
  way(around:800,${center.lat},${center.lng})[railway];
  way(around:800,${center.lat},${center.lng})[landuse~"residential|commercial|retail|industrial|forest|grass|recreation_ground"];
  way(around:800,${center.lat},${center.lng})[leisure~"park|garden"];
  way(around:800,${center.lat},${center.lng})[natural~"water|wood|scrub"];
  way(around:800,${center.lat},${center.lng})[waterway];
);
out body geom center qt;`;

    const response = await fetchJson<{ elements?: JsonRecord[] }>(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      },
      16000
    );

    const elements = Array.isArray(response.elements) ? response.elements : [];
    const buildings: SpatialBuilding[] = [];
    const amenities = new Map<string, SpatialAmenity>();
    const roads: SpatialLine[] = [];
    const rails: SpatialLine[] = [];
    const greenAreas: SpatialArea[] = [];
    const waterBodies: SpatialArea[] = [];

    for (const element of elements) {
      const tags = (element.tags || {}) as Record<string, string>;

      if (tags.building && element.type === 'way') {
        const footprint = asGeometry(element);
        if (footprint.length >= 3) {
          const centroid = centroidOfPolygon(footprint);
          const levels = Number(tags['building:levels']);
          const areaSqM = polygonAreaSqM(footprint);
          buildings.push({
            id: `${element.type}/${element.id}`,
            centroid,
            footprint,
            distanceKm: haversineDistanceKm(center, centroid),
            areaSqM,
            levels: Number.isFinite(levels) ? levels : undefined,
            heightMeters: tags.height ? Number(tags.height) : undefined,
            tags,
          });
        }
        continue;
      }

      if (tags.highway && element.type === 'way') {
        const points = asGeometry(element);
        if (points.length >= 2) {
          roads.push({
            id: `${element.type}/${element.id}`,
            kind: tags.highway,
            name: normalizeName(tags, 'Unnamed road'),
            points,
            lengthKm: polylineLengthKm(points),
            tags,
          });
        }
        continue;
      }

      if (tags.railway && element.type === 'way') {
        const points = asGeometry(element);
        if (points.length >= 2) {
          rails.push({
            id: `${element.type}/${element.id}`,
            kind: tags.railway,
            name: normalizeName(tags, 'Rail corridor'),
            points,
            lengthKm: polylineLengthKm(points),
            tags,
          });
        }
        continue;
      }

      if (
        (tags.leisure === 'park' ||
          tags.leisure === 'garden' ||
          tags.landuse === 'forest' ||
          tags.landuse === 'grass' ||
          tags.landuse === 'recreation_ground' ||
          tags.natural === 'wood' ||
          tags.natural === 'scrub') &&
        element.type === 'way'
      ) {
        const points = asGeometry(element);
        if (points.length >= 3) {
          greenAreas.push({
            id: `${element.type}/${element.id}`,
            kind: tags.leisure || tags.landuse || tags.natural,
            points,
            areaSqM: polygonAreaSqM(points),
            tags,
          });
        }
        continue;
      }

      if (
        (tags.natural === 'water' || tags.waterway || tags.water) &&
        element.type === 'way'
      ) {
        const points = asGeometry(element);
        if (points.length >= 2) {
          waterBodies.push({
            id: `${element.type}/${element.id}`,
            kind: tags.waterway || tags.water || tags.natural,
            points,
            areaSqM: polygonAreaSqM(points),
            tags,
          });
        }
        continue;
      }

      const point = asPoint(element);
      if (!point) continue;

      const kind = amenityKind(tags);
      if (kind === 'other' && !tags.amenity && !tags.shop && !tags.office && !tags.aeroway) {
        continue;
      }

      const id = `${element.type}/${element.id}`;
      amenities.set(id, {
        id,
        name: normalizeName(tags, kind.replace(/^\w/, (char) => char.toUpperCase())),
        kind,
        subtype:
          tags.amenity ||
          tags.shop ||
          tags.railway ||
          tags.public_transport ||
          tags.office ||
          tags.aeroway ||
          'mapped_feature',
        point,
        distanceKm: haversineDistanceKm(center, point),
        tags,
      });
    }

    const orderedBuildings = buildings.sort((left, right) => left.distanceKm - right.distanceKm);
    const subjectBuilding =
      orderedBuildings.find((building) => pointInPolygon(center, building.footprint)) ||
      orderedBuildings[0] ||
      null;

    const nearbyBuildings = orderedBuildings
      .filter((building) => building.id !== subjectBuilding?.id)
      .slice(0, 18);

    const amenityList = Array.from(amenities.values()).sort(
      (left, right) => left.distanceKm - right.distanceKm
    );

    const boundCollections: LatLng[][] = [
      subjectBuilding?.footprint || [],
      ...nearbyBuildings.map((building) => building.footprint),
      ...roads.slice(0, 25).map((road) => road.points),
      ...rails.slice(0, 15).map((rail) => rail.points),
      ...amenityList.slice(0, 30).map((amenity) => [amenity.point]),
      ...greenAreas.slice(0, 8).map((area) => area.points),
      ...waterBodies.slice(0, 8).map((area) => area.points),
    ];

    const bounds = boundsFromCollections(boundCollections, center);

    return {
      center,
      subjectBuilding,
      nearbyBuildings,
      amenities: amenityList.slice(0, 48),
      roads: roads.slice(0, 24),
      railLines: rails.slice(0, 12),
      greenAreas: greenAreas.slice(0, 8),
      waterBodies: waterBodies.slice(0, 8),
      bounds,
    };
  });
}

export async function fetchEnvironmentalSnapshot(
  center: LatLng
): Promise<EnvironmentalSnapshot> {
  const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;

  return withCache(`open-meteo:env:${key}`, 30 * 60 * 1000, async () => {
    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.searchParams.set('latitude', center.lat.toFixed(6));
    forecastUrl.searchParams.set('longitude', center.lng.toFixed(6));
    forecastUrl.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,precipitation,wind_speed_10m'
    );
    forecastUrl.searchParams.set('forecast_days', '1');
    forecastUrl.searchParams.set('timezone', 'auto');

    const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    airUrl.searchParams.set('latitude', center.lat.toFixed(6));
    airUrl.searchParams.set('longitude', center.lng.toFixed(6));
    airUrl.searchParams.set('current', 'us_aqi,pm2_5,nitrogen_dioxide,ozone');
    airUrl.searchParams.set('timezone', 'auto');

    const floodUrl = new URL('https://flood-api.open-meteo.com/v1/flood');
    floodUrl.searchParams.set('latitude', center.lat.toFixed(6));
    floodUrl.searchParams.set('longitude', center.lng.toFixed(6));
    floodUrl.searchParams.set('daily', 'river_discharge');
    floodUrl.searchParams.set('forecast_days', '7');

    const [forecast, air, flood] = await Promise.allSettled([
      fetchJson<JsonRecord>(forecastUrl.toString(), undefined, 10000),
      fetchJson<JsonRecord>(airUrl.toString(), undefined, 10000),
      fetchJson<JsonRecord>(floodUrl.toString(), undefined, 10000),
    ]);

    const weatherCurrent =
      forecast.status === 'fulfilled' ? forecast.value.current || {} : {};
    const airCurrent = air.status === 'fulfilled' ? air.value.current || {} : {};
    const floodDaily = flood.status === 'fulfilled' ? flood.value.daily || {} : {};
    const riverDischarge = Array.isArray(floodDaily.river_discharge)
      ? floodDaily.river_discharge.filter((value: unknown) => typeof value === 'number')
      : [];

    return {
      weather: {
        temperatureC:
          typeof weatherCurrent.temperature_2m === 'number'
            ? weatherCurrent.temperature_2m
            : undefined,
        apparentTemperatureC:
          typeof weatherCurrent.apparent_temperature === 'number'
            ? weatherCurrent.apparent_temperature
            : undefined,
        precipitationMm:
          typeof weatherCurrent.precipitation === 'number'
            ? weatherCurrent.precipitation
            : undefined,
        windSpeedKph:
          typeof weatherCurrent.wind_speed_10m === 'number'
            ? weatherCurrent.wind_speed_10m
            : undefined,
      },
      airQuality: {
        usAqi: typeof airCurrent.us_aqi === 'number' ? airCurrent.us_aqi : undefined,
        pm25: typeof airCurrent.pm2_5 === 'number' ? airCurrent.pm2_5 : undefined,
        no2:
          typeof airCurrent.nitrogen_dioxide === 'number'
            ? airCurrent.nitrogen_dioxide
            : undefined,
        ozone: typeof airCurrent.ozone === 'number' ? airCurrent.ozone : undefined,
      },
      flood: {
        currentRiverDischarge: riverDischarge[0],
        peakRiverDischargeNext7Days:
          riverDischarge.length > 0 ? Math.max(...riverDischarge) : undefined,
      },
    };
  });
}
