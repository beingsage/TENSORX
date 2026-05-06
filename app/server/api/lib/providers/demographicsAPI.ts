import { computeLocationIntelligence } from '@/lib/geospatial/locationIntelligence';
import { clamp } from '@/lib/utils/geo';
import { reverseGeocode } from './openData';

export interface DemographicData {
  population: number;
  medianAge: number;
  medianHouseholdIncome: number;
  unemploymentRate: number;
  educationLevel: {
    highSchool: number;
    bachelor: number;
    graduate: number;
  };
  householdSize: number;
  ownersVsRenters: {
    owners: number;
    renters: number;
  };
  urbanicity: 'metro-core' | 'urban' | 'peri-urban' | 'rural';
  densityPerSqKm: number;
  administrativeContext: {
    city: string;
    state?: string;
    postcode?: string;
    micromarket?: string;
  };
  proxySignals: {
    poiDensity: number;
    builtDensity: number;
    nightLightIntensity: number;
    airQualityIndex: number;
  };
  trends: {
    growth: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    basis: string;
  };
  incomeDistribution: Record<string, number>;
  sources: string[];
}

function classifyUrbanicity(
  demandIndex: number,
  poiDensity: number,
  urbanDensity: number
): DemographicData['urbanicity'] {
  if (urbanDensity >= 72 || (poiDensity >= 30 && demandIndex >= 65)) {
    return 'metro-core';
  }
  if (urbanDensity >= 48 || poiDensity >= 18) {
    return 'urban';
  }
  if (urbanDensity >= 28 || poiDensity >= 9) {
    return 'peri-urban';
  }
  return 'rural';
}

function inferMedianIncome(
  urbanicity: DemographicData['urbanicity'],
  demandIndex: number,
  airQualityIndex: number
) {
  const urbanBase =
    urbanicity === 'metro-core'
      ? 1_700_000
      : urbanicity === 'urban'
        ? 1_150_000
        : urbanicity === 'peri-urban'
          ? 780_000
          : 520_000;

  const uplift = demandIndex * 8500;
  const airPenalty = Math.max(0, airQualityIndex - 120) * 1600;
  return Math.round(clamp(urbanBase + uplift - airPenalty, 360_000, 2_800_000));
}

function inferIncomeDistribution(medianAnnualIncome: number) {
  const croreHouseholds = clamp((medianAnnualIncome - 1_000_000) / 1_400_000, 0.02, 0.22);
  const affluent = clamp((medianAnnualIncome - 700_000) / 1_500_000, 0.08, 0.28);
  const midIncome = clamp(0.34 + medianAnnualIncome / 5_000_000, 0.28, 0.42);
  const entryIncome = clamp(0.22 - medianAnnualIncome / 8_000_000, 0.08, 0.24);
  const lowerIncome = clamp(1 - croreHouseholds - affluent - midIncome - entryIncome, 0.08, 0.38);

  return {
    '<₹5L': Number((lowerIncome * 100).toFixed(1)),
    '₹5L-₹10L': Number((entryIncome * 100).toFixed(1)),
    '₹10L-₹25L': Number((midIncome * 100).toFixed(1)),
    '₹25L-₹50L': Number((affluent * 100).toFixed(1)),
    '>₹50L': Number((croreHouseholds * 100).toFixed(1)),
  };
}

export async function fetchAllDemographicData(
  latitude: number,
  longitude: number,
  address?: string
): Promise<DemographicData> {
  const [locationIntel, geocode] = await Promise.all([
    computeLocationIntelligence(latitude, longitude),
    reverseGeocode({ lat: latitude, lng: longitude }).catch(() => null),
  ]);

  const poiDensity = locationIntel.poiProximity.poiDensity;
  const urbanDensity = locationIntel.remoteSensing.urbanDensity;
  const demandIndex = locationIntel.marketIntelligence.demandIndex;
  const airQualityIndex = locationIntel.environmentalRisk.airQualityIndex;
  const urbanicity = classifyUrbanicity(demandIndex, poiDensity, urbanDensity);

  const densityPerSqKm = Math.round(
    clamp(poiDensity * 520 + urbanDensity * 115 + demandIndex * 40, 1_200, 62_000)
  );
  const population = Math.round(
    clamp(densityPerSqKm * 4.5 + locationIntel.spatialContext.nearbyBuildings.length * 260, 5_000, 360_000)
  );
  const medianHouseholdIncome = inferMedianIncome(urbanicity, demandIndex, airQualityIndex);
  const medianAge =
    urbanicity === 'metro-core'
      ? 31
      : urbanicity === 'urban'
        ? 33
        : urbanicity === 'peri-urban'
          ? 36
          : 39;
  const unemploymentRate = Number(
    clamp(
      0.032 +
        Math.max(0, 58 - demandIndex) / 900 +
        Math.max(0, airQualityIndex - 150) / 2500,
      0.025,
      0.11
    ).toFixed(3)
  );
  const householdSize =
    urbanicity === 'metro-core'
      ? 3.1
      : urbanicity === 'urban'
        ? 3.5
        : urbanicity === 'peri-urban'
          ? 4
          : 4.4;
  const owners =
    urbanicity === 'metro-core'
      ? 42
      : urbanicity === 'urban'
        ? 56
        : urbanicity === 'peri-urban'
          ? 68
          : 76;
  const growth = Number(
    clamp(
      locationIntel.marketIntelligence.priceTrendYearly * 100 +
        locationIntel.marketIntelligence.absorptionRate * 2.5 -
        Math.max(0, 55 - demandIndex) / 18,
      -1.5,
      8.5
    ).toFixed(1)
  );

  return {
    population,
    medianAge,
    medianHouseholdIncome,
    unemploymentRate,
    educationLevel: {
      highSchool: Math.round(clamp(58 - demandIndex * 0.12, 28, 62)),
      bachelor: Math.round(clamp(18 + demandIndex * 0.28, 18, 46)),
      graduate: Math.round(clamp(8 + demandIndex * 0.18, 8, 24)),
    },
    householdSize,
    ownersVsRenters: {
      owners,
      renters: 100 - owners,
    },
    urbanicity,
    densityPerSqKm,
    administrativeContext: {
      city: geocode?.city || address || 'unknown',
      state: geocode?.state,
      postcode: geocode?.postcode,
      micromarket: geocode?.micromarket,
    },
    proxySignals: {
      poiDensity,
      builtDensity: urbanDensity,
      nightLightIntensity: locationIntel.remoteSensing.nightLightIntensity,
      airQualityIndex,
    },
    trends: {
      growth,
      trend: growth > 1.2 ? 'increasing' : growth < -0.2 ? 'decreasing' : 'stable',
      basis:
        'Derived from open geospatial density, access, night-light, and market momentum signals calibrated for Indian urban form.',
    },
    incomeDistribution: inferIncomeDistribution(medianHouseholdIncome),
    sources: ['OpenStreetMap', 'Overpass API', 'Nominatim', 'Open-Meteo', 'India proxy model'],
  };
}
