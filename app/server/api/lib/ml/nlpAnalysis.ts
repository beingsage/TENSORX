/**
 * NLP & LLM ANALYSIS PIPELINE
 * Text feature extraction, legal document analysis, sentiment analysis
 * [MODEL_TRAINING_REQUIRED] - BERT, GPT, legal NLP fine-tuning
 */

export interface NLPAnalysisResult {
  descriptionSentiment: number; // -1 to 1
  amenityDensity: number; // Count of amenities mentioned
  qualityKeywords: number; // 0-100 premium language score
  legalComplexity: number; // 0-100 complexity from docs
  titleClarity: number; // 0-100 (100 = crystal clear)
  hosingStandardLevel: 'luxury' | 'premium' | 'mid' | 'basic';
  parkingType: 'covered' | 'open' | 'none' | 'unknown';
  ownershipType: 'freehold' | 'leasehold' | 'cooperative' | 'unknown';
  legalRiskFactors: LegalRiskFactor[];
  extractedFeatures: Record<string, string | number | boolean>;
}

export interface LegalRiskFactor {
  factor: string; // dispute, unclear-title, encroachment, etc.
  severity: 'low' | 'medium' | 'high';
  evidence: string; // Text snippet from document
}

/**
 * ANALYZE PROPERTY LISTING DESCRIPTION
 * Extract features, sentiment, quality signals
 */
export function analyzeListingDescription(description: string): NLPAnalysisResult {
  // [MODEL_TRAINING_REQUIRED] - BERT sentiment analysis, NER for entities
  // Real flow:
  // 1. Tokenize text
  // 2. Run through BERT encoder
  // 3. Classify sentiment (negative, neutral, positive)
  // 4. Extract named entities (amenities, locations, prices)
  // 5. Compute embeddings for semantic similarity

  if (!description || description.trim().length === 0) {
    return getEmptyNLPResult();
  }

  const sentiment = computeSentiment(description);
  const amenities = extractAmenities(description);
  const qualityScore = computeQualityScore(description);
  const hosingStandard = classifyHousingStandard(description);
  const parkingType = extractParking(description);
  const ownershipType = extractOwnershipType(description);

  return {
    descriptionSentiment: sentiment,
    amenityDensity: amenities.length,
    qualityKeywords: qualityScore,
    legalComplexity: 30, // Mock - would analyze legal docs
    titleClarity: 80, // Mock
    hosingStandardLevel: hosingStandard,
    parkingType,
    ownershipType,
    legalRiskFactors: [],
    extractedFeatures: {
      amenities: amenities.join(', '),
      poolPresent: amenities.includes('pool'),
      gymPresent: amenities.includes('gym'),
      gardenPresent: amenities.includes('garden'),
      maintenanceIncluded: description.toLowerCase().includes('maintenance'),
      petFriendly: description.toLowerCase().includes('pet'),
    },
  };
}

/**
 * ANALYZE LEGAL DOCUMENTS (OCR -> LLM extraction)
 */
export function analyzeLegalDocuments(ocrText: string): LegalAnalysisResult {
  // [MODEL_TRAINING_REQUIRED] - Legal document fine-tuned LLM (e.g., LLaMA for contracts)
  // Real flow:
  // 1. OCR text from document images
  // 2. Feed to legal-domain LLM
  // 3. Extract: title status, disputes, encumbrances, lease terms
  // 4. Compute legal risk score

  if (!ocrText || ocrText.trim().length === 0) {
    return {
      titleClarity: 50,
      legalRiskScore: 40,
      disputes: [],
      encumbrances: [],
      leaseTerms: null,
      summary: 'No documents provided',
    };
  }

  const titleClarity = analyzeTitleClarity(ocrText);
  const disputes = extractDisputes(ocrText);
  const encumbrances = extractEncumbrances(ocrText);
  const leaseTerms = extractLeaseTerms(ocrText);

  const legalRiskScore = computeLegalRiskScore(disputes, encumbrances, leaseTerms);

  return {
    titleClarity,
    legalRiskScore,
    disputes,
    encumbrances,
    leaseTerms,
    summary: `${disputes.length} dispute(s), ${encumbrances.length} encumbrance(s) found`,
  };
}

export interface LegalAnalysisResult {
  titleClarity: number; // 0-100
  legalRiskScore: number; // 0-100
  disputes: string[];
  encumbrances: string[];
  leaseTerms: LeaseTerms | null;
  summary: string;
}

export interface LeaseTerms {
  leaseStartDate: string;
  leaseEndDate: string;
  leaseRemainingYears: number;
  renewalTerms: string;
  breakClause: boolean;
}

/**
 * COURT DATA & TITLE CLARITY ANALYSIS
 * Public court dispute databases -> LLM extraction
 */
export function analyzeCourtDataForTitleClarity(
  propertyAddress: string,
  pincode: string
): TitleClarityAnalysis {
  // [DATA SOURCE] - Public court dispute databases, CERSAI, property records
  // [MODEL] - LLM to summarize and score disputes
  // Real flow:
  // 1. Query court databases for disputes involving property address
  // 2. Extract case summaries, status, parties
  // 3. Feed to LLM for risk assessment
  // 4. Generate title clarity score (0-100, higher = clearer)

  // Mock implementation
  const mockDisputes = [
    {
      caseNo: 'SUPL/001/2019',
      status: 'pending',
      parties: 'Property Owner vs. Neighbor',
      summary: 'Boundary dispute regarding shared wall',
      riskLevel: 'low',
    },
  ];

  const disputeCount = mockDisputes.length;
  const titleClarity = Math.max(0, 100 - disputeCount * 20); // 20 points per dispute

  return {
    address: propertyAddress,
    pincode,
    titleClarity,
    disputesFound: mockDisputes,
    riskAssessment: `${disputeCount} dispute(s) found. Title clarity: ${titleClarity}/100`,
  };
}

export interface TitleClarityAnalysis {
  address: string;
  pincode: string;
  titleClarity: number;
  disputesFound: Array<{ caseNo: string; status: string; parties: string; summary: string; riskLevel: string }>;
  riskAssessment: string;
}

/**
 * SOCIAL SENTIMENT ANALYSIS
 * X, LinkedIn, Quora sentiment about locality
 */
export function analyzeSocialSentiment(locality: string, pincode: string): SocialSentimentResult {
  // [DATA SOURCE] - Social media APIs (X API, Reddit, Quora)
  // [MODEL] - Sentiment analysis (RoBERTa, DistilBERT)
  // Real flow:
  // 1. Query social media platforms for mentions of locality
  // 2. Extract posts/tweets/comments
  // 3. Run sentiment analysis
  // 4. Aggregate into locality sentiment score

  // Mock implementation
  const mockPosts = [
    { text: 'Great locality, excellent connectivity!', sentiment: 0.8 },
    { text: 'Traffic is terrible in this area', sentiment: -0.5 },
    { text: 'Good schools and parks nearby', sentiment: 0.7 },
  ];

  const avgSentiment = mockPosts.reduce((sum, p) => sum + p.sentiment, 0) / mockPosts.length;
  const sentimentTier = avgSentiment > 0.5 ? 'positive' : avgSentiment > 0 ? 'neutral' : 'negative';

  return {
    locality,
    pincode,
    overallSentiment: Math.round((avgSentiment + 1) * 50), // Convert -1 to 1 -> 0 to 100
    sentimentTier,
    topPositiveThemes: ['connectivity', 'schools', 'safety'],
    topNegativeThemes: ['traffic', 'pollution'],
    dataPoints: mockPosts.length,
  };
}

export interface SocialSentimentResult {
  locality: string;
  pincode: string;
  overallSentiment: number; // 0-100
  sentimentTier: 'positive' | 'neutral' | 'negative';
  topPositiveThemes: string[];
  topNegativeThemes: string[];
  dataPoints: number;
}

// ============ HELPER FUNCTIONS ============

function getEmptyNLPResult(): NLPAnalysisResult {
  return {
    descriptionSentiment: 0,
    amenityDensity: 0,
    qualityKeywords: 0,
    legalComplexity: 0,
    titleClarity: 0,
    hosingStandardLevel: 'basic',
    parkingType: 'unknown',
    ownershipType: 'unknown',
    legalRiskFactors: [],
    extractedFeatures: {},
  };
}

/**
 * SENTIMENT ANALYSIS
 * Mock: Rule-based; Real: BERT/RoBERTa fine-tuned on property descriptions
 */
function computeSentiment(text: string): number {
  // Mock: Simple keyword-based sentiment
  const positive = ['excellent', 'premium', 'spacious', 'beautiful', 'modern', 'well-maintained', 'luxury'];
  const negative = ['old', 'cramped', 'damaged', 'poor', 'neglected', 'noisy'];

  let score = 0;
  let count = 0;

  positive.forEach((word) => {
    if (text.toLowerCase().includes(word)) {
      score += 1;
      count += 1;
    }
  });

  negative.forEach((word) => {
    if (text.toLowerCase().includes(word)) {
      score -= 1;
      count += 1;
    }
  });

  return count > 0 ? score / count : 0;
}

/**
 * EXTRACT AMENITIES FROM TEXT
 */
function extractAmenities(text: string): string[] {
  const amenities = [
    'pool',
    'gym',
    'garden',
    'parking',
    'playground',
    'security',
    'elevator',
    'balcony',
    'terrace',
    'air conditioning',
  ];

  return amenities.filter((amenity) => text.toLowerCase().includes(amenity));
}

/**
 * QUALITY SCORE FROM LANGUAGE
 */
function computeQualityScore(text: string): number {
  const premiumWords = [
    'luxurious',
    'premium',
    'exclusive',
    'spacious',
    'designer',
    'high-end',
    'marble',
    'granite',
  ];
  const basicWords = ['small', 'compact', 'basic', 'standard'];

  let premium = 0,
    basic = 0;

  premiumWords.forEach((word) => {
    if (text.toLowerCase().includes(word)) premium += 1;
  });

  basicWords.forEach((word) => {
    if (text.toLowerCase().includes(word)) basic += 1;
  });

  return Math.round(((premium - basic) / (premium + basic + 1)) * 50 + 50);
}

/**
 * CLASSIFY HOUSING STANDARD
 */
function classifyHousingStandard(
  text: string
): 'luxury' | 'premium' | 'mid' | 'basic' {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('luxury') || lowerText.includes('exclusive')) return 'luxury';
  if (lowerText.includes('premium') || lowerText.includes('high-end')) return 'premium';
  if (lowerText.includes('spacious') || lowerText.includes('modern')) return 'mid';
  return 'basic';
}

/**
 * EXTRACT PARKING INFO
 */
function extractParking(text: string): 'covered' | 'open' | 'none' | 'unknown' {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('covered parking')) return 'covered';
  if (lowerText.includes('parking') || lowerText.includes('garage')) return 'open';
  if (lowerText.includes('no parking') || lowerText.includes('street parking')) return 'none';
  return 'unknown';
}

/**
 * EXTRACT OWNERSHIP TYPE
 */
function extractOwnershipType(text: string): 'freehold' | 'leasehold' | 'cooperative' | 'unknown' {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('freehold')) return 'freehold';
  if (lowerText.includes('leasehold')) return 'leasehold';
  if (lowerText.includes('cooperative')) return 'cooperative';
  return 'unknown';
}

/**
 * ANALYZE TITLE CLARITY FROM OCR TEXT
 */
function analyzeTitleClarity(ocrText: string): number {
  // Higher = clearer title
  const clarityIndicators = [
    'clear title',
    'freehold property',
    'registered under',
    'deed of conveyance',
    'no disputes',
  ];

  const redFlags = ['disputed', 'encumbered', 'mortgaged', 'under litigation', 'contested'];

  let clarity = 50;

  clarityIndicators.forEach((indicator) => {
    if (ocrText.toLowerCase().includes(indicator)) clarity += 10;
  });

  redFlags.forEach((flag) => {
    if (ocrText.toLowerCase().includes(flag)) clarity -= 15;
  });

  return Math.max(0, Math.min(100, clarity));
}

/**
 * EXTRACT DISPUTES FROM LEGAL TEXT
 */
function extractDisputes(ocrText: string): string[] {
  const disputes = [];

  if (ocrText.toLowerCase().includes('boundary')) disputes.push('Boundary dispute');
  if (ocrText.toLowerCase().includes('encroachment')) disputes.push('Encroachment claim');
  if (ocrText.toLowerCase().includes('easement')) disputes.push('Easement rights');
  if (ocrText.toLowerCase().includes('will')) disputes.push('Inheritance dispute');

  return disputes;
}

/**
 * EXTRACT ENCUMBRANCES
 */
function extractEncumbrances(ocrText: string): string[] {
  const encumbrances = [];

  if (ocrText.toLowerCase().includes('mortgage')) encumbrances.push('Mortgage');
  if (ocrText.toLowerCase().includes('lien')) encumbrances.push('Lien');
  if (ocrText.toLowerCase().includes('lease')) encumbrances.push('Lease');
  if (ocrText.toLowerCase().includes('rental agreement')) encumbrances.push('Rental agreement');

  return encumbrances;
}

/**
 * EXTRACT LEASE TERMS
 */
function extractLeaseTerms(ocrText: string): LeaseTerms | null {
  if (!ocrText.toLowerCase().includes('lease')) return null;

  // Mock: Extract dates from text (in production: use NER)
  return {
    leaseStartDate: '2020-01-01',
    leaseEndDate: '2050-01-01',
    leaseRemainingYears: 25,
    renewalTerms: 'Renewable',
    breakClause: false,
  };
}

/**
 * COMPUTE LEGAL RISK SCORE
 */
function computeLegalRiskScore(
  disputes: string[],
  encumbrances: string[],
  leaseTerms: LeaseTerms | null
): number {
  let risk = 20; // Base risk

  // Disputes add risk
  risk += disputes.length * 15;

  // Some encumbrances are worse than others
  encumbrances.forEach((enc) => {
    if (enc === 'Mortgage') risk += 10;
    if (enc === 'Lien') risk += 20;
    if (enc === 'Lease') risk += 5;
  });

  // Lease terms affect risk
  if (leaseTerms && leaseTerms.leaseRemainingYears < 10) {
    risk += 25;
  }

  return Math.min(100, risk);
}
