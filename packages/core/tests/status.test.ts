import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { getCacheDir } from "@gpc-cli/config";
import type { PlayApiClient } from "@gpc-cli/api";
import type { ReportingApiClient } from "@gpc-cli/api";
import {
  getAppStatus,
  formatStatusTable,
  statusHasBreach,
  loadStatusCache,
  saveStatusCache,
} from "../src/commands/status.js";
import type { AppStatus } from "../src/commands/status.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function mockEdit() {
  return { id: "edit-1" };
}

function makePlayClient(releases: unknown[] = []): PlayApiClient {
  return {
    edits: {
      insert: vi.fn().mockResolvedValue(mockEdit()),
      delete: vi.fn().mockResolvedValue({}),
    },
    tracks: {
      list: vi.fn().mockResolvedValue([
        {
          track: "production",
          releases: releases.length ? releases : [
            { status: "completed", versionCodes: ["42"], userFraction: undefined },
          ],
        },
      ]),
      get: vi.fn(),
    },
    reviews: {
      list: vi.fn().mockResolvedValue({
        reviews: [
          {
            reviewId: "r1",
            authorName: "Alice",
            comments: [
              {
                userComment: {
                  starRating: 5,
                  lastModified: { seconds: String(Math.floor(Date.now() / 1000) - 86400) },
                  text: "Great app",
                },
              },
            ],
          },
          {
            reviewId: "r2",
            authorName: "Bob",
            comments: [
              {
                userComment: {
                  starRating: 4,
                  lastModified: { seconds: String(Math.floor(Date.now() / 1000) - 172800) },
                  text: "Good",
                },
              },
            ],
          },
        ],
      }),
    },
  } as unknown as PlayApiClient;
}

function makeReportingClient(values: {
  crashes?: number;
  anr?: number;
  slowStart?: number;
  slowRender?: number;
} = {}): ReportingApiClient {
  return {
    queryMetricSet: vi.fn().mockImplementation((_pkg: string, metricSet: string) => {
      const metricKey =
        metricSet === "crashRateMetricSet"
          ? "crashRate"
          : metricSet === "anrRateMetricSet"
          ? "anrRate"
          : metricSet === "slowStartRateMetricSet"
          ? "slowStartRate"
          : "slowRenderingRate";

      const val =
        metricSet === "crashRateMetricSet"
          ? values.crashes
          : metricSet === "anrRateMetricSet"
          ? values.anr
          : metricSet === "slowStartRateMetricSet"
          ? values.slowStart
          : values.slowRender;

      if (val === undefined) return Promise.resolve({ rows: [] });

      return Promise.resolve({
        rows: [{ metrics: { [metricKey]: { decimalValue: { value: String(val) } } } }],
      });
    }),
    getAnomalies: vi.fn(),
    searchErrorIssues: vi.fn(),
    searchErrorReports: vi.fn(),
  } as unknown as ReportingApiClient;
}

// ---------------------------------------------------------------------------
// getAppStatus
// ---------------------------------------------------------------------------

describe("getAppStatus", () => {
  it("returns releases from tracks.list", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.005, anr: 0.002 });

    const status = await getAppStatus(client, reporting, "com.example.app");

    expect(status.packageName).toBe("com.example.app");
    expect(status.cached).toBe(false);
    expect(status.releases).toHaveLength(1);
    expect(status.releases[0]?.track).toBe("production");
    expect(status.releases[0]?.status).toBe("completed");
  });

  it("fires 6 parallel API calls", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.005, anr: 0.002 });

    await getAppStatus(client, reporting, "com.example.app");

    // releases → edits.insert (1), reviews → reviews.list directly, vitals → 4 reporting calls
    expect((client.edits.insert as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect((client.reviews.list as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect((reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(4);
  });

  it("uses Promise.allSettled — partial vitals failure does not throw", async () => {
    const client = makePlayClient();
    const reporting = {
      ...makeReportingClient(),
      queryMetricSet: vi.fn().mockRejectedValue(new Error("API error")),
    } as unknown as ReportingApiClient;

    const status = await getAppStatus(client, reporting, "com.example.app");

    // All vitals should be "unknown" but status should still return
    expect(status.vitals.crashes.status).toBe("unknown");
    expect(status.vitals.anr.status).toBe("unknown");
    expect(status.releases.length).toBeGreaterThanOrEqual(0);
  });

  it("marks vitals ok when below threshold", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.005, anr: 0.002, slowStart: 0.01, slowRender: 0.03 });

    const status = await getAppStatus(client, reporting, "com.example.app");

    expect(status.vitals.crashes.status).toBe("ok");
    expect(status.vitals.anr.status).toBe("ok");
  });

  it("marks vitals breach when above threshold", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.05 }); // default threshold is 0.02

    const status = await getAppStatus(client, reporting, "com.example.app", {
      vitalThresholds: { crashRate: 0.02 },
    });

    expect(status.vitals.crashes.status).toBe("breach");
  });

  it("marks vitals warn when within 20% of threshold", async () => {
    const client = makePlayClient();
    // threshold 0.02, warn zone: 0.016 < value <= 0.02
    const reporting = makeReportingClient({ crashes: 0.018 });

    const status = await getAppStatus(client, reporting, "com.example.app", {
      vitalThresholds: { crashRate: 0.02 },
    });

    expect(status.vitals.crashes.status).toBe("warn");
  });

  it("computes review sentiment from recent reviews", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient();

    const status = await getAppStatus(client, reporting, "com.example.app");

    expect(status.reviews.totalNew).toBe(2);
    expect(status.reviews.averageRating).toBe(4.5);
    expect(status.reviews.positivePercent).toBe(100);
  });

  it("respects --days option for vitals window", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.005 });

    const status = await getAppStatus(client, reporting, "com.example.app", { days: 14 });

    expect(status.vitals.windowDays).toBe(14);
    const calls = (reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls;
    // All vitals queries should use a 14-day range
    expect(calls.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// statusHasBreach
// ---------------------------------------------------------------------------

describe("statusHasBreach", () => {
  const baseStatus: AppStatus = {
    packageName: "com.example",
    fetchedAt: new Date().toISOString(),
    cached: false,
    releases: [],
    vitals: {
      windowDays: 7,
      crashes: { value: 0.005, threshold: 0.02, status: "ok" },
      anr: { value: 0.002, threshold: 0.01, status: "ok" },
      slowStarts: { value: 0.01, threshold: 0.05, status: "ok" },
      slowRender: { value: 0.03, threshold: 0.1, status: "ok" },
    },
    reviews: {
      windowDays: 30,
      averageRating: 4.5,
      previousAverageRating: undefined,
      totalNew: 10,
      positivePercent: 80,
    },
  };

  it("returns false when all vitals are ok", () => {
    expect(statusHasBreach(baseStatus)).toBe(false);
  });

  it("returns true when crashes exceed threshold", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        ...baseStatus.vitals,
        crashes: { value: 0.05, threshold: 0.02, status: "breach" },
      },
    };
    expect(statusHasBreach(status)).toBe(true);
  });

  it("returns false when vitals are unknown (undefined value)", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        ...baseStatus.vitals,
        crashes: { value: undefined, threshold: 0.02, status: "unknown" },
      },
    };
    expect(statusHasBreach(status)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatStatusTable
// ---------------------------------------------------------------------------

describe("formatStatusTable", () => {
  const baseStatus: AppStatus = {
    packageName: "tv.visioo.app",
    fetchedAt: new Date().toISOString(),
    cached: false,
    releases: [
      { track: "production", versionCode: "42", status: "completed", userFraction: null },
      { track: "beta", versionCode: "43", status: "inProgress", userFraction: 0.1 },
    ],
    vitals: {
      windowDays: 7,
      crashes: { value: 0.008, threshold: 0.02, status: "ok" },
      anr: { value: 0.002, threshold: 0.01, status: "ok" },
      slowStarts: { value: 0.025, threshold: 0.05, status: "ok" },
      slowRender: { value: 0.09, threshold: 0.1, status: "warn" },
    },
    reviews: {
      windowDays: 30,
      averageRating: 4.6,
      previousAverageRating: 4.4,
      totalNew: 142,
      positivePercent: 89,
    },
  };

  it("includes package name", () => {
    const out = formatStatusTable(baseStatus);
    expect(out).toContain("tv.visioo.app");
  });

  it("includes RELEASES section with track names", () => {
    const out = formatStatusTable(baseStatus);
    expect(out).toContain("RELEASES");
    expect(out).toContain("production");
    expect(out).toContain("beta");
  });

  it("includes VITALS section with indicators", () => {
    const out = formatStatusTable(baseStatus);
    expect(out).toContain("VITALS");
    expect(out).toContain("✓");
    expect(out).toContain("⚠");
  });

  it("includes REVIEWS section with rating", () => {
    const out = formatStatusTable(baseStatus);
    expect(out).toContain("REVIEWS");
    expect(out).toContain("★ 4.6");
    expect(out).toContain("142 new");
    expect(out).toContain("89% positive");
  });

  it("shows rating trend when previous is available", () => {
    const out = formatStatusTable(baseStatus);
    expect(out).toContain("4.4");
  });

  it("marks cached status in header", () => {
    const cached = { ...baseStatus, cached: true };
    const out = formatStatusTable(cached);
    expect(out).toContain("cached");
  });

  it("shows 'No releases found' when releases list is empty", () => {
    const status: AppStatus = { ...baseStatus, releases: [] };
    const out = formatStatusTable(status);
    expect(out).toContain("No releases found");
  });

  it("shows unknown indicator when vitals value is undefined", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        ...baseStatus.vitals,
        crashes: { value: undefined, threshold: 0.02, status: "unknown" },
      },
    };
    const out = formatStatusTable(status);
    expect(out).toContain("?");
  });
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

describe("status cache", () => {
  const pkg = "com.example.cache-test";

  afterAll(async () => {
    try {
      await rm(join(getCacheDir(), `status-${pkg}.json`), { force: true });
    } catch {
      // ignore — file may not exist if tests were skipped
    }
  });
  const sampleStatus: AppStatus = {
    packageName: pkg,
    fetchedAt: new Date().toISOString(),
    cached: false,
    releases: [],
    vitals: {
      windowDays: 7,
      crashes: { value: 0.005, threshold: 0.02, status: "ok" },
      anr: { value: undefined, threshold: 0.01, status: "unknown" },
      slowStarts: { value: undefined, threshold: 0.05, status: "unknown" },
      slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
    },
    reviews: {
      windowDays: 30,
      averageRating: undefined,
      previousAverageRating: undefined,
      totalNew: 0,
      positivePercent: undefined,
    },
  };

  it("returns null when no cache exists", async () => {
    const result = await loadStatusCache(`com.example.no-cache-${Date.now()}`);
    expect(result).toBeNull();
  });

  it("round-trips data through save and load", async () => {
    await saveStatusCache(pkg, sampleStatus, 3600);
    const loaded = await loadStatusCache(pkg, 3600);
    expect(loaded).not.toBeNull();
    expect(loaded?.packageName).toBe(pkg);
    expect(loaded?.cached).toBe(true);
  });

  it("returns null when cache TTL has expired", async () => {
    await saveStatusCache(pkg, sampleStatus, 0); // TTL = 0 → always expired
    // Small delay to ensure the saved timestamp is in the past
    await new Promise((r) => setTimeout(r, 10));
    const loaded = await loadStatusCache(pkg, 0);
    expect(loaded).toBeNull();
  });
});
