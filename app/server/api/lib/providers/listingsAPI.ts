import { getProperty, listValuations } from '@/lib/db/client';
import type { PropertyDocument, ValuationResult } from '@/lib/db/schema';
import { computeLocationIntelligence } from '@/lib/geospatial/locationIntelligence';
import { clamp, haversineDistanceKm } from '@/lib/utils/geo';

export interface ListingData {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  daysOnMarket: number;
  source: 'magicbricks' | '99acres' | 'housing' | 'aggregator' | 'internal_comps';
  similarity: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  latitude?: number;
  longitude?: number;
}

export interface MarketStats {
  avgPrice: number;
  avgDaysOnMarket: number;
  avgPricePerSqft: number;
  medianPrice: number;
  listingCount: number;
  priceChangePercent: number;
  demandIndex: number;
  supplyIndex: number;
}

function toNumber(value: unknown, fallback = 0) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(/[^0-9.-]/g, ''))
        : Number.NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function similarityFromComparable(
  comparable: {
    area: number;
    beds: number;
    baths: number;
    lat?: number;
    lng?: number;
  },
  target: { latitude: number; longitude: number; area: number }
) {
  const areaScore =
    1 - Math.min(1, Math.abs(comparable.area - target.area) / Math.max(target.area, 1));
  const roomScore =
    comparable.beds > 0 && comparable.baths > 0
      ? clamp((comparable.beds + comparable.baths) / 8, 0.45, 1)
      : 0.68;
  const distanceScore =
    comparable.lat && comparable.lng
      ? 1 -
        Math.min(
          1,
          haversineDistanceKm(
            { lat: comparable.lat, lng: comparable.lng },
            { lat: target.latitude, lng: target.longitude }
          ) / 10
        )
      : 0.72;

  return Number((((areaScore * 0.5 + roomScore * 0.2 + distanceScore * 0.3) * 100) / 100).toFixed(2));
}

function normalizePortalListing(
  item: Record<string, any>,
  source: ListingData['source'],
  target: { address: string; latitude: number; longitude: number; area: number }
): ListingData | null {
  const address = normalizeText(
    item.address || item.location || item.title || item.formatted_address,
    target.address
  );
  const price = toNumber(item.price || item.amount || item.listPrice || item.expectedPrice);
  const squareFeet = toNumber(
    item.squareFeet || item.superBuiltupArea || item.area || item.builtup_area,
    0
  );

  if (!price || !squareFeet) {
    return null;
  }

  const latitude = toNumber(item.latitude || item.lat, Number.NaN);
  const longitude = toNumber(item.longitude || item.lng || item.lon, Number.NaN);

  const beds = Math.max(0, Math.round(toNumber(item.bedrooms || item.bhk || item.bedroomCount)));
  const baths = Math.max(0, Math.round(toNumber(item.bathrooms || item.baths || item.bathroomCount)));

  return {
    id: normalizeText(item.id || item.propertyId || item.listingId, `${source}-${address}`),
    address,
    price,
    bedrooms: beds,
    bathrooms: baths,
    squareFeet,
    yearBuilt: Math.round(toNumber(item.yearBuilt || item.year_built, 0)),
    daysOnMarket: Math.max(1, Math.round(toNumber(item.daysOnMarket || item.days_on_market, 35))),
    source,
    similarity: similarityFromComparable(
      {
        area: squareFeet,
        beds,
        baths,
        lat: Number.isFinite(latitude) ? latitude : undefined,
        lng: Number.isFinite(longitude) ? longitude : undefined,
      },
      target
    ),
    lastSalePrice: toNumber(item.lastSalePrice || item.lastSoldPrice, 0) || undefined,
    lastSaleDate:
      normalizeText(item.lastSaleDate || item.lastSoldDate, '') || undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}

async function fetchConfiguredPortalListings(
  endpoint: string | undefined,
  source: ListingData['source'],
  address: string,
  latitude: number,
  longitude: number,
  area: number
) {
  if (!endpoint) {
    return [];
  }

  try {
    const url = new URL(endpoint);
    url.searchParams.set('address', address);
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('radius_km', '3');

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
      listings?: Array<Record<string, any>>;
      results?: Array<Record<string, any>>;
      data?: Array<Record<string, any>>;
    };

    const rows = data.listings || data.results || data.data || [];
    return rows
      .map((item) =>
        normalizePortalListing(item, source, { address, latitude, longitude, area })
      )
      .filter(Boolean) as ListingData[];
  } catch {
    return [];
  }
}

function deriveInternalComparable(
  property: PropertyDocument | null,
  valuation: ValuationResult,
  target: { latitude: number; longitude: number; area: number }
): ListingData | null {
  if (!property) {
    return null;
  }

  const distanceKm = haversineDistanceKm(
    { lat: property.latitude, lng: property.longitude },
    { lat: target.latitude, lng: target.longitude }
  );

  if (distanceKm > 12) {
    return null;
  }

  return {
    id: valuation.valuationId,
    address: property.address,
    price: valuation.valuation.pointEstimate,
    bedrooms: property.bedrooms || property.bedroomCount || 2,
    bathrooms: property.bathrooms || property.bathroomCount || 2,
    squareFeet: property.builtupArea,
    yearBuilt: new Date().getFullYear() - property.ageInYears,
    daysOnMarket:
      valuation.liquidity?.estimatedTimeToSell ||
      Math.max(18, Math.round(45 + distanceKm * 5)),
    source: 'internal_comps',
    similarity: similarityFromComparable(
      {
        area: property.builtupArea,
        beds: property.bedrooms || property.bedroomCount || 2,
        baths: property.bathrooms || property.bathroomCount || 2,
        lat: property.latitude,
        lng: property.longitude,
      },
      target
    ),
    lastSalePrice: property.lastTransactionPrice,
    lastSaleDate: property.lastTransactionDate,
    latitude: property.latitude,
    longitude: property.longitude,
  };
}

async function fetchInternalComparableListings(
  latitude: number,
  longitude: number,
  builtupArea: number
) {
  try {
    const valuations = await listValuations(36, 0, {});
    const rows = await Promise.all(
      valuations.map(async (valuation) => {
        const property = await getProperty(valuation.propertyId);
        return deriveInternalComparable(property, valuation, {
          latitude,
          longitude,
          area: builtupArea,
        });
      })
    );
    return rows.filter(Boolean) as ListingData[];
  } catch {
    return [];
  }
}

function calculateMarketStats(
  listings: ListingData[],
  marketHints: Awaited<ReturnType<typeof computeLocationIntelligence>>['marketIntelligence']
): MarketStats {
  const validListings = listings.filter(
    (listing) => listing.price > 0 && listing.squareFeet > 0
  );

  if (validListings.length === 0) {
    return {
      avgPrice: 0,
      avgDaysOnMarket: marketHints.daysOnMarket,
      avgPricePerSqft: 0,
      medianPrice: 0,
      listingCount: 0,
      priceChangePercent: Number((marketHints.priceTrendYearly * 100).toFixed(1)),
      demandIndex: marketHints.demandIndex,
      supplyIndex: marketHints.supplyIndex,
    };
  }

  const sortedByPrice = [...validListings].sort((left, right) => left.price - right.price);
  const pricePerSqft = validListings.map(
    (listing) => listing.price / Math.max(listing.squareFeet, 1)
  );

  return {
    avgPrice: Math.round(
      validListings.reduce((sum, listing) => sum + listing.price, 0) / validListings.length
    ),
    avgDaysOnMarket: Math.round(
      validListings.reduce((sum, listing) => sum + listing.daysOnMarket, 0) /
        validListings.length
    ),
    avgPricePerSqft: Math.round(
      pricePerSqft.reduce((sum, value) => sum + value, 0) / pricePerSqft.length
    ),
    medianPrice: sortedByPrice[Math.floor(sortedByPrice.length / 2)]?.price || 0,
    listingCount: validListings.length,
    priceChangePercent: Number((marketHints.priceTrendYearly * 100).toFixed(1)),
    demandIndex: marketHints.demandIndex,
    supplyIndex: marketHints.supplyIndex,
  };
}

function dedupeListings(listings: ListingData[]) {
  const unique = new Map<string, ListingData>();
  for (const listing of listings) {
    const key = `${listing.address.toLowerCase()}:${listing.squareFeet}:${listing.price}`;
    if (!unique.has(key)) {
      unique.set(key, listing);
    }
  }
  return Array.from(unique.values()).sort((left, right) => right.similarity - left.similarity);
}

export async function fetchAllListings(
  address: string,
  latitude: number,
  longitude: number,
  builtupArea = 1200
): Promise<{ listings: ListingData[]; stats: MarketStats; providers: string[] }> {
  const locationIntelPromise = computeLocationIntelligence(latitude, longitude);
  const [marketIntel, magicBricks, ninetyNineAcres, housing, aggregator, internalComparables] =
    await Promise.all([
      locationIntelPromise,
      fetchConfiguredPortalListings(
        process.env.MAGICBRICKS_SEARCH_URL,
        'magicbricks',
        address,
        latitude,
        longitude,
        builtupArea
      ),
      fetchConfiguredPortalListings(
        process.env.NINETY_NINE_ACRES_SEARCH_URL,
        '99acres',
        address,
        latitude,
        longitude,
        builtupArea
      ),
      fetchConfiguredPortalListings(
        process.env.HOUSING_SEARCH_URL,
        'housing',
        address,
        latitude,
        longitude,
        builtupArea
      ),
      fetchConfiguredPortalListings(
        process.env.LISTINGS_AGGREGATOR_URL,
        'aggregator',
        address,
        latitude,
        longitude,
        builtupArea
      ),
      fetchInternalComparableListings(latitude, longitude, builtupArea),
    ]);

  const listings = dedupeListings([
    ...magicBricks,
    ...ninetyNineAcres,
    ...housing,
    ...aggregator,
    ...internalComparables,
  ]).slice(0, 40);

  const providers = ['Internal comparable surface', 'OpenStreetMap market priors'];
  if (magicBricks.length > 0) providers.unshift('MagicBricks');
  if (ninetyNineAcres.length > 0) providers.unshift('99acres');
  if (housing.length > 0) providers.unshift('Housing.com');
  if (aggregator.length > 0) providers.unshift('Custom aggregator');

  return {
    listings,
    stats: calculateMarketStats(listings, marketIntel.marketIntelligence),
    providers,
  };
}
