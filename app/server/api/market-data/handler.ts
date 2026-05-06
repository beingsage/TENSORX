import { MARKET_DATA, CIRCLE_RATES, INFRASTRUCTURE_SCORES } from '@/lib/mockData';
import { requireRouteUser, routeErrorResponse, RouteError } from '@/lib/api';
import { listMarketData, saveMarketData } from '@/lib/db/client';
import { getModelWorkerStatuses, summarizeWorkerStatuses } from '@/lib/models/status';
import type { MarketDataSnapshot } from '@/lib/db/schema';

type MarketInfo = {
  avgDaysOnMarket: number;
  absorptionRate: number;
  listingDensity: number;
  priceGrowthYoY: number;
};

export async function GET(request: Request) {
  try {
    await requireRouteUser(request);
    const url = new URL(request.url);
    const city = url.searchParams.get('city');
    const micromarket = url.searchParams.get('micromarket');
    const savedSnapshots = await listMarketData(city || undefined);
    const workers = await getModelWorkerStatuses();

    if (!city) {
      return Response.json({
        success: true,
        count: savedSnapshots.length,
        data: savedSnapshots,
        workers,
        workerSummary: summarizeWorkerStatuses(workers),
      });
    }

    // Return mock market data for the city
    const cityData = MARKET_DATA[
      city as keyof typeof MARKET_DATA
    ] as Record<string, MarketInfo> | undefined;

    if (!cityData) {
      throw new RouteError(404, 'NO_MARKET_DATA', `No market data available for city: ${city}`);
    }

    // If micromarket specified, get specific data
    if (micromarket) {
      const marketInfo = cityData[micromarket];
      const circleRate = CIRCLE_RATES[city as keyof typeof CIRCLE_RATES]?.[
        micromarket as keyof (typeof CIRCLE_RATES)[keyof typeof CIRCLE_RATES]
      ];
      const infrastructureScore = INFRASTRUCTURE_SCORES[
        micromarket as keyof typeof INFRASTRUCTURE_SCORES
      ];

      if (!marketInfo) {
        throw new RouteError(404, 'NO_MICROMARKET_DATA', `No data for micromarket: ${micromarket}`);
      }

      return Response.json({
        success: true,
        data: {
          city,
          micromarket,
          ...marketInfo,
          circleRate: circleRate || 800000,
          infrastructureScore: infrastructureScore || 70,
          timestamp: new Date(),
        },
        savedSnapshots,
        workers,
        workerSummary: summarizeWorkerStatuses(workers),
      });
    }

    // Return all micromarkets for this city
    const allMarketsForCity = Object.entries(cityData).map(([mm, data]) => ({
      city,
      micromarket: mm,
      ...data,
      circleRate: CIRCLE_RATES[city as keyof typeof CIRCLE_RATES]?.[
        mm as keyof (typeof CIRCLE_RATES)[keyof typeof CIRCLE_RATES]
      ] || 800000,
      infrastructureScore:
        INFRASTRUCTURE_SCORES[mm as keyof typeof INFRASTRUCTURE_SCORES] || 70,
      timestamp: new Date(),
    }));

    return Response.json({
      success: true,
      count: allMarketsForCity.length,
      data: allMarketsForCity,
      savedSnapshots,
      workers,
      workerSummary: summarizeWorkerStatuses(workers),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

/**
 * POST: Update market data snapshot (for data ingestion)
 */
export async function POST(request: Request) {
  try {
    await requireRouteUser(request);
    const snapshot = (await request.json()) as MarketDataSnapshot;

    if (!snapshot.city || !snapshot.micromarket) {
      throw new RouteError(400, 'INVALID_INPUT', 'city and micromarket are required');
    }

    const saved = await saveMarketData(snapshot);

    return Response.json({
      success: true,
      data: saved,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
