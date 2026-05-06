import {
  fetchSpatialSnapshot,
  reverseGeocode,
  type SpatialAmenity,
  type SpatialSnapshot,
} from './openData';
import { clamp, haversineDistanceKm, type LatLng } from '@/lib/utils/geo';

export type MapDataProvider = 'mappls' | 'olamaps' | 'openstreetmap' | 'fallback';

export interface PlaceData {
  id: string;
  name: string;
  type: string;
  category: string;
  distance: number;
  rating?: number;
  reviews?: number;
  latitude: number;
  longitude: number;
  address?: string;
  provider: MapDataProvider;
  tags?: Record<string, string>;
}

export interface RouteData {
  distance: number;
  duration: number;
  mode: 'driving' | 'transit' | 'walking' | 'cycling';
  provider: MapDataProvider;
}

export interface MapsResult {
  providerStack: {
    primary: MapDataProvider;
    secondary?: MapDataProvider;
    fallback: MapDataProvider;
  };
  addressContext?: {
    displayName: string;
    city: string;
    state?: string;
    postcode?: string;
    micromarket?: string;
  };
  places: {
    nearby: PlaceData[];
    categories: Record<string, PlaceData[]>;
  };
  routes: Record<string, RouteData>;
  distanceMatrix: Array<{
    destination: string;
    distance: number;
    duration: number;
    provider: MapDataProvider;
  }>;
  spatialContext: SpatialSnapshot;
  metadata: {
    providers: string[];
    live: boolean;
    note: string;
    mapStyleHint: string;
  };
}

const MAPPLS_ACCESS_TOKEN =
  process.env.MAPPLS_ACCESS_TOKEN?.trim() ||
  process.env.MAPPLS_REST_API_KEY?.trim() ||
  process.env.MAPPLS_API_KEY?.trim();

const OLA_MAPS_ENABLED = Boolean(
  process.env.OLA_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY?.trim()
);

const MAPPLS_KEYWORDS = [
  { keyword: 'metro station', category: 'metro' },
  { keyword: 'school', category: 'school' },
  { keyword: 'hospital', category: 'hospital' },
  { keyword: 'market', category: 'commercial' },
  { keyword: 'park', category: 'park' },
  { keyword: 'airport', category: 'airport' },
] as const;

function amenityToPlace(amenity: SpatialAmenity): PlaceData {
  return {
    id: amenity.id,
    name: amenity.name,
    type: amenity.subtype,
    category: amenity.kind,
    distance: Math.round(amenity.distanceKm * 1000),
    latitude: amenity.point.lat,
    longitude: amenity.point.lng,
    provider: 'openstreetmap',
    tags: amenity.tags,
  };
}

function dedupePlaces(places: PlaceData[]) {
  const unique = new Map<string, PlaceData>();

  for (const place of places) {
    const key = [
      place.name.toLowerCase(),
      place.category,
      place.latitude.toFixed(5),
      place.longitude.toFixed(5),
    ].join(':');

    if (!unique.has(key)) {
      unique.set(key, place);
    }
  }

  return Array.from(unique.values()).sort((left, right) => left.distance - right.distance);
}

function groupPlacesByCategory(places: PlaceData[]) {
  return places.reduce<Record<string, PlaceData[]>>((accumulator, place) => {
    const bucket = accumulator[place.category] || [];
    bucket.push(place);
    accumulator[place.category] = bucket;
    return accumulator;
  }, {});
}

function inferTravelSpeedKph(mode: RouteData['mode']) {
  switch (mode) {
    case 'walking':
      return 4.8;
    case 'cycling':
      return 13;
    case 'transit':
      return 22;
    default:
      return 26;
  }
}

function buildHeuristicRoute(
  origin: LatLng,
  destination: LatLng,
  mode: RouteData['mode'] = 'driving'
): RouteData {
  const directDistanceKm = haversineDistanceKm(origin, destination);
  const routedDistanceKm =
    mode === 'walking'
      ? directDistanceKm * 1.12
      : mode === 'cycling'
        ? directDistanceKm * 1.18
        : directDistanceKm * 1.28;
  const durationMinutes = Math.max(
    3,
    Math.round((routedDistanceKm / inferTravelSpeedKph(mode)) * 60)
  );

  return {
    distance: Math.round(routedDistanceKm * 1000),
    duration: durationMinutes * 60,
    mode,
    provider: 'fallback',
  };
}

function deriveDestinations(snapshot: SpatialSnapshot, center: LatLng) {
  const nearestByKind = new Map<string, { lat: number; lng: number; name: string }>();

  for (const amenity of snapshot.amenities) {
    if (nearestByKind.has(amenity.kind)) continue;
    if (
      ['metro', 'school', 'hospital', 'commercial', 'airport', 'transit'].includes(
        amenity.kind
      )
    ) {
      nearestByKind.set(amenity.kind, {
        lat: amenity.point.lat,
        lng: amenity.point.lng,
        name: amenity.name,
      });
    }
  }

  const destinations = Array.from(nearestByKind.entries()).map(([kind, point]) => ({
    ...point,
    kind,
  }));

  if (destinations.length > 0) {
    return destinations.slice(0, 5);
  }

  return [
    { lat: center.lat + 0.01, lng: center.lng, name: 'Commercial Hub', kind: 'commercial' },
    { lat: center.lat - 0.008, lng: center.lng + 0.006, name: 'Hospital', kind: 'hospital' },
    { lat: center.lat + 0.014, lng: center.lng - 0.01, name: 'School', kind: 'school' },
  ];
}

async function fetchMapplsNearbyPlaces(
  latitude: number,
  longitude: number,
  radius = 2000
): Promise<PlaceData[]> {
  if (!MAPPLS_ACCESS_TOKEN) {
    return [];
  }

  const requests = MAPPLS_KEYWORDS.map(async ({ keyword, category }) => {
    const url = new URL('https://search.mappls.com/search/places/nearby/json');
    url.searchParams.set('keywords', keyword);
    url.searchParams.set('refLocation', `${latitude},${longitude}`);
    url.searchParams.set('radius', String(radius));
    url.searchParams.set('region', 'IND');
    url.searchParams.set('access_token', MAPPLS_ACCESS_TOKEN);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      suggestedLocations?: Array<Record<string, any>>;
    };

    return (data.suggestedLocations || []).map((item, index) => ({
      id: `mappls-${category}-${item.eLoc || item.placeName || index}`,
      name: item.placeName || keyword,
      type: item.type || category,
      category,
      distance: Number(item.distance || 0),
      latitude: Number(item.latitude || item.lat || latitude),
      longitude: Number(item.longitude || item.lng || longitude),
      address: item.placeAddress,
      provider: 'mappls' as const,
    }));
  });

  const resultSets = await Promise.allSettled(requests);
  return dedupePlaces(
    resultSets.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  );
}

async function fetchMapplsDistanceMatrix(
  latitude: number,
  longitude: number,
  destinations: Array<{ lat: number; lng: number; name: string }>
): Promise<Record<string, RouteData>> {
  if (!MAPPLS_ACCESS_TOKEN || destinations.length === 0) {
    return {};
  }

  const coordinateChain = [
    `${longitude},${latitude}`,
    ...destinations.map((destination) => `${destination.lng},${destination.lat}`),
  ].join(';');

  const url = new URL(
    `https://route.mappls.com/route/dm/distance_matrix/driving/${coordinateChain}`
  );
  url.searchParams.set('access_token', MAPPLS_ACCESS_TOKEN);
  url.searchParams.set('region', 'ind');
  url.searchParams.set('rtype', '0');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    return {};
  }

  const data = (await response.json()) as {
    results?: {
      distances?: number[][];
      durations?: number[][];
    };
  };

  const distances = data.results?.distances?.[0] || [];
  const durations = data.results?.durations?.[0] || [];
  const routes: Record<string, RouteData> = {};

  destinations.forEach((destination, index) => {
    const matrixIndex = index + 1;
    if (
      typeof distances[matrixIndex] === 'number' &&
      typeof durations[matrixIndex] === 'number'
    ) {
      routes[destination.name] = {
        distance: Math.round(distances[matrixIndex]),
        duration: Math.round(durations[matrixIndex]),
        mode: 'driving',
        provider: 'mappls',
      };
    }
  });

  return routes;
}

function buildFallbackRoutes(
  center: LatLng,
  destinations: Array<{ lat: number; lng: number; name: string }>
) {
  return destinations.reduce<Record<string, RouteData>>((accumulator, destination) => {
    accumulator[destination.name] = buildHeuristicRoute(center, destination, 'driving');
    return accumulator;
  }, {});
}

export async function fetchAllMapsData(
  latitude: number,
  longitude: number
): Promise<MapsResult> {
  const center = { lat: latitude, lng: longitude };

  const [spatialContext, addressContext, mapplsPlaces] = await Promise.all([
    fetchSpatialSnapshot(center),
    reverseGeocode(center),
    fetchMapplsNearbyPlaces(latitude, longitude),
  ]);

  const osmPlaces = spatialContext.amenities.map(amenityToPlace);
  const nearbyPlaces = dedupePlaces([...mapplsPlaces, ...osmPlaces]).slice(0, 48);
  const categories = groupPlacesByCategory(nearbyPlaces);

  const destinations = deriveDestinations(spatialContext, center);
  const liveRoutes = await fetchMapplsDistanceMatrix(latitude, longitude, destinations);
  const routes =
    Object.keys(liveRoutes).length > 0
      ? liveRoutes
      : buildFallbackRoutes(center, destinations);

  const providers = ['OpenStreetMap', 'Overpass API'];
  if (addressContext) {
    providers.unshift('Nominatim');
  }
  if (MAPPLS_ACCESS_TOKEN) {
    providers.unshift('Mappls');
  }
  if (OLA_MAPS_ENABLED) {
    providers.push('Ola Maps');
  }

  return {
    providerStack: {
      primary: MAPPLS_ACCESS_TOKEN ? 'mappls' : 'openstreetmap',
      secondary: OLA_MAPS_ENABLED ? 'olamaps' : undefined,
      fallback: 'openstreetmap',
    },
    addressContext: addressContext
      ? {
          displayName: addressContext.displayName,
          city: addressContext.city,
          state: addressContext.state,
          postcode: addressContext.postcode,
          micromarket: addressContext.micromarket,
        }
      : undefined,
    places: {
      nearby: nearbyPlaces,
      categories,
    },
    routes,
    distanceMatrix: Object.entries(routes).map(([destination, route]) => ({
      destination,
      distance: route.distance,
      duration: route.duration,
      provider: route.provider,
    })),
    spatialContext,
    metadata: {
      providers,
      live:
        nearbyPlaces.length > 0 ||
        spatialContext.amenities.length > 0 ||
        Object.keys(routes).length > 0,
      note:
        'India-first provider stack with Mappls routing/search when configured, MapLibre-compatible OSM spatial fallback, and optional Ola-compatible frontend styling.',
      mapStyleHint: OLA_MAPS_ENABLED ? 'ola-vector-or-open-maplibre' : 'open-maplibre',
    },
  };
}
