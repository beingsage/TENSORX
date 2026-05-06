// @ts-nocheck
/**
 * MARKET SIMULATION & AGENT-BASED MODELING
 * Simulate buyer/seller agents, market dynamics, and absorption scenarios
 * Used for Resale Potential Index and time-to-liquidate estimation
 */

export interface BuyerAgent {
  agentId: string;
  buyingPower: number; // Budget in INR
  preferenceProfile: {
    minArea: number;
    maxArea: number;
    propertyType: string[];
    maxCommute: number;
    budgetRange: [number, number];
    investorVsEndUser: number; // 0-1, higher = investor
  };
  location: { lat: number; lng: number };
}

export interface SellerAgent {
  agentId: string;
  propertyId: string;
  askingPrice: number;
  minAcceptablePrice: number;
  daysListed: number;
  motivated: number; // 0-1, higher = more motivated to sell
}

export interface PropertyInventory {
  propertyId: string;
  location: { lat: number; lng: number };
  price: number;
  area: number;
  type: string;
  age: number;
  condition: number; // 0-100
}

/**
 * SYNTHETIC BUYER AGENT GENERATION
 * Create realistic buyer population based on demographics, income distribution
 */
export function generateBuyerAgents(
  numBuyers: number,
  marketData: {
    avgIncome: number;
    incomeStdDev: number;
    medianPrice: number;
    avgCommute: number;
  }
): BuyerAgent[] {
  const buyers: BuyerAgent[] = [];

  for (let i = 0; i < numBuyers; i++) {
    // Income distribution (log-normal approximation)
    const incomeMultiplier = 1 + (Math.random() - 0.5) * 2; // 0.5x to 1.5x median
    const buyingPower = marketData.medianPrice * incomeMultiplier;

    // Preference randomization
    const prefers = Math.random();
    const propertyType =
      prefers < 0.5
        ? ['apartment']
        : prefers < 0.8
          ? ['villa', 'apartment']
          : ['1bhk', '2bhk', 'studio'];

    buyers.push({
      agentId: `buyer_${i}`,
      buyingPower: Math.max(buyingPower, marketData.medianPrice * 0.3),
      preferenceProfile: {
        minArea: 400 + Math.random() * 200,
        maxArea: 2500 + Math.random() * 1500,
        propertyType,
        maxCommute: marketData.avgCommute * (0.8 + Math.random() * 0.4),
        budgetRange: [
          buyingPower * 0.8,
          buyingPower * 1.2,
        ],
        investorVsEndUser: Math.random(),
      },
      location: {
        lat: 28.5 + (Math.random() - 0.5) * 0.5, // Delhi region
        lng: 77.1 + (Math.random() - 0.5) * 0.5,
      },
    });
  }

  return buyers;
}

/**
 * SYNTHETIC SELLER AGENT GENERATION
 */
export function generateSellerAgents(
  properties: PropertyInventory[],
  marketData: { avgPricePerSqft: number }
): SellerAgent[] {
  return properties.map((prop, idx) => ({
    agentId: `seller_${idx}`,
    propertyId: prop.propertyId,
    askingPrice: prop.price * (0.95 + Math.random() * 0.1), // ±5% of valuation
    minAcceptablePrice: prop.price * 0.85, // 15% loss acceptable
    daysListed: Math.floor(Math.random() * 90), // 0-90 days
    motivated: Math.random(), // 0-1
  }));
}

/**
 * MARKET MATCHING ALGORITHM
 * Match willing buyers to listed properties based on preference-price fit
 */
export function marketMatching(
  buyers: BuyerAgent[],
  sellers: SellerAgent[],
  properties: Map<string, PropertyInventory>,
  priceElasticity: number = -0.5
) {
  const matches: Array<{
    buyerId: string;
    sellerId: string;
    propertyId: string;
    negotiatedPrice: number;
    probability: number;
  }> = [];

  sellers.forEach((seller) => {
    const property = properties.get(seller.propertyId);
    if (!property) return;

    // Find matching buyers
    const potentialBuyers = buyers.filter((buyer) => {
      const budgetMatch = seller.askingPrice <= buyer.buyingPower;
      const typeMatch = buyer.preferenceProfile.propertyType.includes(property.type);
      const areaMatch =
        property.area >= buyer.preferenceProfile.minArea &&
        property.area <= buyer.preferenceProfile.maxArea;

      return budgetMatch && typeMatch && areaMatch;
    });

    potentialBuyers.forEach((buyer) => {
      // Price negotiation simulation
      const gap = seller.askingPrice - buyer.budgetRange[1];
      let negotiatedPrice = seller.askingPrice;

      if (gap > 0) {
        // Buyer can't afford; seller may concede
        const sellerConcession = seller.motivated * gap;
        negotiatedPrice = seller.askingPrice - sellerConcession;
      }

      // Match probability based on motivation and price fit
      const priceFit = Math.max(0, 1 - Math.abs(gap) / seller.askingPrice);
      const motivationFit = (seller.motivated + (1 - buyer.preferenceProfile.investorVsEndUser)) / 2;
      const matchProbability = priceFit * motivationFit;

      if (matchProbability > 0.3) {
        // Transaction threshold
        matches.push({
          buyerId: buyer.agentId,
          sellerId: seller.agentId,
          propertyId: seller.propertyId,
          negotiatedPrice,
          probability: matchProbability,
        });
      }
    });
  });

  // Deterministically select matches (highest probability, no double-matching)
  const selectedMatches: typeof matches = [];
  const usedBuyers = new Set<string>();
  const usedSellers = new Set<string>();

  matches
    .sort((a, b) => b.probability - a.probability)
    .forEach((match) => {
      if (!usedBuyers.has(match.buyerId) && !usedSellers.has(match.sellerId)) {
        selectedMatches.push(match);
        usedBuyers.add(match.buyerId);
        usedSellers.add(match.sellerId);
      }
    });

  return {
    allMatches: matches,
    selectedMatches,
    conversionRate: selectedMatches.length / sellers.length,
    averageNegotiatedPrice:
      selectedMatches.reduce((sum, m) => sum + m.negotiatedPrice, 0) / Math.max(selectedMatches.length, 1),
  };
}

/**
 * SUPPLY-DEMAND DYNAMICS SIMULATOR
 * Model market equilibrium based on supply/demand balance
 */
export function supplyDemandEquilibrium(
  numProperties: number,
  numBuyers: number,
  avgAsking: number,
  avgBudget: number
) {
  // Supply = inventory / absorption rate
  // Demand = buyers * purchase frequency
  // Price impact based on supply/demand ratio

  const supplyDemandRatio = numProperties / Math.max(numBuyers, 1);

  let priceMultiplier = 1.0;

  if (supplyDemandRatio > 2) {
    // Oversupply = buyer's market
    priceMultiplier = 0.9 + (1 - Math.min(supplyDemandRatio / 5, 1)) * 0.1;
  } else if (supplyDemandRatio < 0.5) {
    // Undersupply = seller's market
    priceMultiplier = 1.1 + (1 - supplyDemandRatio) * 0.2;
  }

  const equilibriumPrice = avgAsking * priceMultiplier;
  const marketTension = supplyDemandRatio;

  return {
    supplyDemandRatio,
    priceMultiplier,
    equilibriumPrice,
    marketTension,
    marketType: supplyDemandRatio > 1.5 ? 'buyer' : supplyDemandRatio < 0.8 ? 'seller' : 'balanced',
  };
}

/**
 * ABSORPTION VELOCITY PREDICTOR
 * Estimate how fast properties sell in given market
 */
export function absorptionVelocity(
  numProperties: number,
  conversionRate: number, // from matching
  seasonalFactor: number, // 0.7-1.3 based on season
  marketTension: number
) {
  const baseAbsorption = 0.05; // 5% of inventory sells per month
  const monthlyAbsorption = baseAbsorption * conversionRate * seasonalFactor * Math.min(marketTension, 2);

  const propertiesAbsorbedPerMonth = numProperties * monthlyAbsorption;
  const monthsToAbsorbAll = numProperties > 0 ? numProperties / Math.max(propertiesAbsorbedPerMonth, 0.1) : 999;

  return {
    monthlyAbsorptionRate: monthlyAbsorption,
    propertiesAbsorbedPerMonth: Math.round(propertiesAbsorbedPerMonth),
    monthsToAbsorbAll: Math.round(monthsToAbsorbAll),
    daysToAbsorbAll: Math.round(monthsToAbsorbAll * 30),
    absorptionTier:
      monthlyAbsorption > 0.1
        ? 'high'
        : monthlyAbsorption > 0.05
          ? 'medium'
          : 'low',
  };
}

/**
 * PROPERTY AGING SIMULATION
 * Model how property quality/value decays over time
 */
export function propertyAging(
  initialCondition: number, // 0-100
  initialValue: number,
  yearsToSimulate: number,
  annualDepreciationRate: number = 0.02, // 2% per year
  maintenanceEffectiveness: number = 0.5 // 0-1, how much maintenance slows decay
) {
  const yearlyResults: Array<{
    year: number;
    condition: number;
    value: number;
    depreciationRate: number;
  }> = [];

  let currentCondition = initialCondition;
  let currentValue = initialValue;

  for (let year = 0; year <= yearsToSimulate; year++) {
    // Condition decays (can be improved by maintenance)
    const decay = annualDepreciationRate * (1 - maintenanceEffectiveness);
    currentCondition = Math.max(0, currentCondition - decay * 5); // -5 points per 1% depreciation

    // Value decays proportional to condition
    const valueDepreciation = (annualDepreciationRate - decay) * currentValue;
    currentValue = currentValue - valueDepreciation;

    yearlyResults.push({
      year,
      condition: Math.round(currentCondition),
      value: Math.round(currentValue),
      depreciationRate: (valueDepreciation / initialValue) * 100,
    });
  }

  return yearlyResults;
}

/**
 * MARKET SHOCK SCENARIO MODELING
 * Simulate market crashes, interest rate spikes, natural disasters
 */
export function marketShockScenario(
  basePrice: number,
  baseAbsorption: number,
  shockType: 'recession' | 'rateHike' | 'disasterFlood' | 'propertyBurst',
  shockSeverity: number // 0-1
) {
  let priceImpact = 0;
  let absorptionImpact = 0;
  let liquIdityImpact = 0;
  let description = '';

  switch (shockType) {
    case 'recession':
      priceImpact = -0.15 * shockSeverity; // Up to 15% decline
      absorptionImpact = -0.4 * shockSeverity; // Up to 40% slower sales
      liquidityImpact = 1.5 + shockSeverity; // 1.5x to 2.5x longer to sell
      description = `Economic recession: ${Math.round(priceImpact * 100)}% price decline, ${Math.round(absorptionImpact * 100)}% slower absorption`;
      break;

    case 'rateHike':
      priceImpact = -0.08 * shockSeverity; // Interest rate impact
      absorptionImpact = -0.25 * shockSeverity;
      liquidityImpact = 1.3 + shockSeverity * 0.5;
      description = `Interest rate spike: ${Math.round(priceImpact * 100)}% price decline, higher EMI burden`;
      break;

    case 'disasterFlood':
      priceImpact = -0.3 * shockSeverity; // 30% in flood zone
      absorptionImpact = -0.6 * shockSeverity;
      liquidityImpact = 2.0 + shockSeverity;
      description = `Natural disaster (flood): ${Math.round(priceImpact * 100)}% decline, severe liquidity impact`;
      break;

    case 'propertyBurst':
      priceImpact = -0.25 * shockSeverity;
      absorptionImpact = -0.5 * shockSeverity;
      liquidityImpact = 2.5 + shockSeverity;
      description = `Market bubble burst: ${Math.round(priceImpact * 100)}% crash, panic selling`;
      break;
  }

  const shockedPrice = basePrice * (1 + priceImpact);
  const shockedAbsorption = Math.max(0.01, baseAbsorption * (1 + absorptionImpact));
  const shockedTimeToSell = 90 * liquidityImpact; // Base 90 days

  return {
    shockType,
    shockSeverity,
    baselinePrice: basePrice,
    shockedPrice,
    priceImpact,
    baselineAbsorption: baseAbsorption,
    shockedAbsorption,
    absorptionImpact,
    baselineTimeToSell: 90,
    shockedTimeToSell: Math.round(shockedTimeToSell),
    liquidityImpactMultiplier: liquidityImpact,
    description,
  };
}

/**
 * MONTE CARLO SIMULATION FOR TIME-TO-SELL UNCERTAINTY
 * Run many simulations to get distribution of expected sell times
 */
export function monteCarloTimeToSell(
  absorption: number,
  seasonalVariance: number = 0.3,
  marketVolatility: number = 0.2,
  simulations: number = 1000
) {
  const results: number[] = [];

  for (let i = 0; i < simulations; i++) {
    const seasonalFactor = 1 + (Math.random() - 0.5) * seasonalVariance;
    const volatilityFactor = 1 + (Math.random() - 0.5) * marketVolatility;

    const adjustedAbsorption = absorption * seasonalFactor * volatilityFactor;
    const timeToSell = 365 / Math.max(adjustedAbsorption, 0.01); // Days to sell 1 property

    results.push(Math.min(Math.max(timeToSell, 10), 500)); // Clamp 10-500 days
  }

  results.sort((a, b) => a - b);

  return {
    simulations,
    p5: results[Math.floor(simulations * 0.05)],
    p25: results[Math.floor(simulations * 0.25)],
    median: results[Math.floor(simulations * 0.5)],
    p75: results[Math.floor(simulations * 0.75)],
    p95: results[Math.floor(simulations * 0.95)],
    mean: results.reduce((a, b) => a + b, 0) / simulations,
    std: Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r - results[Math.floor(simulations * 0.5)], 2), 0) / simulations),
    distribution: results,
  };
}

/**
 * COMPREHENSIVE MARKET SIMULATION
 * Run full end-to-end simulation for property liquidity assessment
 */
export function runComprehensiveMarketSimulation(config: {
  property: PropertyInventory;
  marketData: { numListings: number; avgPrice: number; avgCommute: number };
  simulationDays: number;
}) {
  // Generate agents
  const buyers = generateBuyerAgents(
    Math.max(10, config.marketData.numListings * 2),
    config.marketData
  );

  const sellers = generateSellerAgents([config.property], config.marketData);

  // Match
  const matching = marketMatching(
    buyers,
    sellers,
    new Map([[config.property.propertyId, config.property]])
  );

  // Dynamics
  const dynamics = supplyDemandEquilibrium(
    config.marketData.numListings,
    buyers.length,
    config.marketData.avgPrice,
    buyers.reduce((sum, b) => sum + b.buyingPower, 0) / buyers.length
  );

  // Absorption
  const absorption = absorptionVelocity(
    config.marketData.numListings,
    matching.conversionRate,
    1.0,
    dynamics.marketTension
  );

  // Monte Carlo
  const mcResults = monteCarloTimeToSell(matching.conversionRate);

  return {
    propertyId: config.property.propertyId,
    simulationOutcome: {
      matchFound: matching.selectedMatches.length > 0,
      expectedNegotiatedPrice: matching.averageNegotiatedPrice,
      conversionRate: matching.conversionRate,
    },
    marketDynamics: dynamics,
    absorptionMetrics: absorption,
    timeToSellDistribution: mcResults,
    marketAssessment: {
      marketType: dynamics.marketType,
      liquidity: matching.conversionRate > 0.3 ? 'high' : matching.conversionRate > 0.1 ? 'medium' : 'low',
      expectedDaysToSell: mcResults.median,
      confidence95Days: `${mcResults.p5}-${mcResults.p95}`,
    },
  };
}
// @ts-nocheck
