import { describe, it, expect } from "vitest";
import {
  analyzeSentiment,
  clusterTopics,
  keywordFrequency,
  analyzeReviews,
} from "../src/utils/sentiment.js";

// ---------------------------------------------------------------------------
// analyzeSentiment
// ---------------------------------------------------------------------------
describe("analyzeSentiment", () => {
  it("returns positive sentiment for clearly positive text", () => {
    const result = analyzeSentiment("This app is great, excellent, and amazing!");
    expect(result.label).toBe("positive");
    expect(result.score).toBeGreaterThan(0);
  });

  it("returns negative sentiment for clearly negative text", () => {
    const result = analyzeSentiment("This app is terrible, horrible, and crashes all the time.");
    expect(result.label).toBe("negative");
    expect(result.score).toBeLessThan(0);
  });

  it("returns neutral for empty text", () => {
    const result = analyzeSentiment("");
    expect(result.label).toBe("neutral");
    expect(result.score).toBe(0);
  });

  it("returns score in range [-1, 1]", () => {
    const texts = ["amazing app love it", "broken garbage waste", "the app exists", ""];
    for (const text of texts) {
      const r = analyzeSentiment(text);
      expect(r.score).toBeGreaterThanOrEqual(-1);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it("returns magnitude in range [0, 1]", () => {
    const result = analyzeSentiment("great excellent amazing perfect wonderful");
    expect(result.magnitude).toBeGreaterThanOrEqual(0);
    expect(result.magnitude).toBeLessThanOrEqual(1);
  });

  it("is case-insensitive", () => {
    const lower = analyzeSentiment("great app");
    const upper = analyzeSentiment("GREAT APP");
    expect(lower.label).toBe(upper.label);
    expect(lower.score).toBe(upper.score);
  });
});

// ---------------------------------------------------------------------------
// clusterTopics
// ---------------------------------------------------------------------------
describe("clusterTopics", () => {
  it("returns an array of topic clusters", () => {
    const texts = [
      "The app crashes every time I open it",
      "It crashes on my phone too",
      "Great performance and beautiful UI",
    ];
    const topics = clusterTopics(texts);
    expect(Array.isArray(topics)).toBe(true);
  });

  it("returns empty array for empty texts", () => {
    expect(clusterTopics([])).toEqual([]);
  });

  it("clusters have required fields", () => {
    const texts = ["great great great performance"];
    const topics = clusterTopics(texts);
    for (const topic of topics) {
      expect(typeof topic.topic).toBe("string");
      expect(typeof topic.count).toBe("number");
      expect(typeof topic.avgScore).toBe("number");
    }
  });

  it("groups similar topics", () => {
    const texts = ["crashes on startup", "app keeps crashing", "crashes every day"];
    const topics = clusterTopics(texts);
    // Should find a crashes related topic
    const crashTopic = topics.find((t) => t.topic.toLowerCase().includes("crash"));
    expect(crashTopic).toBeDefined();
    expect(crashTopic!.count).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// keywordFrequency
// ---------------------------------------------------------------------------
describe("keywordFrequency", () => {
  it("returns keywords sorted by frequency descending", () => {
    const texts = ["crash crash crash bugs", "crash bugs bugs"];
    const kf = keywordFrequency(texts);
    expect(kf.length).toBeGreaterThan(0);
    // First keyword should have highest count
    for (let i = 1; i < kf.length; i++) {
      expect(kf[i - 1]!.count).toBeGreaterThanOrEqual(kf[i]!.count);
    }
  });

  it("returns empty array for empty texts", () => {
    expect(keywordFrequency([])).toEqual([]);
  });

  it("each entry has word and count fields", () => {
    const texts = ["great performance excellent"];
    const kf = keywordFrequency(texts);
    for (const entry of kf) {
      expect(typeof entry.word).toBe("string");
      expect(typeof entry.count).toBe("number");
      expect(entry.count).toBeGreaterThan(0);
    }
  });

  it("filters out common stop words", () => {
    // Short words (<=3 chars) are filtered by length; longer stop words by the STOP_WORDS set
    const texts = ["this have been"];
    const kf = keywordFrequency(texts);
    // "this", "have", "been" are all in STOP_WORDS and should be excluded
    const stopWords = new Set(["this", "have", "been"]);
    for (const entry of kf) {
      expect(stopWords.has(entry.word.toLowerCase())).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// analyzeReviews
// ---------------------------------------------------------------------------
describe("analyzeReviews", () => {
  it("returns zero totals for empty reviews", () => {
    const result = analyzeReviews([]);
    expect(result.totalReviews).toBe(0);
    expect(result.avgRating).toBe(0);
  });

  it("calculates average rating correctly", () => {
    const reviews = [
      { text: "good", rating: 4 },
      { text: "ok", rating: 2 },
    ];
    const result = analyzeReviews(reviews);
    expect(result.totalReviews).toBe(2);
    expect(result.avgRating).toBeCloseTo(3, 1);
  });

  it("counts sentiment breakdown", () => {
    const reviews = [
      { text: "great excellent amazing", rating: 5 },
      { text: "terrible crash broken", rating: 1 },
      { text: "the app is an app", rating: 3 },
    ];
    const result = analyzeReviews(reviews);
    expect(result.sentiment.positive).toBeGreaterThanOrEqual(0);
    expect(result.sentiment.negative).toBeGreaterThanOrEqual(0);
    expect(result.sentiment.neutral).toBeGreaterThanOrEqual(0);
    expect(result.sentiment.positive + result.sentiment.negative + result.sentiment.neutral).toBe(
      3,
    );
  });

  it("builds rating distribution", () => {
    const reviews = [
      { text: "great", rating: 5 },
      { text: "good", rating: 5 },
      { text: "ok", rating: 3 },
    ];
    const result = analyzeReviews(reviews);
    expect(result.ratingDistribution[5]).toBe(2);
    expect(result.ratingDistribution[3]).toBe(1);
  });

  it("includes topics and keywords arrays", () => {
    const reviews = [{ text: "great app works perfectly", rating: 5 }];
    const result = analyzeReviews(reviews);
    expect(Array.isArray(result.topics)).toBe(true);
    expect(Array.isArray(result.keywords)).toBe(true);
  });

  it("handles reviews without ratings", () => {
    const reviews = [{ text: "great app" }];
    const result = analyzeReviews(reviews);
    expect(result.totalReviews).toBe(1);
  });
});
