import { describe, it, expect } from "vitest";
import type { AppStatus } from "@gpc-cli/core";
import {
  parseSections,
  parseThresholdOverrides,
  resolveWatchInterval,
  cacheSatisfiesFull,
  stripStaleAnalysis,
} from "../src/commands/status.js";

const baseReviews = {
  windowDays: 30,
  averageRating: 4.5,
  previousAverageRating: 4.4,
  totalNew: 10,
  positivePercent: 80,
};
const analysis = {
  totalReviews: 5,
  avgRating: 4,
  sentiment: { positive: 3, negative: 1, neutral: 1, avgScore: 0.2 },
  topics: [],
  keywords: [],
  ratingDistribution: {},
};
const statusWith = (withAnalysis: boolean): AppStatus =>
  ({
    packageName: "com.example.app",
    sections: ["releases", "vitals", "reviews"],
    reviews: withAnalysis ? { ...baseReviews, analysis } : { ...baseReviews },
  }) as unknown as AppStatus;

describe("cacheSatisfiesFull", () => {
  const secs = ["releases", "vitals", "reviews"];
  it("is satisfied when --full was not requested", () => {
    expect(cacheSatisfiesFull(statusWith(false), false, secs)).toBe(true);
  });
  it("is satisfied when reviews section is not requested", () => {
    expect(cacheSatisfiesFull(statusWith(false), true, ["releases", "vitals"])).toBe(true);
  });
  it("is satisfied when --full requested and cache has analysis", () => {
    expect(cacheSatisfiesFull(statusWith(true), true, secs)).toBe(true);
  });
  it("is NOT satisfied when --full requested on reviews but cache lacks analysis", () => {
    expect(cacheSatisfiesFull(statusWith(false), true, secs)).toBe(false);
  });
});

describe("stripStaleAnalysis", () => {
  it("drops analysis when --full was not requested", () => {
    expect(stripStaleAnalysis(statusWith(true), false).reviews.analysis).toBeUndefined();
  });
  it("keeps analysis when --full was requested", () => {
    expect(stripStaleAnalysis(statusWith(true), true).reviews.analysis).toBeDefined();
  });
  it("is a no-op when there is no analysis", () => {
    const s = statusWith(false);
    expect(stripStaleAnalysis(s, false).reviews.analysis).toBeUndefined();
  });
  it("does not mutate the input status", () => {
    const s = statusWith(true);
    stripStaleAnalysis(s, false);
    expect(s.reviews.analysis).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// parseSections
// ---------------------------------------------------------------------------

describe("parseSections", () => {
  it("parses comma-separated sections", () => {
    expect(parseSections("releases,vitals,reviews")).toEqual(["releases", "vitals", "reviews"]);
  });

  it("trims whitespace", () => {
    expect(parseSections(" vitals , reviews ")).toEqual(["vitals", "reviews"]);
  });

  it("normalizes to lowercase", () => {
    expect(parseSections("Releases,VITALS")).toEqual(["releases", "vitals"]);
  });

  it("accepts a single section", () => {
    expect(parseSections("vitals")).toEqual(["vitals"]);
  });

  it("throws on unknown section", () => {
    expect(() => parseSections("releases,bogus")).toThrow();
    try {
      parseSections("releases,bogus");
    } catch (e: unknown) {
      const err = e as { code: string; exitCode: number };
      expect(err.code).toBe("STATUS_USAGE_ERROR");
      expect(err.exitCode).toBe(2);
    }
  });
});

// ---------------------------------------------------------------------------
// parseThresholdOverrides
// ---------------------------------------------------------------------------

describe("parseThresholdOverrides", () => {
  it("parses crashes=1.5 as crashRate: 0.015", () => {
    const result = parseThresholdOverrides("crashes=1.5");
    expect(result).toEqual({ crashRate: 0.015 });
  });

  it("parses multiple thresholds", () => {
    const result = parseThresholdOverrides("crashes=2,anr=0.5");
    expect(result.crashRate).toBeCloseTo(0.02);
    expect(result.anrRate).toBeCloseTo(0.005);
  });

  it("accepts alias 'crash' for crashRate", () => {
    expect(parseThresholdOverrides("crash=1")).toEqual({ crashRate: 0.01 });
  });

  it("accepts slow-starts and slow-render", () => {
    const result = parseThresholdOverrides("slow-starts=5,slow-render=10");
    expect(result.slowStartRate).toBeCloseTo(0.05);
    expect(result.slowRenderingRate).toBeCloseTo(0.1);
  });

  it("throws on unknown threshold key", () => {
    expect(() => parseThresholdOverrides("memory=50")).toThrow();
    try {
      parseThresholdOverrides("memory=50");
    } catch (e: unknown) {
      const err = e as { code: string; exitCode: number };
      expect(err.code).toBe("STATUS_USAGE_ERROR");
      expect(err.exitCode).toBe(2);
    }
  });

  it("throws on negative value", () => {
    expect(() => parseThresholdOverrides("crashes=-1")).toThrow();
  });

  it("throws on non-numeric value", () => {
    expect(() => parseThresholdOverrides("crashes=abc")).toThrow();
  });

  it("skips pairs without = sign", () => {
    const result = parseThresholdOverrides("crashes=1,bogusentry");
    expect(result).toEqual({ crashRate: 0.01 });
  });
});

// ---------------------------------------------------------------------------
// resolveWatchInterval
// ---------------------------------------------------------------------------

describe("resolveWatchInterval", () => {
  it("returns null when undefined (no --watch)", () => {
    expect(resolveWatchInterval(undefined)).toBeNull();
  });

  it("returns 30 when true (bare --watch)", () => {
    expect(resolveWatchInterval(true)).toBe(30);
  });

  it("returns 30 when empty string", () => {
    expect(resolveWatchInterval("")).toBe(30);
  });

  it("parses numeric string", () => {
    expect(resolveWatchInterval("60")).toBe(60);
  });

  it("returns 30 for non-numeric string", () => {
    expect(resolveWatchInterval("fast")).toBe(30);
  });

  it("parses '10' correctly", () => {
    expect(resolveWatchInterval("10")).toBe(10);
  });
});
