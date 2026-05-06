// @ts-nocheck
/**
 * LEGAL COMPLEXITY TRANSLATOR
 * Scrapes NJDG (National Judicial Data Grid) court case data
 * + LLM-summarizes legal complexities for properties
 * 
 * Data sources: NJDG API, land title databases, court records
 * Output: legal_risk_score, title_clarity_score, litigation_flags
 */

import axios from 'axios';

export interface LegalDocument {
  documentId: string;
  type: 'title_deed' | 'title_search' | 'court_case' | 'encumbrance' | 'mutation';
  description: string;
  issueDate: Date;
  status: 'clear' | 'pending' | 'disputed' | 'resolved';
  complexity: number; // 0-100
}

export interface LegalComplexityAnalysis {
  propertyId: string;
  latitude: number;
  longitude: number;
  
  // Overall legal risk
  legalRiskScore: number; // 0-100 (higher = riskier)
  titleClarityScore: number; // 0-100 (higher = clearer)
  litigationRiskFlag: boolean;
  
  // Specific risks
  documents: LegalDocument[];
  activeDisputes: number;
  encumbrances: string[];
  mortgageStatus: 'clear' | 'mortgaged' | 'multiple_mortgages';
  
  // LLM analysis
  complexitySummary: string;
  recommendedActions: string[];
  estimatedResolutionTime: number; // Days
  
  // Timeline
  lastUpdate: Date;
  nextReviewDate: Date;
}

/**
 * Fetch NJDG court case data for location
 */
export async function fetchNJDGCases(
  propertyId: string,
  latitude: number,
  longitude: number
): Promise<LegalDocument[]> {
  try {
    // Mock NJDG API integration
    const pincode = getPincodeFromCoords(latitude, longitude);
    
    const njdgData = {
      propertyId,
      location: { lat: latitude, lng: longitude },
      cases: [
        {
          caseNumber: `CS-${pincode}-2024-001`,
          description: 'Boundary dispute with adjacent property',
          status: 'pending',
          complexity: 45,
        },
        {
          caseNumber: `CS-${pincode}-2023-015`,
          description: 'Inheritance title clarity',
          status: 'resolved',
          complexity: 30,
        },
      ],
    };
    
    return njdgData.cases.map((c: any) => ({
      documentId: c.caseNumber,
      type: 'court_case',
      description: c.description,
      issueDate: new Date(),
      status: c.status,
      complexity: c.complexity,
    }));
  } catch (error) {
    console.error('[Legal] NJDG fetch error:', error);
    return [];
  }
}

/**
 * Fetch title deed and encumbrance records
 */
export async function fetchTitleRecords(
  latitude: number,
  longitude: number
): Promise<LegalDocument[]> {
  try {
    // Mock land registry integration
    const titleRecords = [
      {
        documentId: 'TITLE-001',
        type: 'title_deed',
        description: 'Original title deed (Freehold)',
        status: 'clear',
        complexity: 10,
      },
      {
        documentId: 'ENCUMB-001',
        type: 'encumbrance',
        description: 'Bank mortgage against property',
        status: 'pending',
        complexity: 35,
      },
    ];
    
    return titleRecords.map((t: any) => ({
      documentId: t.documentId,
      type: t.type,
      description: t.description,
      issueDate: new Date(),
      status: t.status,
      complexity: t.complexity,
    }));
  } catch (error) {
    console.error('[Legal] Title records fetch error:', error);
    return [];
  }
}

/**
 * Fetch mutation records (ownership changes)
 */
export async function fetchMutationRecords(
  latitude: number,
  longitude: number
): Promise<LegalDocument[]> {
  try {
    const mutations = [
      {
        documentId: 'MUT-2024-001',
        type: 'mutation',
        description: 'Mutation from previous owner',
        status: 'resolved',
        complexity: 25,
      },
    ];
    
    return mutations.map((m: any) => ({
      documentId: m.documentId,
      type: m.type,
      description: m.description,
      issueDate: new Date(),
      status: m.status,
      complexity: m.complexity,
    }));
  } catch (error) {
    console.error('[Legal] Mutation records fetch error:', error);
    return [];
  }
}

/**
 * Use LLM to analyze and summarize legal documents
 */
export async function analyzeLegalDocumentsWithLLM(
  documents: LegalDocument[]
): Promise<{
  summary: string;
  recommendations: string[];
  estimatedResolution: number;
}> {
  try {
    // Mock LLM analysis - would integrate with Claude/GPT
    const totalComplexity = documents.reduce((sum, doc) => sum + doc.complexity, 0) / Math.max(documents.length, 1);
    const activeIssues = documents.filter(d => d.status === 'pending').length;
    
    return {
      summary: `Property has ${activeIssues} active legal issues with average complexity ${totalComplexity.toFixed(1)}/100. Most critical: boundary disputes and mortgage status.`,
      recommendations: [
        'Obtain fresh title search report',
        'Verify encumbrance clearance from bank',
        'Resolve boundary dispute before sale',
        'Update mutation records at municipal office',
      ],
      estimatedResolution: activeIssues > 0 ? 180 : 30,
    };
  } catch (error) {
    console.error('[Legal] LLM analysis error:', error);
    return {
      summary: 'Unable to analyze documents',
      recommendations: [],
      estimatedResolution: 365,
    };
  }
}

/**
 * Compute comprehensive legal complexity analysis
 */
export async function computeLegalComplexityAnalysis(
  propertyId: string,
  latitude: number,
  longitude: number
): Promise<LegalComplexityAnalysis> {
  try {
    // Fetch all document types in parallel
    const [courtCases, titleRecords, mutationRecords] = await Promise.all([
      fetchNJDGCases(propertyId, latitude, longitude),
      fetchTitleRecords(latitude, longitude),
      fetchMutationRecords(latitude, longitude),
    ]);

    const allDocuments = [...courtCases, ...titleRecords, ...mutationRecords];
    
    // LLM analysis
    const llmAnalysis = await analyzeLegalDocumentsWithLLM(allDocuments);
    
    // Calculate risk scores
    const avgComplexity = allDocuments.length > 0 
      ? allDocuments.reduce((sum, doc) => sum + doc.complexity, 0) / allDocuments.length
      : 0;
    
    const activeIssues = allDocuments.filter(d => d.status === 'pending' || d.status === 'disputed').length;
    const legalRiskScore = Math.min(100, avgComplexity + activeIssues * 10);
    
    // Determine mortgage status
    const mortgages = allDocuments.filter(d => d.type === 'encumbrance');
    const mortgageStatus = mortgages.length === 0 ? 'clear' : mortgages.length === 1 ? 'mortgaged' : 'multiple_mortgages';

    return {
      propertyId,
      latitude,
      longitude,
      legalRiskScore,
      titleClarityScore: Math.max(0, 100 - legalRiskScore),
      litigationRiskFlag: activeIssues > 2,
      documents: allDocuments,
      activeDisputes: activeIssues,
      encumbrances: allDocuments
        .filter(d => d.type === 'encumbrance')
        .map(d => d.description),
      mortgageStatus,
      complexitySummary: llmAnalysis.summary,
      recommendedActions: llmAnalysis.recommendations,
      estimatedResolutionTime: llmAnalysis.estimatedResolution,
      lastUpdate: new Date(),
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    console.error('[Legal] Analysis error:', error);
    throw error;
  }
}

/**
 * Apply legal complexity to valuation
 */
export function applyLegalComplexityToValuation(
  baseValuation: number,
  baseTimeTosell: number,
  legalAnalysis: LegalComplexityAnalysis
): {
  adjustedValuation: number;
  adjustedTimeTosell: number;
  legalPenalty: number;
  mortgageClearing: boolean;
} {
  // Legal risk discount: Higher risk = higher discount
  const riskMultiplier = 1 - (legalAnalysis.legalRiskScore / 100) * 0.15; // Max 15% discount
  const adjustedValuation = baseValuation * riskMultiplier;
  
  // Time to sell increase based on resolution time
  const timeAddition = Math.max(0, legalAnalysis.estimatedResolutionTime - 30);
  const adjustedTimeTosell = baseTimeTosell + timeAddition;
  
  return {
    adjustedValuation,
    adjustedTimeTosell,
    legalPenalty: baseValuation - adjustedValuation,
    mortgageClearing: legalAnalysis.mortgageStatus === 'clear',
  };
}

function getPincodeFromCoords(lat: number, lng: number): string {
  return Math.floor(lat * 100000).toString().substring(0, 6);
}

export async function batchAnalyzeLegalComplexity(
  properties: Array<{
    propertyId: string;
    latitude: number;
    longitude: number;
  }>
): Promise<LegalComplexityAnalysis[]> {
  return Promise.all(
    properties.map(p =>
      computeLegalComplexityAnalysis(p.propertyId, p.latitude, p.longitude)
    )
  );
}
// @ts-nocheck
