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

export const RATE_LIMIT_BUCKETS: Record<string, RateLimitBucket> = {
  default: { name: "default", maxTokens: 200, refillRate: 200, refillIntervalMs: 1_000 },
  reviewsGet: { name: "reviewsGet", maxTokens: 200, refillRate: 200, refillIntervalMs: 3_600_000 },
  reviewsPost: {
    name: "reviewsPost",
    maxTokens: 2_000,
    refillRate: 2_000,
    refillIntervalMs: 86_400_000,
  },
  voidedBurst: { name: "voidedBurst", maxTokens: 30, refillRate: 30, refillIntervalMs: 30_000 },
  voidedDaily: {
    name: "voidedDaily",
    maxTokens: 6_000,
    refillRate: 6_000,
    refillIntervalMs: 86_400_000,
  },
};

export function createRateLimiter(buckets?: RateLimitBucket[]): RateLimiter {
  const states = new Map<string, BucketState>();

  if (buckets) {
    for (const bucket of buckets) {
      states.set(bucket.name, {
        tokens: bucket.maxTokens,
        lastRefillTime: Date.now(),
        config: bucket,
      });
    }
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
      state.tokens = Math.min(state.config.maxTokens, newTokens) - 1;
      state.lastRefillTime = afterWait;
    },
  };
}
