export interface RateLimitBucket {
  name: string;
  maxTokens: number;
  refillRate: number;
  refillIntervalMs: number;
}

export interface RateLimiter {
  acquire(bucket: string): Promise<void>;
}

interface BucketState {
  tokens: number;
  lastRefillTime: number;
  config: RateLimitBucket;
}

/**
 * Google Play Developer API quota model (as of 2025):
 * - 200,000 queries per day total
 * - 6 independent per-minute buckets at 3,000 queries/min each
 *
 * The per-minute buckets are the practical constraint for CLI usage.
 * Daily limits are tracked locally via gpc quota.
 */
export const RATE_LIMIT_BUCKETS: Record<string, RateLimitBucket> = {
  edits: { name: "edits", maxTokens: 3_000, refillRate: 3_000, refillIntervalMs: 60_000 },
  purchases: { name: "purchases", maxTokens: 3_000, refillRate: 3_000, refillIntervalMs: 60_000 },
  reviews: { name: "reviews", maxTokens: 3_000, refillRate: 3_000, refillIntervalMs: 60_000 },
  reporting: { name: "reporting", maxTokens: 3_000, refillRate: 3_000, refillIntervalMs: 60_000 },
  monetization: {
    name: "monetization",
    maxTokens: 3_000,
    refillRate: 3_000,
    refillIntervalMs: 60_000,
  },
  default: { name: "default", maxTokens: 3_000, refillRate: 3_000, refillIntervalMs: 60_000 },
};

/**
 * Map an API path to the appropriate rate-limit bucket.
 * Google's quota is structured by resource type.
 */
export function resolveBucket(path: string): string {
  // Order matters: more specific patterns first
  if (path.includes("/edits/") || path.includes("/edits:")) return "edits";
  if (path.includes("/purchases/") || path.includes("/orders")) return "purchases";
  if (path.includes("/reviews")) return "reviews";
  if (
    path.includes("playdeveloperreporting") ||
    path.includes("MetricSet") ||
    path.includes("anomalies")
  )
    return "reporting";
  if (
    path.includes("/inappproducts") ||
    path.includes("/oneTimeProducts") ||
    path.includes("/subscriptions") ||
    path.includes("/monetization")
  )
    return "monetization";
  return "default";
}

export function createRateLimiter(buckets?: RateLimitBucket[]): RateLimiter {
  const states = new Map<string, BucketState>();

  // Initialize from provided buckets or defaults
  const effectiveBuckets = buckets ?? Object.values(RATE_LIMIT_BUCKETS);
  for (const bucket of effectiveBuckets) {
    states.set(bucket.name, {
      tokens: bucket.maxTokens,
      lastRefillTime: Date.now(),
      config: bucket,
    });
  }

  return {
    async acquire(bucket: string): Promise<void> {
      const state = states.get(bucket);
      if (!state) return;

      const now = Date.now();
      const elapsed = now - state.lastRefillTime;
      const refill = Math.floor(
        (elapsed / state.config.refillIntervalMs) * state.config.refillRate,
      );

      if (refill > 0) {
        state.tokens = Math.min(state.config.maxTokens, state.tokens + refill);
        state.lastRefillTime = now;
      }

      if (state.tokens > 0) {
        state.tokens--;
        return;
      }

      const tokensNeeded = 1;
      const waitMs = Math.ceil(
        (tokensNeeded / state.config.refillRate) * state.config.refillIntervalMs,
      );
      await new Promise((r) => setTimeout(r, waitMs));

      // Recalculate refill based on actual elapsed time since last refill
      const afterWait = Date.now();
      const totalElapsed = afterWait - state.lastRefillTime;
      const newTokens = Math.floor(
        (totalElapsed / state.config.refillIntervalMs) * state.config.refillRate,
      );
      state.tokens = Math.max(0, Math.min(state.config.maxTokens, newTokens) - 1);
      state.lastRefillTime = afterWait;
    },
  };
}
