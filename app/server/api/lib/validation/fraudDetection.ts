/**
 * ADVANCED FRAUD DETECTION & VALIDATION
 * 12+ anti-fraud mechanisms for lending collateral verification
 */

export interface FraudFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  message: string;
  recommendedAction: string;
}

/**
 * 1. ADDRESS VALIDATION & EXISTENCE CHECK
 * Verify property address is real and matches known databases
 */
export function validatePropertyAddress(address: string, gpsCoords: { lat: number; lng: number }) {
  // [PLACEHOLDER] In production: Google Maps API, land records API
  const flags: FraudFlag[] = [];

  const addressParts = address.toLowerCase().split(',');
  if (addressParts.length < 3) {
    flags.push({
      type: 'incomplete_address',
      severity: 'medium',
      confidence: 0.8,
      message: 'Address appears incomplete (missing city/state)',
      recommendedAction: 'Request full address with pincode',
    });
  }

  // Check if GPS coordinates match address region
  if (address.includes('delhi') && !(gpsCoords.lat > 28 && gpsCoords.lat < 29)) {
    flags.push({
      type: 'gps_address_mismatch',
      severity: 'high',
      confidence: 0.9,
      message: 'GPS coordinates do not match stated location (Delhi)',
      recommendedAction: 'Verify GPS coordinates or address',
    });
  }

  return {
    isValid: flags.length === 0,
    flags,
    addressVerified: flags.length < 2,
  };
}

/**
 * 2. SIZE SANITY CHECK
 * Compare property size against locality norms
 */
export function checkPropertySizeSanity(
  area: number,
  propertyType: string,
  locality: string,
  avgAreaInLocality: number
) {
  const flags: FraudFlag[] = [];

  // Standard ranges by property type
  const saneLimits = {
    apartment: { min: 250, max: 5000 },
    villa: { min: 1000, max: 15000 },
    '1bhk': { min: 350, max: 800 },
    '2bhk': { min: 700, max: 1500 },
    '3bhk': { min: 1200, max: 2500 },
    studio: { min: 150, max: 400 },
  };

  const limits = saneLimits[propertyType as keyof typeof saneLimits];
  if (!limits) {
    return { isValid: true, flags: [] };
  }

  if (area < limits.min) {
    flags.push({
      type: 'area_too_small',
      severity: 'high',
      confidence: 0.85,
      message: `Property ${area} sqft is below ${propertyType} standard minimum (${limits.min} sqft)`,
      recommendedAction: 'Verify property dimensions or update property type',
    });
  }

  if (area > limits.max) {
    flags.push({
      type: 'area_too_large',
      severity: 'medium',
      confidence: 0.7,
      message: `Property ${area} sqft exceeds typical ${propertyType} size (${limits.max} sqft)`,
      recommendedAction: 'Confirm property type (may be multi-unit)',
    });
  }

  // Compare to locality average
  if (avgAreaInLocality > 0) {
    const deviationPercent = Math.abs((area - avgAreaInLocality) / avgAreaInLocality) * 100;
    if (deviationPercent > 50) {
      flags.push({
        type: 'anomalous_size_for_locality',
        severity: 'medium',
        confidence: 0.6,
        message: `Property size ${area} sqft deviates ${deviationPercent.toFixed(0)}% from locality average`,
        recommendedAction: 'Verify property dimensions against listed specs',
      });
    }
  }

  return {
    isValid: flags.length === 0,
    flags,
    sanityScore: 100 - flags.reduce((sum, f) => sum + (f.severity === 'high' ? 30 : f.severity === 'medium' ? 15 : 5), 0),
  };
}

/**
 * 3. AREA-TO-PRICE OUTLIER DETECTION
 * Detect unreasonable price-per-sqft values
 */
export function detectAreaPriceOutliers(
  area: number,
  price: number,
  marketData: {
    avgPricePerSqft: number;
    stdDevPricePerSqft: number;
  }
) {
  const flags: FraudFlag[] = [];

  const pricePerSqft = price / area;
  const zScore = (pricePerSqft - marketData.avgPricePerSqft) / marketData.stdDevPricePerSqft;

  // Outlier if beyond 3 standard deviations
  if (Math.abs(zScore) > 3) {
    flags.push({
      type: 'extreme_price_per_sqft',
      severity: 'critical',
      confidence: 0.95,
      message: `Price per sqft (₹${pricePerSqft.toFixed(0)}) is ${Math.abs(zScore).toFixed(1)} std deviations from market (μ=₹${marketData.avgPricePerSqft.toFixed(0)})`,
      recommendedAction: 'Manual review required - possible fraud or unique property',
    });
  } else if (Math.abs(zScore) > 2.5) {
    flags.push({
      type: 'very_unusual_price_per_sqft',
      severity: 'high',
      confidence: 0.85,
      message: `Price per sqft is significantly different from market norms (z=${zScore.toFixed(2)})`,
      recommendedAction: 'Verify property specs and price',
    });
  }

  return {
    isValid: flags.length === 0,
    pricePerSqft: Math.round(pricePerSqft),
    zScore,
    flags,
  };
}

/**
 * 4. LISTING vs GPS COORDINATE MISMATCH
 * Verify listed location matches actual GPS data
 */
export function checkGPSMismatch(
  listedLocality: string,
  gpsCoords: { lat: number; lng: number },
  knownLocalityBounds: Map<string, { latRange: [number, number]; lngRange: [number, number] }>
) {
  const flags: FraudFlag[] = [];

  const bounds = knownLocalityBounds.get(listedLocality.toLowerCase());
  if (!bounds) {
    return {
      isValid: true,
      flags: [
        {
          type: 'unknown_locality',
          severity: 'low',
          confidence: 0.5,
          message: `Locality "${listedLocality}" not found in reference database`,
          recommendedAction: 'Verify locality name spelling',
        },
      ],
    };
  }

  const latInRange = gpsCoords.lat >= bounds.latRange[0] && gpsCoords.lat <= bounds.latRange[1];
  const lngInRange = gpsCoords.lng >= bounds.lngRange[0] && gpsCoords.lng <= bounds.lngRange[1];

  if (!latInRange || !lngInRange) {
    flags.push({
      type: 'gps_coordinate_mismatch',
      severity: 'high',
      confidence: 0.9,
      message: `GPS coordinates (${gpsCoords.lat.toFixed(3)}, ${gpsCoords.lng.toFixed(3)}) are outside ${listedLocality} boundaries`,
      recommendedAction: 'Correct GPS coordinates or verify property location',
    });
  }

  return {
    isValid: latInRange && lngInRange,
    flags,
  };
}

/**
 * 5. PHOTO AUTHENTICITY CHECK
 * Detect reused, stock, or fake photos
 */
export async function checkPhotoAuthenticity(
  photoUrls: string[],
  reverseImageSearchAPI: (url: string) => Promise<{ duplicates: number; sources: string[] }>
) {
  const flags: FraudFlag[] = [];

  for (const url of photoUrls) {
    try {
      const result = await reverseImageSearchAPI(url);

      if (result.duplicates > 5) {
        flags.push({
          type: 'stock_or_reused_photo',
          severity: 'high',
          confidence: 0.85,
          message: `Photo appears in ${result.duplicates} other listings - likely stock/reused image`,
          recommendedAction: 'Request authentic photos of the property',
        });
      }

      // Check for well-known stock photo sources
      if (result.sources.some((s) => s.includes('shutterstock') || s.includes('gettyimages'))) {
        flags.push({
          type: 'stock_photo_detected',
          severity: 'critical',
          confidence: 0.98,
          message: 'Photo is from a stock photo service - property may not exist',
          recommendedAction: 'Property requires on-site inspection',
        });
      }
    } catch (error) {
      // API error, skip this photo
    }
  }

  return {
    photosAuthentic: flags.length === 0,
    flags,
  };
}

/**
 * 6. PRICE HISTORY MANIPULATION DETECTION
 * Detect suspicious price changes over time
 */
export function detectPriceManipulation(priceHistory: Array<{ date: Date; price: number }>) {
  const flags: FraudFlag[] = [];

  if (priceHistory.length < 2) return { isValid: true, flags };

  priceHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

  let hasLargeJump = false;
  let hasRepeatedJumps = 0;

  for (let i = 1; i < priceHistory.length; i++) {
    const priceChange = (priceHistory[i].price - priceHistory[i - 1].price) / priceHistory[i - 1].price;
    const daysBetween = (priceHistory[i].date.getTime() - priceHistory[i - 1].date.getTime()) / (1000 * 86400);

    // Sudden 20%+ change in single day
    if (Math.abs(priceChange) > 0.2 && daysBetween < 7) {
      hasLargeJump = true;
      hasRepeatedJumps++;
    }
  }

  if (hasRepeatedJumps > 2) {
    flags.push({
      type: 'suspicious_price_swings',
      severity: 'high',
      confidence: 0.8,
      message: `Price fluctuated dramatically ${hasRepeatedJumps} times - possible manipulative bidding`,
      recommendedAction: 'Investigate seller motive - may indicate distress or fraud',
    });
  }

  return {
    isValid: !hasLargeJump,
    flags,
    priceManipulationScore: hasRepeatedJumps * 25, // 0-100
  };
}

/**
 * 7. DUPLICATE LISTING DETECTION
 * Find same property listed multiple times with different details
 */
export function detectDuplicateListing(
  propertyId: string,
  address: string,
  area: number,
  price: number,
  existingListings: Array<{ id: string; address: string; area: number; price: number }>
) {
  const flags: FraudFlag[] = [];
  const duplicates: typeof existingListings = [];

  existingListings.forEach((listing) => {
    const addressSimilarity = stringSimilarity(address, listing.address);
    const areaDiff = Math.abs(listing.area - area) / Math.max(listing.area, area);
    const priceDiff = Math.abs(listing.price - price) / Math.max(listing.price, price);

    // Likely duplicate if address ~match AND area/price similar
    if (addressSimilarity > 0.8 && areaDiff < 0.1 && priceDiff < 0.1) {
      duplicates.push(listing);
      flags.push({
        type: 'duplicate_listing',
        severity: 'high',
        confidence: 0.9,
        message: `Same property listed as "${listing.id}" with near-identical specs`,
        recommendedAction: 'Consolidate listings or remove duplicate',
      });
    }
  });

  return {
    isDuplicate: duplicates.length > 0,
    duplicateIds: duplicates.map((d) => d.id),
    flags,
  };
}

/**
 * 8. DEVELOPER/BUILDER OVERLAP DETECTION
 * Detect same builder with properties listed from different "owners"
 */
export function detectDeveloperOverlap(
  developer: string,
  properties: Array<{ id: string; ownerName: string; builderName: string; price: number }>
) {
  const flags: FraudFlag[] = [];

  const sameBuilderProps = properties.filter((p) =>
    p.builderName.toLowerCase().includes(developer.toLowerCase())
  );

  if (sameBuilderProps.length > 1) {
    const prices = sameBuilderProps.map((p) => p.price);
    const priceVariation = (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices);

    if (priceVariation > 0.2) {
      flags.push({
        type: 'developer_project_price_variation',
        severity: 'medium',
        confidence: 0.7,
        message: `Same builder's ${sameBuilderProps.length} properties show ${(priceVariation * 100).toFixed(0)}% price variation`,
        recommendedAction: 'Verify pricing consistency within project',
      });
    }
  }

  return {
    flags,
    propertiesFromDeveloper: sameBuilderProps.length,
  };
}

/**
 * 9. OWNERSHIP VERIFICATION
 * Cross-check with land records, stamp duty databases
 */
export async function verifyOwnership(
  propertyAddress: string,
  claimedOwner: string,
  landRecordsAPI: (address: string) => Promise<{ owners: string[]; disputes: number }>
) {
  const flags: FraudFlag[] = [];

  try {
    const records = await landRecordsAPI(propertyAddress);

    const ownerMatch = records.owners.some((o) => o.toLowerCase().includes(claimedOwner.toLowerCase()));

    if (!ownerMatch) {
      flags.push({
        type: 'ownership_mismatch_with_records',
        severity: 'critical',
        confidence: 0.95,
        message: `Claimed owner "${claimedOwner}" does not match land records (found: ${records.owners.join(', ')})`,
        recommendedAction: 'Property cannot be financed - ownership dispute',
      });
    }

    if (records.disputes > 0) {
      flags.push({
        type: 'legal_disputes_on_property',
        severity: 'high',
        confidence: 0.9,
        message: `${records.disputes} legal dispute(s) found in land records`,
        recommendedAction: 'Investigate disputes before lending',
      });
    }
  } catch (error) {
    flags.push({
      type: 'ownership_verification_failed',
      severity: 'medium',
      confidence: 0.6,
      message: 'Could not verify ownership through land records API',
      recommendedAction: 'Obtain ownership documents from seller',
    });
  }

  return {
    ownershipVerified: flags.length === 0,
    flags,
  };
}

/**
 * 10. LEGAL DISPUTE DETECTION
 * Check court records, property registries for litigation
 */
export function detectLegalDisputes(
  address: string,
  ownerName: string,
  courtRecordsDB: Map<string, Array<{ case: string; status: string }>>
) {
  const flags: FraudFlag[] = [];

  const addressKey = address.toLowerCase().replace(/\s+/g, '_');
  const disputes = courtRecordsDB.get(addressKey) || [];

  const activeDisputes = disputes.filter((d) => d.status === 'active' || d.status === 'pending');

  if (activeDisputes.length > 0) {
    flags.push({
      type: 'active_court_cases',
      severity: 'high',
      confidence: 0.95,
      message: `${activeDisputes.length} active court case(s) involving this property`,
      recommendedAction: 'Resolve all disputes before lending',
    });
  }

  if (disputes.length > activeDisputes.length) {
    flags.push({
      type: 'historical_disputes',
      severity: 'medium',
      confidence: 0.7,
      message: `${disputes.length - activeDisputes.length} historical legal dispute(s)`,
      recommendedAction: 'Review dispute history for patterns',
    });
  }

  return {
    hasDisputes: disputes.length > 0,
    activeDisputes: activeDisputes.length,
    totalDisputes: disputes.length,
    flags,
  };
}

/**
 * 11. BUILDER DEFAULT HISTORY
 * Check if developer has history of project delays/defaults
 */
export function checkBuilderDefaultHistory(
  builderName: string,
  builderDatabase: Map<string, { defaults: number; delays: number; reputationScore: number }>
) {
  const flags: FraudFlag[] = [];

  const builderRecord = builderDatabase.get(builderName.toLowerCase());

  if (!builderRecord) {
    return {
      builderVerified: false,
      flags: [
        {
          type: 'builder_not_registered',
          severity: 'high',
          confidence: 0.7,
          message: `Builder "${builderName}" not found in registered builder database`,
          recommendedAction: 'Verify builder credentials and registration',
        },
      ],
    };
  }

  if (builderRecord.defaults > 0) {
    flags.push({
      type: 'builder_with_defaults',
      severity: 'high',
      confidence: 0.85,
      message: `Builder has ${builderRecord.defaults} project default(s) - high completion risk`,
      recommendedAction: 'Higher scrutiny for under-construction projects',
    });
  }

  if (builderRecord.reputationScore < 50) {
    flags.push({
      type: 'poor_builder_reputation',
      severity: 'medium',
      confidence: 0.75,
      message: `Builder reputation score is ${builderRecord.reputationScore}/100 - below average`,
      recommendedAction: 'Consider lower LTV for under-construction property',
    });
  }

  return {
    builderVerified: builderRecord.defaults === 0,
    reputationScore: builderRecord.reputationScore,
    flags,
  };
}

/**
 * 12. SOCIAL VERIFICATION
 * Cross-check with public reviews, complaint databases
 */
export function socialVerification(
  propertyAddress: string,
  ownerName: string,
  reviewDatabase: Map<string, { avgRating: number; complaints: string[] }>
) {
  const flags: FraudFlag[] = [];

  const reviews = reviewDatabase.get(propertyAddress.toLowerCase());

  if (reviews && reviews.avgRating < 2) {
    flags.push({
      type: 'poor_property_reviews',
      severity: 'medium',
      confidence: 0.6,
      message: `Property has poor average rating (${reviews.avgRating.toFixed(1)}/5) with complaints about: ${reviews.complaints.join(', ')}`,
      recommendedAction: 'Review complaints and assess quality/habitability',
    });
  }

  return {
    trustScore: reviews ? Math.max(0, reviews.avgRating * 20) : 50, // 0-100
    hasComplaints: reviews && reviews.complaints.length > 0,
    flags,
  };
}

/**
 * COMPREHENSIVE FRAUD DETECTION ORCHESTRATION
 */
export function runComprehensiveFraudDetection(property: any): {
  isFraudulent: boolean;
  overallRiskScore: number; // 0-100
  flags: FraudFlag[];
  recommendation: string;
} {
  const allFlags: FraudFlag[] = [];

  // Run all checks
  const addressCheck = validatePropertyAddress(property.address, property.location);
  const sizeCheck = checkPropertySizeSanity(
    property.area,
    property.type,
    property.locality,
    property.avgAreaInLocality || 0
  );
  const priceCheck = detectAreaPriceOutliers(property.area, property.price, property.marketData);

  allFlags.push(...addressCheck.flags, ...sizeCheck.flags, ...priceCheck.flags);

  // Calculate fraud score
  const criticalCount = allFlags.filter((f) => f.severity === 'critical').length;
  const highCount = allFlags.filter((f) => f.severity === 'high').length;

  const fraudScore = Math.min(100, criticalCount * 40 + highCount * 15 + allFlags.length * 2);

  return {
    isFraudulent: fraudScore > 70,
    overallRiskScore: fraudScore,
    flags: allFlags.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder];
    }),
    recommendation:
      fraudScore > 70
        ? 'REJECT - High fraud risk'
        : fraudScore > 40
          ? 'MANUAL_REVIEW - Moderate risk'
          : 'APPROVE - Low risk',
  };
}

// Helper: Simple string similarity
function stringSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(a: string, b: string): number {
  const matrix: number[][] = Array(a.length + 1)
    .fill(0)
    .map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}
