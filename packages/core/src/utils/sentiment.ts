/**
 * Local NLP sentiment analysis for reviews. No external API required.
 * Pure functions — no mocks needed in tests.
 */

export interface SentimentResult {
  score: number;        // -1 to +1
  label: "positive" | "negative" | "neutral";
  magnitude: number;    // 0 to 1 (confidence)
}

export interface TopicCluster {
  topic: string;
  count: number;
  avgScore: number;
}

export interface KeywordFrequency {
  word: string;
  count: number;
}

export interface ReviewAnalysis {
  totalReviews: number;
  avgRating: number;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    avgScore: number;
  };
  topics: TopicCluster[];
  keywords: KeywordFrequency[];
  ratingDistribution: Record<number, number>;
}

// Simple lexicon-based sentiment analysis
const POSITIVE_WORDS = new Set([
  "great", "excellent", "amazing", "awesome", "fantastic", "love", "good", "best",
  "perfect", "wonderful", "helpful", "easy", "fast", "smooth", "reliable", "clean",
  "beautiful", "intuitive", "works", "recommend", "useful", "thank", "thanks",
  "brilliant", "superb", "flawless", "outstanding", "delightful", "nice",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "horrible", "worst", "hate", "broken", "crash", "crashes",
  "bug", "bugs", "slow", "laggy", "freeze", "freezes", "error", "errors", "fail", "fails",
  "useless", "disappointing", "disappointed", "frustrating", "frustration", "annoying",
  "problem", "problems", "issue", "issues", "fix", "please", "not working", "doesn't work",
  "stopped", "uninstall", "deleted", "waste", "rubbish", "garbage", "terrible",
]);

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "is", "it", "this", "that", "was", "are", "be", "been", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might",
  "i", "me", "my", "we", "you", "he", "she", "they", "them", "their", "its",
  "not", "no", "very", "so", "just", "really", "app", "application", "update",
]);

/** Analyze sentiment of a single text. */
export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(Boolean);

  let posScore = 0;
  let negScore = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) posScore++;
    if (NEGATIVE_WORDS.has(word)) negScore++;
  }

  const total = posScore + negScore;
  if (total === 0) return { score: 0, label: "neutral", magnitude: 0 };

  const score = (posScore - negScore) / total;
  const magnitude = Math.min(1, total / 10);
  const label = score > 0.1 ? "positive" : score < -0.1 ? "negative" : "neutral";

  return { score, label, magnitude };
}

/** Cluster reviews into topics based on keyword co-occurrence. */
export function clusterTopics(texts: string[]): TopicCluster[] {
  const TOPIC_KEYWORDS: Record<string, string[]> = {
    "performance": ["slow", "lag", "laggy", "freeze", "fast", "speed", "quick", "smooth"],
    "crashes": ["crash", "crashes", "crash", "crashing", "force close", "stops", "stopped"],
    "ui/ux": ["ui", "design", "interface", "layout", "button", "screen", "menu", "navigation"],
    "battery": ["battery", "drain", "power", "charging", "drain"],
    "updates": ["update", "updated", "version", "new version", "after update"],
    "notifications": ["notification", "notifications", "alert", "alerts", "push"],
    "login/auth": ["login", "sign in", "logout", "password", "account", "auth"],
    "feature requests": ["please add", "would be nice", "missing", "need", "wish", "want"],
    "bugs": ["bug", "bugs", "issue", "error", "problem", "glitch", "broken"],
    "pricing": ["price", "pricing", "expensive", "cheap", "subscription", "pay", "cost", "free"],
  };

  const clusterMap = new Map<string, { count: number; totalScore: number }>();

  for (const text of texts) {
    const lower = text.toLowerCase();
    const sentiment = analyzeSentiment(text);

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        const existing = clusterMap.get(topic) ?? { count: 0, totalScore: 0 };
        clusterMap.set(topic, {
          count: existing.count + 1,
          totalScore: existing.totalScore + sentiment.score,
        });
      }
    }
  }

  return Array.from(clusterMap.entries())
    .map(([topic, { count, totalScore }]) => ({
      topic,
      count,
      avgScore: count > 0 ? Math.round((totalScore / count) * 100) / 100 : 0,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Count word frequency (excluding stop words). */
export function keywordFrequency(texts: string[], topN = 20): KeywordFrequency[] {
  const freq = new Map<string, number>();

  for (const text of texts) {
    const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/** Full review analysis: sentiment, topics, keywords, rating distribution. */
export function analyzeReviews(
  reviews: { text: string; rating?: number }[],
): ReviewAnalysis {
  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      avgRating: 0,
      sentiment: { positive: 0, negative: 0, neutral: 0, avgScore: 0 },
      topics: [],
      keywords: [],
      ratingDistribution: {},
    };
  }

  const texts = reviews.map((r) => r.text);
  const sentiments = texts.map((t) => analyzeSentiment(t));

  const positive = sentiments.filter((s) => s.label === "positive").length;
  const negative = sentiments.filter((s) => s.label === "negative").length;
  const neutral = sentiments.filter((s) => s.label === "neutral").length;
  const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

  const ratings = reviews.map((r) => r.rating).filter((r): r is number => r !== undefined);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const ratingDistribution: Record<number, number> = {};
  for (const r of ratings) {
    ratingDistribution[r] = (ratingDistribution[r] ?? 0) + 1;
  }

  return {
    totalReviews: reviews.length,
    avgRating: Math.round(avgRating * 100) / 100,
    sentiment: {
      positive,
      negative,
      neutral,
      avgScore: Math.round(avgScore * 100) / 100,
    },
    topics: clusterTopics(texts),
    keywords: keywordFrequency(texts),
    ratingDistribution,
  };
}
