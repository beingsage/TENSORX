import { NextResponse } from 'next/server';
import { requireRouteUser, routeErrorResponse } from '@/lib/api';
import { getPropertyStats, getValuationStats, listProperties, listValuations } from '@/lib/db/client';

export async function GET(request: Request) {
  try {
    const user = await requireRouteUser(request);
    const [propertyStats, valuationStats, recentProperties, recentValuations] = await Promise.all([
      getPropertyStats({ userId: user.userId }),
      getValuationStats({ userId: user.userId }),
      listProperties(5, 0, { userId: user.userId }),
      listValuations(5, 0, { userId: user.userId }),
    ]);

    const riskFlagStats = recentValuations.reduce((acc, valuation) => {
      valuation.riskFlags.forEach((flag) => {
        acc[flag.flag] = (acc[flag.flag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      timestamp: new Date(),
      properties: propertyStats,
      valuations: valuationStats,
      riskFlags: riskFlagStats,
      liquidity: {
        avgResalePotentialIndex: Math.round(
          recentValuations.reduce((sum, valuation) => sum + valuation.liquidity.resalePotentialIndex, 0) /
            Math.max(1, recentValuations.length)
        ),
        avgTimeToSell: Math.round(
          recentValuations.reduce((sum, valuation) => sum + valuation.liquidity.estimatedTimeToSell, 0) /
            Math.max(1, recentValuations.length)
        ),
      },
      recentData: {
        properties: recentProperties,
        valuations: recentValuations,
      },
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
