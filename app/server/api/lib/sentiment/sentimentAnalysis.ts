// @ts-nocheck
/**
 * SENTIMENT/NEWS ANALYSIS FOR REAL ESTATE PREDICTIONS
 * Idea #5: Monitor real-estate focused news, property reviews, and sentiment signals
 * as early indicators for neighborhood appreciation or deterioration.
 * 
 * Data sources: NewsAPI, Twitter API, Reddit, Property Review platforms
 * Output: sentiment_trend, news_momentum, emerging_issues_flag, sentiment_score
 * 
 * This captures narrative shifts faster than price data (leading indicator)
 */

import axios from 'axios';

export interface NewsSource {
  source: string; // 'news_api', 'twitter', 'reddit', 'property_reviews'
  url: string;
  title: string;
  description: string;
  publishedAt: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to +1
  relevanceScore: number; // 0-1, how relevant to real estate
  keywords: string[];
}

export interface SentimentAnalysisResult {
  propertyId: string;
  location: string;
  latitude: number;
  longitude: number;

  // Aggregated sentiment metrics
  overallSentimentScore: number; // -100 to +100
  sentimentTrend: 'improving' | 'stable' | 'deteriorating';
  sentimentConfidence: number; // 0-1
  volatility: number; // 0-1, how much sentiment is swinging

  // Breakdown by source
  sentimentBySource: Record<string, {
    score: number;
    volumeOfMentions: number;
    trend: string;
  }>;

  // News signals
  newsVolume: number; // Articles published in last 30 days
  newsVolumeMonth: number; // Change vs. previous month
  keyNewsTopics: Array<{
    topic: string;
    frequency: number;
    sentiment: string;
    impact: 'high' | 'medium' | 'low';
  }>;

  // Emerging issues detection
  emergingIssues: Array<{
    issue: string;
    sentiment: string;
    firstMentionedDaysAgo: number;
    mentionTrend: 'increasing' | 'stable' | 'decreasing';
  }>;

  // Opportunities
  opportunitySignals: Array<{
    signal: string;
    strength: number; // 0-1
    timeframe: string;
  }>;

  // Recent sources
  recentArticles: NewsSource[];

  lastUpdated: Date;
  dataQuality: number; // 0-1, confidence in analysis
}

/**
 * FETCH NEWS ARTICLES ABOUT LOCATION
 * Uses NewsAPI to get real-time news
 */
export async function fetchNewsArticles(
  locationName: string,
  vicinity?: string
): Promise<NewsSource[]> {
  try {
    // In production: Use NewsAPI
    // const response = await axios.get('https://newsapi.org/v2/everything', {
    //   params: {
    //     q: `${locationName} real estate property market`,
    //     sortBy: 'publishedAt',
    //     language: 'en',
    //     apiKey: process.env.NEWS_API_KEY,
    //     pageSize: 50
    //   }
    // });

    // Mock implementation - simulate real estate news
    const mockNews: NewsSource[] = [
      {
        source: 'news_api',
        url: `https://realestate.news/article/${locationName.toLowerCase()}-growth`,
        title: `${locationName} Property Market Shows 12% Growth in Q4`,
        description: `New infrastructure development driving property appreciation in ${locationName}`,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        sentiment: 'positive',
        sentimentScore: 0.75,
        relevanceScore: 0.95,
        keywords: ['property appreciation', 'infrastructure', 'investment opportunity'],
      },
      {
        source: 'news_api',
        url: `https://realestate.news/article/${locationName.toLowerCase()}-metro`,
        title: `Metro Extension Planned for ${locationName} Suburb`,
        description: `Government announces new metro line through ${locationName}`,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        sentiment: 'positive',
        sentimentScore: 0.82,
        relevanceScore: 0.98,
        keywords: ['metro extension', 'connectivity', 'infrastructure'],
      },
      {
        source: 'news_api',
        url: `https://realestate.news/article/${locationName.toLowerCase()}-concerns`,
        title: `Traffic Congestion Concerns Raised in ${locationName}`,
        description: `Residents voice concerns about increasing traffic in ${locationName}`,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        sentiment: 'negative',
        sentimentScore: -0.45,
        relevanceScore: 0.72,
        keywords: ['traffic', 'congestion', 'infrastructure burden'],
      },
    ];

    // Add slight randomization for realism
    return mockNews.map(article => ({
      ...article,
      sentimentScore: article.sentimentScore + (Math.random() - 0.5) * 0.1,
    }));
  } catch (error) {
    console.error('[News API] Error fetching articles:', error);
    return [];
  }
}

/**
 * FETCH SOCIAL MEDIA SENTIMENT (Twitter/Reddit)
 * Detects grassroots sentiment and emerging issues
 */
export async function fetchSocialMediaSentiment(
  locationName: string,
  keywords: string[]
): Promise<NewsSource[]> {
  // Mock implementation - simulate Twitter/Reddit posts about location
  const mockSocialPosts: NewsSource[] = [];

  const sentiments = ['positive', 'negative', 'neutral'] as const;

  // Generate 5-10 realistic social posts
  for (let i = 0; i < (5 + Math.floor(Math.random() * 6)); i++) {
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const sentimentScore =
      randomSentiment === 'positive' ? 0.5 + Math.random() * 0.5 :
      randomSentiment === 'negative' ? -0.5 - Math.random() * 0.5 :
      Math.random() - 0.5;

    mockSocialPosts.push({
      source: Math.random() > 0.5 ? 'twitter' : 'reddit',
      url: `https://social.example.com/post/${i}`,
      title: `Social post about ${locationName}`,
      description: `User discussion about living/investing in ${locationName}`,
      publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      sentiment: randomSentiment,
      sentimentScore,
      relevanceScore: 0.6 + Math.random() * 0.4,
      keywords: [locationName, ...keywords.slice(0, 2)],
    });
  }

  return mockSocialPosts;
}

/**
 * FETCH PROPERTY REVIEW SENTIMENT
 * From aggregated review platforms (Google Reviews, Housing.com, etc.)
 */
export async function fetchPropertyReviewSentiment(
  latitude: number,
  longitude: number,
  radiusKm: number = 2
): Promise<NewsSource[]> {
  // Mock implementation - simulate property reviews in area
  const mockReviews: NewsSource[] = [];

  const reviewTexts = [
    'Great neighborhood! New shops opening up nearby',
    'Good value for money, property appreciation potential',
    'Traffic getting worse every month, concerned',
    'Perfect location for commuters, very accessible',
    'Schools and infrastructure excellent',
    'Noise pollution increasing, development concerns',
  ];

  reviewTexts.forEach((text, idx) => {
    const sentiment = 
      text.includes('Great') || text.includes('Good') || text.includes('Perfect') || text.includes('excellent')
        ? 'positive'
        : text.includes('concern') || text.includes('Noise') || text.includes('worse')
        ? 'negative'
        : 'neutral';

    mockReviews.push({
      source: 'property_reviews',
      url: `https://reviews.example.com/${idx}`,
      title: `Review from property in area`,
      description: text,
      publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      sentiment,
      sentimentScore: Math.random() - 0.5,
      relevanceScore: 0.85,
      keywords: ['property', 'neighborhood', 'local'],
    });
  });

  return mockReviews;
}

/**
 * ANALYZE SENTIMENT TRENDS
 * Compare current vs. historical sentiment
 */
export async function analyzeSentimentTrend(
  locationName: string
): Promise<{
  current: number; // Current average sentiment -1 to +1
  oneMonthAgo: number;
  threeMonthsAgo: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  volatility: number; // 0-1
}> {
  // Mock historical sentiment data
  const current = Math.random() - 0.5; // Random sentiment

  // Simulate trend
  const trend = current > 0.3 ? 'improving' : current < -0.3 ? 'deteriorating' : 'stable';
  
  const oneMonthAgo = current * (0.7 + Math.random() * 0.6);
  const threeMonthsAgo = current * (0.5 + Math.random() * 0.7);

  const volatility = Math.abs(current - oneMonthAgo);

  return {
    current,
    oneMonthAgo,
    threeMonthsAgo,
    trend,
    volatility,
  };
}

/**
 * DETECT EMERGING ISSUES
 * NLP-based issue extraction from recent articles
 */
export function detectEmergingIssues(
  articles: NewsSource[]
): Array<{
  issue: string;
  sentiment: string;
  firstMentionedDaysAgo: number;
  mentionTrend: 'increasing' | 'stable' | 'decreasing';
}> {
  const issueMap = new Map<string, { count: number; sentiment: string; firstSeen: Date }>();

  const commonIssues = [
    'traffic',
    'noise',
    'pollution',
    'infrastructure',
    'development',
    'schools',
    'safety',
    'flooding',
  ];

  articles.forEach(article => {
    commonIssues.forEach(issue => {
      if (
        article.description.toLowerCase().includes(issue) ||
        article.title.toLowerCase().includes(issue)
      ) {
        if (!issueMap.has(issue)) {
          issueMap.set(issue, {
            count: 0,
            sentiment: article.sentiment,
            firstSeen: article.publishedAt,
          });
        }
        const data = issueMap.get(issue)!;
        data.count++;
      }
    });
  });

  return Array.from(issueMap.entries())
    .filter(([_, data]) => data.count >= 2) // At least 2 mentions
    .map(([issue, data]) => {
      const daysSinceMention = Math.floor(
        (Date.now() - data.firstSeen.getTime()) / (24 * 60 * 60 * 1000)
      );

      return {
        issue,
        sentiment: data.sentiment,
        firstMentionedDaysAgo: daysSinceMention,
        mentionTrend:
          daysSinceMention < 7
            ? 'increasing'
            : daysSinceMention < 30
            ? 'stable'
            : 'decreasing',
      };
    });
}

/**
 * COMPUTE SENTIMENT ANALYSIS FOR LOCATION
 */
export async function computeSentimentAnalysis(
  propertyId: string,
  location: string,
  latitude: number,
  longitude: number,
  searchKeywords: string[] = []
): Promise<SentimentAnalysisResult> {
  try {
    // 1. Fetch articles and social sentiment
    const newsArticles = await fetchNewsArticles(location);
    const socialSentiment = await fetchSocialMediaSentiment(location, searchKeywords);
    const reviewSentiment = await fetchPropertyReviewSentiment(latitude, longitude);

    const allSources = [...newsArticles, ...socialSentiment, ...reviewSentiment];

    // 2. Calculate aggregate sentiment
    const totalSentimentScore = allSources.reduce((sum, s) => sum + s.sentimentScore, 0);
    const overallSentimentScore = (totalSentimentScore / allSources.length) * 100;

    // 3. Determine sentiment trend
    const trendAnalysis = await analyzeSentimentTrend(location);

    // 4. Detect emerging issues
    const emergingIssues = detectEmergingIssues(allSources);

    // 5. Extract key topics
    const topicMap = new Map<string, { frequency: number; sentiments: string[] }>();
    allSources.forEach(source => {
      source.keywords.forEach(keyword => {
        if (!topicMap.has(keyword)) {
          topicMap.set(keyword, { frequency: 0, sentiments: [] });
        }
        const topic = topicMap.get(keyword)!;
        topic.frequency++;
        topic.sentiments.push(source.sentiment);
      });
    });

    const keyNewsTopics = Array.from(topicMap.entries())
      .sort((a, b) => b[1].frequency - a[1].frequency)
      .slice(0, 5)
      .map(([topic, data]) => ({
        topic,
        frequency: data.frequency,
        sentiment: data.sentiments[0],
        impact:
          data.frequency > 5
            ? 'high'
            : data.frequency > 2
            ? 'medium'
            : 'low',
      }));

    // 6. Detect opportunity signals
    const opportunitySignals: Array<{
      signal: string;
      strength: number;
      timeframe: string;
    }> = [];

    if (overallSentimentScore > 40) {
      opportunitySignals.push({
        signal: 'Positive sentiment trend detected',
        strength: 0.7,
        timeframe: 'next_6_months',
      });
    }

    if (
      allSources.some(s =>
        s.description.toLowerCase().includes('metro') ||
        s.description.toLowerCase().includes('infrastructure')
      )
    ) {
      opportunitySignals.push({
        signal: 'Major infrastructure development planned',
        strength: 0.85,
        timeframe: 'next_12_months',
      });
    }

    // 7. Calculate data quality
    const dataQuality = Math.min(1, allSources.length / 20);

    // 8. Group by source
    const sentimentBySource: Record<string, any> = {};
    ['news_api', 'twitter', 'reddit', 'property_reviews'].forEach(sourceType => {
      const sourceArticles = allSources.filter(a => a.source === sourceType);
      if (sourceArticles.length > 0) {
        const avgSentiment =
          sourceArticles.reduce((sum, a) => sum + a.sentimentScore, 0) / sourceArticles.length;
        sentimentBySource[sourceType] = {
          score: avgSentiment * 100,
          volumeOfMentions: sourceArticles.length,
          trend: avgSentiment > 0.2 ? 'improving' : avgSentiment < -0.2 ? 'declining' : 'stable',
        };
      }
    });

    return {
      propertyId,
      location,
      latitude,
      longitude,
      overallSentimentScore,
      sentimentTrend: trendAnalysis.trend,
      sentimentConfidence: Math.min(1, allSources.length / 30),
      volatility: trendAnalysis.volatility,
      sentimentBySource,
      newsVolume: newsArticles.length,
      newsVolumeMonth: Math.floor(Math.random() * 20 - 10), // -10 to +10
      keyNewsTopics,
      emergingIssues,
      opportunitySignals,
      recentArticles: allSources.slice(0, 5),
      lastUpdated: new Date(),
      dataQuality,
    };
  } catch (error) {
    console.error(`[Sentiment Analysis] Error for location ${location}:`, error);
    throw error;
  }
}

/**
 * APPLY SENTIMENT TO VALUATION
 * Higher sentiment = higher valuation and faster sale
 */
export function applySentimentToValuation(
  baseValuation: number,
  baseTimeTosell: number,
  sentimentAnalysis: SentimentAnalysisResult
): {
  adjustedValuation: number;
  adjustedTimeTosell: number;
  sentimentBoost: number; // %
  riskFlag: boolean;
  riskDescription?: string;
} {
  let valuationBoost = 0;
  let timeAdjustment = 1.0;
  let riskFlag = false;
  let riskDescription: string | undefined;

  // Positive sentiment increases valuation
  const sentimentImpact = sentimentAnalysis.overallSentimentScore / 100;
  valuationBoost = sentimentImpact * 8; // Max 8% uplift

  // Improving trend accelerates sale
  if (sentimentAnalysis.sentimentTrend === 'improving') {
    timeAdjustment = 0.85;
  } else if (sentimentAnalysis.sentimentTrend === 'deteriorating') {
    timeAdjustment = 1.2;
    riskFlag = true;
    riskDescription = 'Deteriorating sentiment trend';
  }

  // Major emerging negative issues = risk flag
  const negativeIssues = sentimentAnalysis.emergingIssues.filter(
    i => i.sentiment === 'negative'
  );
  if (negativeIssues.length > 2) {
    riskFlag = true;
    riskDescription = `Multiple concerns: ${negativeIssues.map(i => i.issue).join(', ')}`;
    valuationBoost -= 5;
    timeAdjustment *= 1.3;
  }

  const adjustedValuation = Math.max(
    baseValuation * 0.8,
    baseValuation * (1 + valuationBoost / 100)
  );
  const adjustedTimeTosell = baseTimeTosell * timeAdjustment;

  return {
    adjustedValuation,
    adjustedTimeTosell,
    sentimentBoost: valuationBoost,
    riskFlag,
    riskDescription,
  };
}
// @ts-nocheck
