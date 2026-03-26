import { describe, it, expect } from "vitest";
import {
  parseSections,
  parseThresholdOverrides,
  resolveWatchInterval,
} from "../src/commands/status.js";

// ---------------------------------------------------------------------------
// parseSections
// ---------------------------------------------------------------------------

describe("parseSections", () => {
  it("parses comma-separated sections", () => {
    expect(parseSections("releases,vitals,reviews")).toEqual([
      "releases",
      "vitals",
      "reviews",
    ]);
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
