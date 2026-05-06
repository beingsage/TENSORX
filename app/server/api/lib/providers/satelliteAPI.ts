import { computeLocationIntelligence } from '@/lib/geospatial/locationIntelligence';
import { clamp } from '@/lib/utils/geo';

export interface SatelliteImage {
  id: string;
  source: 'sentinel' | 'planet';
  date: string;
  cloudCover: number;
  url: string;
  resolution: number;
  bands: string[];
}

export interface SatelliteAnalysis {
  occupancyRate: number;
  greenCover: number;
  builtUpArea: number;
  waterBodies: number;
  thermalSignature: number;
  nightLightIntensity: number;
  changeDetection: string;
}

async function fetchSentinelImagery(
  latitude: number,
  longitude: number,
  dateStart = '2025-01-01',
  dateEnd = new Date().toISOString().slice(0, 10)
): Promise<SatelliteImage[]> {
  const clientId = process.env.SENTINEL_CLIENT_ID?.trim();
  const clientSecret = process.env.SENTINEL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return [];
  }

  try {
    const tokenResponse = await fetch('https://services.sentinel-hub.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      next: { revalidate: 86400 },
    });

    if (!tokenResponse.ok) {
      return [];
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return [];
    }

    const bbox = [longitude - 0.01, latitude - 0.01, longitude + 0.01, latitude + 0.01];

    const response = await fetch('https://services.sentinel-hub.com/api/v1/catalog/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        bbox,
        datetime: `${dateStart}T00:00:00Z/${dateEnd}T23:59:59Z`,
        collections: ['sentinel-2-l2a'],
        limit: 8,
      }),
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { features?: Array<Record<string, any>> };
    return (data.features || []).map((feature) => ({
      id: String(feature.id),
      source: 'sentinel' as const,
      date: String(feature.properties?.datetime || dateEnd),
      cloudCover: Number(feature.properties?.['eo:cloud_cover'] || 0),
      url: String(feature.assets?.thumbnail?.href || ''),
      resolution: 10,
      bands: ['B2', 'B3', 'B4', 'B8', 'B11', 'B12'],
    }));
  } catch {
    return [];
  }
}

async function fetchPlanetLabsImagery(
  latitude: number,
  longitude: number,
  maxResults = 6
): Promise<SatelliteImage[]> {
  const apiKey = process.env.PLANET_LABS_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  try {
    const polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [longitude - 0.01, latitude - 0.01],
          [longitude + 0.01, latitude - 0.01],
          [longitude + 0.01, latitude + 0.01],
          [longitude - 0.01, latitude + 0.01],
          [longitude - 0.01, latitude - 0.01],
        ],
      ],
    };

    const response = await fetch('https://api.planet.com/data/v1/quick-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `api-key ${apiKey}`,
      },
      body: JSON.stringify({
        filter: {
          type: 'AndFilter',
          config: [
            {
              type: 'GeometryFilter',
              field_name: 'geometry',
              config: polygon,
            },
          ],
        },
        item_types: ['PSScene'],
      }),
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { features?: Array<Record<string, any>> };
    return (data.features || []).slice(0, maxResults).map((feature) => ({
      id: String(feature.id),
      source: 'planet' as const,
      date: String(feature.properties?.acquired || new Date().toISOString()),
      cloudCover: Number(feature.properties?.cloud_cover || 0),
      url: String(feature._links?.thumbnail || ''),
      resolution: 3,
      bands: ['B1', 'B2', 'B3', 'B4'],
    }));
  } catch {
    return [];
  }
}

async function analyzeSatelliteData(
  latitude: number,
  longitude: number,
  images: SatelliteImage[]
): Promise<SatelliteAnalysis> {
  const locationIntel = await computeLocationIntelligence(latitude, longitude);
  const waterArea = locationIntel.spatialContext.waterBodies.reduce(
    (sum, body) => sum + body.areaSqM,
    0
  );
  const greenArea = locationIntel.spatialContext.greenAreas.reduce(
    (sum, area) => sum + area.areaSqM,
    0
  );
  const mappedAreaSqM = Math.max(
    1,
    (locationIntel.spatialContext.bounds.maxLat - locationIntel.spatialContext.bounds.minLat) *
      (locationIntel.spatialContext.bounds.maxLng - locationIntel.spatialContext.bounds.minLng) *
      111_320 *
      111_320
  );
  const newestImage = [...images].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  )[0];

  return {
    occupancyRate: Math.round(100 - locationIntel.remoteSensing.vacancyProxyScore),
    greenCover: Math.round(
      clamp(
        Math.max(locationIntel.remoteSensing.ndvi * 100, (greenArea / mappedAreaSqM) * 100),
        0,
        100
      )
    ),
    builtUpArea: Math.round(locationIntel.remoteSensing.urbanDensity),
    waterBodies: Math.round(clamp((waterArea / mappedAreaSqM) * 100, 0, 100)),
    thermalSignature: Math.round(
      clamp(locationIntel.environmentalRisk.climateFutureRisk * 0.82, 10, 100)
    ),
    nightLightIntensity: Math.round(locationIntel.remoteSensing.nightLightIntensity),
    changeDetection: newestImage
      ? `Latest ${newestImage.source} capture ${newestImage.date.slice(0, 10)} with ${newestImage.cloudCover.toFixed(0)}% cloud cover; mapped built density ${locationIntel.remoteSensing.urbanDensity}/100.`
      : `No premium imagery key available; using live OSM footprint and environmental proxies with built density ${locationIntel.remoteSensing.urbanDensity}/100.`,
  };
}

export async function fetchAllSatelliteData(
  latitude: number,
  longitude: number
): Promise<{
  images: SatelliteImage[];
  analysis: SatelliteAnalysis;
  providers: string[];
}> {
  const [sentinel, planet] = await Promise.all([
    fetchSentinelImagery(latitude, longitude),
    fetchPlanetLabsImagery(latitude, longitude),
  ]);
  const images = [...sentinel, ...planet].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  );
  const analysis = await analyzeSatelliteData(latitude, longitude, images);

  const providers = ['OpenStreetMap-derived remote sensing priors'];
  if (sentinel.length > 0) {
    providers.unshift('Sentinel Hub');
  }
  if (planet.length > 0) {
    providers.unshift('Planet Labs');
  }

  return {
    images,
    analysis,
    providers,
  };
}
