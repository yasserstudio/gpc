import { describe, it, expect, vi } from "vitest";
import { createRateLimiter } from "../src/rate-limiter";
import type { RateLimitBucket } from "../src/rate-limiter";

describe("createRateLimiter", () => {
  it("returns a rate limiter with acquire method", () => {
    const limiter = createRateLimiter();
    expect(limiter.acquire).toBeTypeOf("function");
  });

  it("acquire is a no-op for unknown buckets", async () => {
    const limiter = createRateLimiter([]);
    await limiter.acquire("nonexistent");
  });

  it("acquire is a no-op when no buckets configured", async () => {
    const limiter = createRateLimiter();
    await limiter.acquire("anything");
  });

  it("allows requests up to maxTokens without waiting", async () => {
    const bucket: RateLimitBucket = {
      name: "test",
      maxTokens: 3,
      refillRate: 3,
      refillIntervalMs: 1_000,
    };
    const limiter = createRateLimiter([bucket]);

    const start = Date.now();
    await limiter.acquire("test");
    await limiter.acquire("test");
    await limiter.acquire("test");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it("waits when tokens are exhausted", async () => {
    const bucket: RateLimitBucket = {
      name: "test",
      maxTokens: 1,
      refillRate: 1,
      refillIntervalMs: 100,
    };
    const limiter = createRateLimiter([bucket]);

    await limiter.acquire("test"); // uses the 1 token

    const start = Date.now();
    await limiter.acquire("test"); // should wait ~100ms
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(80);
    expect(elapsed).toBeLessThan(300);
  });

  it("multiple buckets work independently", async () => {
    const bucketA: RateLimitBucket = {
      name: "a",
      maxTokens: 1,
      refillRate: 1,
      refillIntervalMs: 10_000,
    };
    const bucketB: RateLimitBucket = {
      name: "b",
      maxTokens: 5,
      refillRate: 5,
      refillIntervalMs: 10_000,
    };
    const limiter = createRateLimiter([bucketA, bucketB]);

    await limiter.acquire("a");
    // bucket A is exhausted, but bucket B should still have tokens
    await limiter.acquire("b");
    await limiter.acquire("b");
    await limiter.acquire("b");
  });

  it("refills tokens over time", async () => {
    const bucket: RateLimitBucket = {
      name: "test",
      maxTokens: 2,
      refillRate: 2,
      refillIntervalMs: 100,
    };
    const limiter = createRateLimiter([bucket]);

    await limiter.acquire("test");
    await limiter.acquire("test");
    // both tokens used

    // wait for refill
    await new Promise((r) => setTimeout(r, 120));

    const start = Date.now();
    await limiter.acquire("test"); // should have refilled
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
