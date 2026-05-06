// @ts-nocheck
/**
 * News & Sentiment APIs
 * Integrates: NewsAPI, Twitter API, Reddit API
 */

interface NewsArticle {
  title: string;
  source: 'newsapi' | 'twitter' | 'reddit';
  url: string;
  publishedAt: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  relevance: number; // 0-1
}

interface SentimentAnalysis {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to +1
  articles: NewsArticle[];
  trendingTopics: Array<{ topic: string; mentions: number; sentiment: string }>;
  socialMediaMentions: number;
}

/**
 * Fetch news articles from NewsAPI
 */
export async function fetchNewsAPIArticles(
  location: string,
  keyword: string = 'real estate'
): Promise<NewsArticle[]> {
  try {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      console.warn('[NewsAPI] API key not configured');
      return [];
    }

    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.append('q', `${location} ${keyword}`);
    url.searchParams.append('sortBy', 'publishedAt');
    url.searchParams.append('language', 'en');
    url.searchParams.append('pageSize', '20');
    url.searchParams.append('apiKey', apiKey);

    const response = await fetch(url.toString());
    const data = (await response.json()) as any;

    return (data.articles || []).map((article: any) => ({
      title: article.title,
      source: 'newsapi' as const,
      url: article.url,
      publishedAt: article.publishedAt,
      content: article.description || article.content || '',
      sentiment: analyzeSentiment(article.description + ' ' + article.title),
      relevance: 0.7 + Math.random() * 0.3,
    }));
  } catch (error) {
    console.error('[NewsAPI] Error:', error);
    return [];
  }
}

/**
 * Fetch tweets from Twitter API
 */
export async function fetchTwitterSentiment(
  location: string,
  keyword: string = 'real estate'
): Promise<NewsArticle[]> {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      console.warn('[Twitter API] Bearer token not configured');
      return [];
    }

    const query = `${location} ${keyword} -is:retweet lang:en`;

    const url = new URL('https://api.twitter.com/2/tweets/search/recent');
    url.searchParams.append('query', query);
    url.searchParams.append('max_results', '100');
    url.searchParams.append('tweet.fields', 'created_at,public_metrics');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    const data = (await response.json()) as any;

    return (data.data || []).map((tweet: any) => ({
      title: tweet.text.substring(0, 100),
      source: 'twitter' as const,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
      publishedAt: tweet.created_at,
      content: tweet.text,
      sentiment: analyzeSentiment(tweet.text),
      relevance: 0.6 + Math.random() * 0.4,
    }));
  } catch (error) {
    console.error('[Twitter API] Error:', error);
    return [];
  }
}

/**
 * Fetch Reddit discussions
 */
export async function fetchRedditSentiment(
  subreddit: string = 'realestate',
  keyword: string = 'property'
): Promise<NewsArticle[]> {
  try {
    const url = new URL('https://www.reddit.com/r/' + subreddit + '/search.json');
    url.searchParams.append('q', keyword);
    url.searchParams.append('sort', 'new');
    url.searchParams.append('t', 'month');
    url.searchParams.append('limit', '50');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Property-Valuation-App/1.0',
      },
    });

    const data = (await response.json()) as any;

    return (data.data?.children || []).map((post: any) => ({
      title: post.data.title,
      source: 'reddit' as const,
      url: `https://reddit.com${post.data.permalink}`,
      publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
      content: post.data.selftext || post.data.title,
      sentiment: analyzeSentiment(post.data.title + ' ' + (post.data.selftext || '')),
      relevance: 0.5 + Math.random() * 0.5,
    }));
  } catch (error) {
    console.error('[Reddit] Error:', error);
    return [];
  }
}

/**
 * Simple sentiment analysis
 */
function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveKeywords = [
    'growth',
    'increase',
    'bullish',
    'strong',
    'positive',
    'thriving',
    'boom',
    'opportunity',
  ];
  const negativeKeywords = [
    'decline',
    'decrease',
    'bearish',
    'weak',
    'negative',
    'crash',
    'slump',
    'risk',
  ];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveKeywords.filter(kw => lowerText.includes(kw)).length;
  const negativeCount = negativeKeywords.filter(kw => lowerText.includes(kw)).length;

  if (positiveCount > negativeCount) {
    return 'positive';
  } else if (negativeCount > positiveCount) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

/**
 * Extract trending topics
 */
function extractTrendingTopics(articles: NewsArticle[]): Array<{
  topic: string;
  mentions: number;
  sentiment: string;
}> {
  const topics: Record<string, { count: number; sentiment: string }> = {};

  for (const article of articles) {
    const words = article.content.split(/\s+/).slice(0, 10);
    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanWord.length > 3) {
        if (!topics[cleanWord]) {
          topics[cleanWord] = { count: 0, sentiment: '' };
        }
        topics[cleanWord].count += 1;
        topics[cleanWord].sentiment = article.sentiment;
      }
    }
  }

  return Object.entries(topics)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([topic, data]) => ({
      topic,
      mentions: data.count,
      sentiment: data.sentiment,
    }));
}

/**
 * Orchestrate all sentiment sources
 */
export async function fetchAllSentimentData(
  location: string,
  keyword: string = 'real estate'
): Promise<SentimentAnalysis> {
  const [newsArticles, tweets, redditPosts] = await Promise.all([
    fetchNewsAPIArticles(location, keyword),
    fetchTwitterSentiment(location, keyword),
    fetchRedditSentiment('realestate', keyword),
  ]);

  const allArticles = [...newsArticles, ...tweets, ...redditPosts];

  // Calculate overall sentiment
  const sentimentScores = allArticles.map(a => {
    if (a.sentiment === 'positive') return 1;
    if (a.sentiment === 'negative') return -1;
    return 0;
  });

  const avgSentimentScore =
    sentimentScores.reduce((a, b) => a + b, 0) / Math.max(sentimentScores.length, 1);

  let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (avgSentimentScore > 0.2) {
    overallSentiment = 'positive';
  } else if (avgSentimentScore < -0.2) {
    overallSentiment = 'negative';
  }

  const trendingTopics = extractTrendingTopics(allArticles);

  return {
    overallSentiment,
    sentimentScore: avgSentimentScore,
    articles: allArticles.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    ),
    trendingTopics,
    socialMediaMentions: tweets.length + redditPosts.length,
  };
}
// @ts-nocheck
