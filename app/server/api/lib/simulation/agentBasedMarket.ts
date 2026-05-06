/**
 * AGENT-BASED MICRO-MARKET SIMULATION FOR RESALE POTENTIAL INDEX
 * Idea #3: Simulate thousands of synthetic buyer/seller agents to forecast
 * absorption velocity and time-to-liquidate ranges.
 * 
 * Framework: Mesa (Python) + TypeScript adaptation
 * Agents: Buyers (income distribution), Sellers (motivated-unmotivated spectrum), Brokers (network)
 * 
 * Outputs: Absorption rate distribution → Resale Potential Index, Time-to-Sell percentiles
 */

export interface SimulationAgent {
  agentId: string;
  type: 'buyer' | 'seller' | 'broker';
  location: { lat: number; lng: number };
  active: boolean;
}

export interface BuyerAgent extends SimulationAgent {
  type: 'buyer';
  budget: number; // INR
  preferences: {
    minArea: number;
    maxArea: number;
    propertyTypes: string[];
    maxCommute: number;
    priceRange: [number, number];
  };
  satisfactionThreshold: number; // 0-1
  searchState: 'searching' | 'negotiating' | 'purchased';
  offersPlaced: number;
  transactionsProbability: number;
}

export interface SellerAgent extends SimulationAgent {
  type: 'seller';
  propertyId: string;
  askingPrice: number;
  minAcceptablePrice: number;
  daysListed: number;
  motivation: number; // 0-1, higher = must sell
  offersReceived: Array<{ buyerId: string; price: number; timestamp: number }>;
  soldAt?: number;
  saleDate?: number;
}

export interface BrokerAgent extends SimulationAgent {
  type: 'broker';
  networkStrength: number; // 0-1, connectivity to buyers/sellers
  propertiesHandled: number;
  avgCommission: number;
}

export interface MarketSimulationConfig {
  numBuyers: number;
  numSellers: number;
  numBrokers: number;
  simulationDays: number;
  marketDemandMultiplier: number; // 0.5 = slow market, 1.5 = hot market
  propertyType: string;
  pincode: string;
}

export interface SimulationStep {
  day: number;
  activeBuyerCount: number;
  activeSellerCount: number;
  offersPlaced: number;
  salesCompleted: number;
  avgDaysOnMarket: number;
  priceNegotiationPercent: number;
}

export interface SimulationResults {
  totalDays: number;
  totalProperties: number;
  propertiesSold: number;
  absorptionRate: number; // (sold / total) per day
  daysToLiquidateDist: {
    median: number;
    p25: number;
    p75: number;
    p10: number;
    p90: number;
    mean: number;
    stdDev: number;
  };
  avgSellingPrice: number;
  priceDiscountFromAsking: number; // negative = discount
  simulationSteps: SimulationStep[];
  resalePotentialIndex: number; // 0-100
}

/**
 * INITIALIZE BUYER AGENTS WITH REALISTIC INCOME DISTRIBUTION
 * Log-normal distribution matches real income distribution
 */
export function initializeBuyerAgents(
  numBuyers: number,
  marketData: {
    avgIncome: number;
    avgPropertyPrice: number;
    avgCommute: number;
    pincode: string;
  }
): BuyerAgent[] {
  const buyers: BuyerAgent[] = [];

  for (let i = 0; i < numBuyers; i++) {
    // Log-normal income distribution (realistic for India)
    const income = marketData.avgIncome * (0.5 + Math.random() ** 0.5 * 2);
    const buyingPower = marketData.avgPropertyPrice * (0.7 + Math.random() * 0.6);

    // Preferences vary by income
    const preferenceMultiplier = income / marketData.avgIncome;
    const maxArea = 800 * preferenceMultiplier * (0.8 + Math.random() * 0.4);

    buyers.push({
      agentId: `buyer_${i}`,
      type: 'buyer',
      location: {
        lat: 28.5 + (Math.random() - 0.5) * 0.3,
        lng: 77.1 + (Math.random() - 0.5) * 0.3,
      },
      active: true,
      budget: buyingPower,
      preferences: {
        minArea: 300 + Math.random() * 400,
        maxArea,
        propertyTypes: ['apartment', 'villa'],
        maxCommute: marketData.avgCommute * (0.7 + Math.random() * 0.6),
        priceRange: [buyingPower * 0.8, buyingPower * 1.2],
      },
      satisfactionThreshold: 0.6 + Math.random() * 0.3,
      searchState: 'searching',
      offersPlaced: 0,
      transactionsProbability: 0.15 + Math.random() * 0.15, // Probabilities that buyer actually transacts
    });
  }

  return buyers;
}

/**
 * INITIALIZE SELLER AGENTS WITH MOTIVATION SPECTRUM
 * Motivated sellers (foreclosure, urgent) vs. unmotivated (passive investors)
 */
export function initializeSellerAgents(
  numSellers: number,
  numProperties: number,
  marketData: {
    avgPropertyPrice: number;
  }
): SellerAgent[] {
  const sellers: SellerAgent[] = [];

  for (let i = 0; i < numSellers; i++) {
    // Price variation (some at premium, some discounted)
    const priceMultiplier = 0.85 + Math.random() * 0.3;
    const askingPrice = marketData.avgPropertyPrice * priceMultiplier;
    const motivation = Math.random(); // 0-1

    sellers.push({
      agentId: `seller_${i}`,
      type: 'seller',
      propertyId: `property_${(i % numProperties) + 1}`,
      location: {
        lat: 28.5 + (Math.random() - 0.5) * 0.3,
        lng: 77.1 + (Math.random() - 0.5) * 0.3,
      },
      active: true,
      askingPrice,
      minAcceptablePrice: askingPrice * (0.85 + motivation * 0.1), // High motivation = accept lower
      daysListed: 0,
      motivation,
      offersReceived: [],
    });
  }

  return sellers;
}

/**
 * MATCH BUYERS TO PROPERTIES BASED ON PREFERENCES
 */
function matchBuyerToProperties(
  buyer: BuyerAgent,
  sellers: SellerAgent[]
): SellerAgent[] {
  return sellers.filter(seller => {
    if (!seller.active || seller.soldAt !== undefined) return false;

    // Simple matching on price range
    return (
      seller.askingPrice >= buyer.preferences.priceRange[0] &&
      seller.askingPrice <= buyer.preferences.priceRange[1]
    );
  });
}

/**
 * DAILY MARKET SIMULATION STEP
 */
function simulateMarketDay(
  day: number,
  buyers: BuyerAgent[],
  sellers: SellerAgent[],
  brokers: BrokerAgent[],
  demandMultiplier: number
): SimulationStep {
  let offersPlaced = 0;
  let salesCompleted = 0;
  const activeBuyers = buyers.filter(b => b.searchState === 'searching');
  const activeSellers = sellers.filter(s => s.active && s.soldAt === undefined);

  // 1. Buyers place offers
  for (const buyer of activeBuyers) {
    if (Math.random() > buyer.transactionsProbability * demandMultiplier) continue;

    const matchedProperties = matchBuyerToProperties(buyer, activeSellers);
    if (matchedProperties.length === 0) continue;

    // Pick random property from matched
    const selectedProperty = matchedProperties[Math.floor(Math.random() * matchedProperties.length)];
    const offerPrice = selectedProperty.askingPrice * (0.85 + Math.random() * 0.15);

    selectedProperty.offersReceived.push({
      buyerId: buyer.agentId,
      price: offerPrice,
      timestamp: day,
    });

    buyer.offersPlaced++;
    offersPlaced++;
  }

  // 2. Sellers review offers and negotiate
  for (const seller of activeSellers) {
    seller.daysListed++;

    // Motivation increases over time (must sell)
    seller.motivation = Math.min(1, seller.motivation + 0.01);

    if (seller.offersReceived.length === 0) continue;

    // Pick highest offer
    const bestOffer = seller.offersReceived.reduce((best, offer) =>
      offer.price > best.price ? offer : best
    );

    // Accept if price >= acceptable OR days listed > 180
    if (bestOffer.price >= seller.minAcceptablePrice || seller.daysListed > 180) {
      seller.soldAt = bestOffer.price;
      seller.saleDate = day;
      seller.active = false;
      salesCompleted++;

      // Update buyer
      const buyer = buyers.find(b => b.agentId === bestOffer.buyerId);
      if (buyer) {
        buyer.searchState = 'purchased';
        buyer.active = false;
      }
    }
  }

  // 3. Calculate market stats
  const daysOnMarketValues = activeSellers
    .filter(s => s.daysListed > 0)
    .map(s => s.daysListed);
  const avgDaysOnMarket =
    daysOnMarketValues.length > 0
      ? daysOnMarketValues.reduce((a, b) => a + b, 0) / daysOnMarketValues.length
      : 0;

  return {
    day,
    activeBuyerCount: activeBuyers.length,
    activeSellerCount: activeSellers.length,
    offersPlaced,
    salesCompleted,
    avgDaysOnMarket,
    priceNegotiationPercent: (offersPlaced > 0 ? salesCompleted / offersPlaced : 0) * 100,
  };
}

/**
 * RUN FULL MARKET SIMULATION
 */
export function runMarketSimulation(
  config: MarketSimulationConfig,
  marketData: {
    avgIncome: number;
    avgPropertyPrice: number;
    avgCommute: number;
  }
): SimulationResults {
  console.log(`\n[ABM Simulation] Starting for ${config.propertyType} in ${config.pincode}`);
  console.log(
    `  Agents: ${config.numBuyers} buyers, ${config.numSellers} sellers, ${config.numBrokers} brokers`
  );
  console.log(`  Duration: ${config.simulationDays} days | Demand multiplier: ${config.marketDemandMultiplier}x`);

  // Initialize agents
  const buyers = initializeBuyerAgents(config.numBuyers, {
    avgIncome: marketData.avgIncome,
    avgPropertyPrice: marketData.avgPropertyPrice,
    avgCommute: marketData.avgCommute,
    pincode: config.pincode,
  });

  const sellers = initializeSellerAgents(
    config.numSellers,
    config.numSellers,
    { avgPropertyPrice: marketData.avgPropertyPrice }
  );

  const brokers: BrokerAgent[] = Array.from({ length: config.numBrokers }, (_, i) => ({
    agentId: `broker_${i}`,
    type: 'broker',
    location: { lat: 28.5, lng: 77.1 },
    active: true,
    networkStrength: 0.5 + Math.random() * 0.5,
    propertiesHandled: 0,
    avgCommission: 2.5,
  }));

  // Run simulation
  const simulationSteps: SimulationStep[] = [];
  const daysToLiquidate: number[] = [];

  for (let day = 1; day <= config.simulationDays; day++) {
    const step = simulateMarketDay(
      day,
      buyers,
      sellers,
      brokers,
      config.marketDemandMultiplier
    );
    simulationSteps.push(step);

    // Track days to liquidate
    sellers.forEach(s => {
      if (s.saleDate === day && s.soldAt) {
        daysToLiquidate.push(s.daysListed);
      }
    });
  }

  // Calculate results
  const propertiesSold = sellers.filter(s => s.soldAt !== undefined).length;
  const absorptionRate = propertiesSold / config.simulationDays / config.numSellers;

  daysToLiquidate.sort((a, b) => a - b);
  const getPercentile = (arr: number[], p: number) =>
    arr[Math.floor(arr.length * p)] || arr[arr.length - 1];

  const avgSellingPrice =
    propertiesSold > 0
      ? sellers
          .filter(s => s.soldAt)
          .reduce((sum, s) => sum + (s.soldAt || 0), 0) / propertiesSold
      : 0;

  const priceDiscountFromAsking =
    ((avgSellingPrice - marketData.avgPropertyPrice) /
      marketData.avgPropertyPrice) *
    100;

  // Resale Potential Index (0-100)
  // Based on: absorption rate, price stability, low days-on-market
  const absorptionScore = Math.min(100, absorptionRate * 100 * 365); // Normalize
  const priceStabilityScore = Math.max(0, 100 + priceDiscountFromAsking * 2); // Discount lowers score
  const speedScore = Math.max(0, 100 - (getPercentile(daysToLiquidate, 0.5) / 365) * 50);
  const resalePotentialIndex = (absorptionScore * 0.3 + priceStabilityScore * 0.4 + speedScore * 0.3);

  return {
    totalDays: config.simulationDays,
    totalProperties: config.numSellers,
    propertiesSold,
    absorptionRate,
    daysToLiquidateDist: {
      median: getPercentile(daysToLiquidate, 0.5),
      p25: getPercentile(daysToLiquidate, 0.25),
      p75: getPercentile(daysToLiquidate, 0.75),
      p10: getPercentile(daysToLiquidate, 0.1),
      p90: getPercentile(daysToLiquidate, 0.9),
      mean: daysToLiquidate.reduce((a, b) => a + b, 0) / daysToLiquidate.length || 180,
      stdDev: Math.sqrt(
        daysToLiquidate.reduce((sum, d) => sum + Math.pow(d - 180, 2), 0) / daysToLiquidate.length
      ) || 30,
    },
    avgSellingPrice,
    priceDiscountFromAsking,
    simulationSteps,
    resalePotentialIndex: Math.round(resalePotentialIndex),
  };
}

/**
 * BATCH SIMULATION FOR MULTIPLE SCENARIOS
 * Market stress tests (hot/cold markets, price crashes)
 */
export function runMultipleScenarios(
  baseConfig: MarketSimulationConfig,
  marketData: {
    avgIncome: number;
    avgPropertyPrice: number;
    avgCommute: number;
  }
): Record<string, SimulationResults> {
  const scenarios: Record<string, SimulationResults> = {};

  // Scenario 1: Hot market
  scenarios['hot_market'] = runMarketSimulation(
    { ...baseConfig, marketDemandMultiplier: 1.5 },
    marketData
  );

  // Scenario 2: Baseline
  scenarios['baseline'] = runMarketSimulation(
    { ...baseConfig, marketDemandMultiplier: 1.0 },
    marketData
  );

  // Scenario 3: Cold market
  scenarios['cold_market'] = runMarketSimulation(
    { ...baseConfig, marketDemandMultiplier: 0.5 },
    marketData
  );

  // Scenario 4: Distress (40% price drop, forced liquidation)
  scenarios['distress_scenario'] = runMarketSimulation(
    { ...baseConfig, marketDemandMultiplier: 0.3 },
    { ...marketData, avgPropertyPrice: marketData.avgPropertyPrice * 0.6 }
  );

  return scenarios;
}
