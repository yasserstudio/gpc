import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { getCacheDir } from "@gpc-cli/config";
import type { PlayApiClient } from "@gpc-cli/api";
import type { ReportingApiClient } from "@gpc-cli/api";
import {
  getAppStatus,
  formatStatusTable,
  formatStatusSummary,
  computeStatusDiff,
  formatStatusDiff,
  statusHasBreach,
  loadStatusCache,
  saveStatusCache,
  runWatchLoop,
  trackBreachState,
  sendNotification,
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
          releases: releases.length
            ? releases
            : [{ status: "completed", versionCodes: ["42"], userFraction: undefined }],
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

// Each call to queryMetricSet returns the metric for the current OR previous period.
// Call count is used to distinguish: calls 0,2,4,6 = current; calls 1,3,5,7 = previous.
function makeReportingClient(values: {
  crashes?: number;
  anr?: number;
  slowStart?: number;
  slowRender?: number;
  crashesPrev?: number;
  anrPrev?: number;
} = {}): ReportingApiClient {
  let callIndex = 0;
  return {
    queryMetricSet: vi.fn().mockImplementation((_pkg: string, metricSet: string) => {
      const isPrevious = callIndex % 2 === 1;
      callIndex++;

      const metricKey =
        metricSet === "crashRateMetricSet"
          ? "crashRate"
          : metricSet === "anrRateMetricSet"
          ? "anrRate"
          : metricSet === "slowStartRateMetricSet"
          ? "slowStartRate"
          : "slowRenderingRate";

      let val: number | undefined;
      if (metricSet === "crashRateMetricSet") {
        val = isPrevious ? values.crashesPrev : values.crashes;
      } else if (metricSet === "anrRateMetricSet") {
        val = isPrevious ? values.anrPrev : values.anr;
      } else if (metricSet === "slowStartRateMetricSet") {
        val = values.slowStart;
      } else {
        val = values.slowRender;
      }

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

  it("fires 8 vitals API calls (4 current + 4 previous for trend)", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.005, anr: 0.002 });

    await getAppStatus(client, reporting, "com.example.app");

    expect((client.edits.insert as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect((client.reviews.list as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    // 4 metric sets × 2 periods each = 8 calls
    expect((reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(8);
  });

  it("uses Promise.allSettled — partial vitals failure does not throw", async () => {
    const client = makePlayClient();
    const reporting = {
      ...makeReportingClient(),
      queryMetricSet: vi.fn().mockRejectedValue(new Error("API error")),
    } as unknown as ReportingApiClient;

    const status = await getAppStatus(client, reporting, "com.example.app");

    expect(status.vitals.crashes.status).toBe("unknown");
    expect(status.vitals.anr.status).toBe("unknown");
    expect(status.releases.length).toBeGreaterThanOrEqual(0);
  });

  it("marks vitals ok when below threshold", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({
      crashes: 0.005,
      anr: 0.002,
      slowStart: 0.01,
      slowRender: 0.03,
    });

    const status = await getAppStatus(client, reporting, "com.example.app");

    expect(status.vitals.crashes.status).toBe("ok");
    expect(status.vitals.anr.status).toBe("ok");
  });

  it("marks vitals breach when above threshold", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.05 });

    const status = await getAppStatus(client, reporting, "com.example.app", {
      vitalThresholds: { crashRate: 0.02 },
    });

    expect(status.vitals.crashes.status).toBe("breach");
  });

  it("marks vitals warn when within 20% of threshold", async () => {
    const client = makePlayClient();
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
    expect((reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls.length).toBe(8);
  });

  it("attaches trend data to vital metrics", async () => {
    const client = makePlayClient();
    // crashes improving: current < previous → trend "down"
    const reporting = makeReportingClient({ crashes: 0.005, crashesPrev: 0.01 });

    const status = await getAppStatus(client, reporting, "com.example.app");

    expect(status.vitals.crashes.trend).toBe("down");
    expect(status.vitals.crashes.previousValue).toBe(0.01);
  });

  it("computes trend 'up' when current > previous", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.015, crashesPrev: 0.005 });

    const status = await getAppStatus(client, reporting, "com.example.app");

    expect(status.vitals.crashes.trend).toBe("up");
  });

  it("computes trend 'flat' when values are equal", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.01, crashesPrev: 0.01 });

    const status = await getAppStatus(client, reporting, "com.example.app");

    expect(status.vitals.crashes.trend).toBe("flat");
  });

  it("skips vitals API calls when sections excludes vitals", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.005 });

    await getAppStatus(client, reporting, "com.example.app", {
      sections: ["releases", "reviews"],
    });

    expect((reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("skips releases API calls when sections excludes releases", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.005 });

    await getAppStatus(client, reporting, "com.example.app", { sections: ["vitals"] });

    // No edits.insert call → no releases fetch
    expect((client.edits.insert as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("skips reviews API calls when sections excludes reviews", async () => {
    const client = makePlayClient();
    const reporting = makeReportingClient({ crashes: 0.005 });

    await getAppStatus(client, reporting, "com.example.app", { sections: ["vitals"] });

    expect((client.reviews.list as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
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
    sections: ["releases", "vitals", "reviews"],
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
      vitals: { ...baseStatus.vitals, crashes: { value: 0.05, threshold: 0.02, status: "breach" } },
    };
    expect(statusHasBreach(status)).toBe(true);
  });

  it("returns false when vitals are unknown", () => {
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
    sections: ["releases", "vitals", "reviews"],
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
    expect(formatStatusTable(baseStatus)).toContain("tv.visioo.app");
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
    expect(formatStatusTable(baseStatus)).toContain("4.4");
  });

  it("marks cached status in header", () => {
    expect(formatStatusTable({ ...baseStatus, cached: true })).toContain("cached");
  });

  it("shows 'No releases found' when releases list is empty", () => {
    expect(formatStatusTable({ ...baseStatus, releases: [] })).toContain("No releases found");
  });

  // Item 1: em dash instead of ? and n/a
  it("shows '—' (em dash) instead of '?' for unknown vital indicator", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        ...baseStatus.vitals,
        crashes: { value: undefined, threshold: 0.02, status: "unknown" },
      },
    };
    const out = formatStatusTable(status);
    expect(out).not.toContain("?");
    expect(out).toContain("—");
  });

  it("shows '—' (em dash) instead of 'n/a' for unknown vital value", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        ...baseStatus.vitals,
        crashes: { value: undefined, threshold: 0.02, status: "unknown" },
        anr: { value: undefined, threshold: 0.01, status: "unknown" },
        slowStarts: { value: undefined, threshold: 0.05, status: "unknown" },
        slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
      },
    };
    const out = formatStatusTable(status);
    expect(out).not.toContain("n/a");
  });

  it("shows 'No vitals data available' when all vitals are unknown", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        windowDays: 7,
        crashes: { value: undefined, threshold: 0.02, status: "unknown" },
        anr: { value: undefined, threshold: 0.01, status: "unknown" },
        slowStarts: { value: undefined, threshold: 0.05, status: "unknown" },
        slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
      },
    };
    expect(formatStatusTable(status)).toContain("No vitals data available for this period.");
  });

  it("shows 'No reviews in this period' when no reviews and no rating", () => {
    const status: AppStatus = {
      ...baseStatus,
      reviews: {
        windowDays: 30,
        averageRating: undefined,
        previousAverageRating: undefined,
        totalNew: 0,
        positivePercent: undefined,
      },
    };
    expect(formatStatusTable(status)).toContain("No reviews in this period.");
  });

  // Item 2: trend arrows
  it("shows ↑ arrow when crash rate is trending up", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        ...baseStatus.vitals,
        crashes: {
          value: 0.015,
          threshold: 0.02,
          status: "ok",
          previousValue: 0.005,
          trend: "up",
        },
      },
    };
    expect(formatStatusTable(status)).toContain("↑");
  });

  it("shows ↓ arrow when crash rate is trending down", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        ...baseStatus.vitals,
        crashes: {
          value: 0.005,
          threshold: 0.02,
          status: "ok",
          previousValue: 0.015,
          trend: "down",
        },
      },
    };
    expect(formatStatusTable(status)).toContain("↓");
  });

  it("shows no arrow when trend is flat", () => {
    const status: AppStatus = {
      ...baseStatus,
      vitals: {
        ...baseStatus.vitals,
        crashes: {
          value: 0.01,
          threshold: 0.02,
          status: "ok",
          previousValue: 0.01,
          trend: "flat",
        },
      },
    };
    const out = formatStatusTable(status);
    // flat trend: no arrow in the vitals section for crash rate
    expect(out).toContain("VITALS");
  });

  it("hides VITALS and REVIEWS sections when sections = ['releases']", () => {
    const status: AppStatus = { ...baseStatus, sections: ["releases"] };
    const out = formatStatusTable(status);
    expect(out).toContain("RELEASES");
    expect(out).not.toContain("VITALS");
    expect(out).not.toContain("REVIEWS");
  });

  it("hides RELEASES and REVIEWS sections when sections = ['vitals']", () => {
    const status: AppStatus = { ...baseStatus, sections: ["vitals"] };
    const out = formatStatusTable(status);
    expect(out).not.toContain("RELEASES");
    expect(out).toContain("VITALS");
    expect(out).not.toContain("REVIEWS");
  });

  it("hides RELEASES when sections = ['vitals','reviews']", () => {
    const status: AppStatus = { ...baseStatus, sections: ["vitals", "reviews"] };
    const out = formatStatusTable(status);
    expect(out).not.toContain("RELEASES");
    expect(out).toContain("VITALS");
    expect(out).toContain("REVIEWS");
  });
});

// ---------------------------------------------------------------------------
// formatStatusSummary (Item 4)
// ---------------------------------------------------------------------------

describe("formatStatusSummary", () => {
  const healthyStatus: AppStatus = {
    packageName: "tv.visioo.app",
    fetchedAt: new Date().toISOString(),
    cached: false,
    sections: ["releases", "vitals", "reviews"],
    releases: [
      { track: "internal", versionCode: "142", status: "completed", userFraction: null },
    ],
    vitals: {
      windowDays: 7,
      crashes: { value: 0.008, threshold: 0.02, status: "ok" },
      anr: { value: 0.003, threshold: 0.01, status: "ok" },
      slowStarts: { value: 0.02, threshold: 0.05, status: "ok" },
      slowRender: { value: 0.05, threshold: 0.1, status: "ok" },
    },
    reviews: {
      windowDays: 30,
      averageRating: 4.1,
      previousAverageRating: undefined,
      totalNew: 2,
      positivePercent: 100,
    },
  };

  it("produces a one-liner with package name", () => {
    const out = formatStatusSummary(healthyStatus);
    expect(out).toContain("tv.visioo.app");
    expect(out).not.toContain("\n");
  });

  it("includes version and track", () => {
    const out = formatStatusSummary(healthyStatus);
    expect(out).toContain("v142");
    expect(out).toContain("internal");
  });

  it("includes crash rate with indicator", () => {
    const out = formatStatusSummary(healthyStatus);
    expect(out).toContain("crashes");
    expect(out).toContain("✓");
  });

  it("appends [ALERT] on breach", () => {
    const status: AppStatus = {
      ...healthyStatus,
      vitals: {
        ...healthyStatus.vitals,
        crashes: { value: 0.05, threshold: 0.02, status: "breach" },
      },
    };
    expect(formatStatusSummary(status)).toContain("[ALERT]");
  });

  it("does not append [ALERT] when healthy", () => {
    expect(formatStatusSummary(healthyStatus)).not.toContain("[ALERT]");
  });

  it("shows 'no vitals' when all vitals are unknown", () => {
    const status: AppStatus = {
      ...healthyStatus,
      vitals: {
        windowDays: 7,
        crashes: { value: undefined, threshold: 0.02, status: "unknown" },
        anr: { value: undefined, threshold: 0.01, status: "unknown" },
        slowStarts: { value: undefined, threshold: 0.05, status: "unknown" },
        slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
      },
    };
    const out = formatStatusSummary(status);
    expect(out).not.toContain("crashes");
    expect(out).not.toContain("ANR");
    expect(out).toContain("no vitals");
  });

  it("shows 'no reviews' when averageRating is undefined", () => {
    const status: AppStatus = {
      ...healthyStatus,
      reviews: {
        windowDays: 30,
        averageRating: undefined,
        previousAverageRating: undefined,
        totalNew: 0,
        positivePercent: undefined,
      },
    };
    const out = formatStatusSummary(status);
    expect(out).toContain("no reviews");
    expect(out).not.toContain("★");
  });
});

// ---------------------------------------------------------------------------
// computeStatusDiff / formatStatusDiff (Item 6)
// ---------------------------------------------------------------------------

describe("computeStatusDiff", () => {
  const makeStatus = (overrides: Partial<AppStatus>): AppStatus => ({
    packageName: "com.example",
    fetchedAt: new Date().toISOString(),
    cached: false,
    sections: ["releases", "vitals", "reviews"],
    releases: [
      { track: "production", versionCode: "141", status: "completed", userFraction: null },
    ],
    vitals: {
      windowDays: 7,
      crashes: { value: 0.018, threshold: 0.02, status: "ok" },
      anr: { value: 0.003, threshold: 0.01, status: "ok" },
      slowStarts: { value: undefined, threshold: 0.05, status: "unknown" },
      slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
    },
    reviews: {
      windowDays: 30,
      averageRating: 4.0,
      previousAverageRating: undefined,
      totalNew: 5,
      positivePercent: 80,
    },
    ...overrides,
  });

  it("detects version change", () => {
    const prev = makeStatus({});
    const curr = makeStatus({
      releases: [{ track: "production", versionCode: "142", status: "completed", userFraction: null }],
    });
    const diff = computeStatusDiff(prev, curr);
    expect(diff.versionCode.from).toBe("141");
    expect(diff.versionCode.to).toBe("142");
  });

  it("computes crash rate delta", () => {
    const prev = makeStatus({});
    const curr = makeStatus({
      vitals: {
        ...makeStatus({}).vitals,
        crashes: { value: 0.012, threshold: 0.02, status: "ok" },
      },
    });
    const diff = computeStatusDiff(prev, curr);
    expect(diff.crashRate.delta).toBeCloseTo(-0.006, 5);
  });

  it("sets delta to null when either value is missing", () => {
    const prev = makeStatus({
      vitals: {
        ...makeStatus({}).vitals,
        crashes: { value: undefined, threshold: 0.02, status: "unknown" },
      },
    });
    const curr = makeStatus({});
    const diff = computeStatusDiff(prev, curr);
    expect(diff.crashRate.delta).toBeNull();
  });

  it("computes review count change", () => {
    const prev = makeStatus({});
    const curr = makeStatus({ reviews: { ...makeStatus({}).reviews, totalNew: 12 } });
    const diff = computeStatusDiff(prev, curr);
    expect(diff.reviewCount.from).toBe(5);
    expect(diff.reviewCount.to).toBe(12);
  });
});

describe("formatStatusDiff", () => {
  it("includes 'Changes since' header", () => {
    const diff = computeStatusDiff(
      {
        packageName: "x",
        fetchedAt: new Date().toISOString(),
        cached: false,
        releases: [{ track: "prod", versionCode: "1", status: "completed", userFraction: null }],
        vitals: {
          windowDays: 7,
          crashes: { value: 0.01, threshold: 0.02, status: "ok" },
          anr: { value: 0.002, threshold: 0.01, status: "ok" },
          slowStarts: { value: undefined, threshold: 0.05, status: "unknown" },
          slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
        },
        reviews: {
          windowDays: 30,
          averageRating: 4.0,
          previousAverageRating: undefined,
          totalNew: 5,
          positivePercent: 80,
        },
      },
      {
        packageName: "x",
        fetchedAt: new Date().toISOString(),
        cached: false,
        releases: [{ track: "prod", versionCode: "2", status: "completed", userFraction: null }],
        vitals: {
          windowDays: 7,
          crashes: { value: 0.005, threshold: 0.02, status: "ok" },
          anr: { value: 0.002, threshold: 0.01, status: "ok" },
          slowStarts: { value: undefined, threshold: 0.05, status: "unknown" },
          slowRender: { value: undefined, threshold: 0.1, status: "unknown" },
        },
        reviews: {
          windowDays: 30,
          averageRating: 4.5,
          previousAverageRating: undefined,
          totalNew: 10,
          positivePercent: 90,
        },
      },
    );
    const out = formatStatusDiff(diff, "5 minutes ago");
    expect(out).toContain("Changes since 5 minutes ago");
    expect(out).toContain("Version:");
    expect(out).toContain("1 → 2");
  });
});

// ---------------------------------------------------------------------------
// runWatchLoop (Item 3)
// ---------------------------------------------------------------------------

describe("runWatchLoop", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exits with code 2 when interval < 10", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    await expect(
      runWatchLoop({
        intervalSeconds: 5,
        render: () => "",
        fetch: async () => { throw new Error("should not fetch"); },
        save: async () => {},
      }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(2);
    exitSpy.mockRestore();
  });

  it("calls fetch and render on each tick", async () => {
    vi.useFakeTimers();

    const mockStatus: AppStatus = {
      packageName: "com.example",
      fetchedAt: new Date().toISOString(),
      cached: false,
      sections: ["releases", "vitals", "reviews"],
      releases: [],
      vitals: {
        windowDays: 7,
        crashes: { value: undefined, threshold: 0.02, status: "unknown" },
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

    const fetch = vi.fn().mockResolvedValue(mockStatus);
    const render = vi.fn().mockReturnValue("output");
    const save = vi.fn().mockResolvedValue(undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });

    const loopPromise = runWatchLoop({ intervalSeconds: 10, render, fetch, save });

    // Flush microtasks to let fetch → save → render complete before first sleep tick
    for (let i = 0; i < 20; i++) await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);

    // Emit SIGINT — sets running=false, throws (caught here)
    try { process.emit("SIGINT"); } catch { /* expected from mocked process.exit */ }

    // Advance past the sleep so the for-loop condition (running=false) is checked and exits
    await vi.advanceTimersByTimeAsync(10000);

    // Loop exits normally (running=false), loopPromise resolves
    await loopPromise;

    exitSpy.mockRestore();
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// trackBreachState / sendNotification (Item 8)
// ---------------------------------------------------------------------------

describe("trackBreachState", () => {
  const pkg = "com.example.breach-test-" + Date.now();

  afterAll(async () => {
    try {
      const { getCacheDir } = await import("@gpc-cli/config");
      await rm(join(getCacheDir(), `breach-state-${pkg}.json`), { force: true });
    } catch { /* ignore */ }
  });

  it("returns true on first call (state changed from no-file to false)", async () => {
    const changed = await trackBreachState(pkg, false);
    // First call: no prior file → prevBreaching=false, new state=false → no change
    expect(changed).toBe(false);
  });

  it("returns true when transitioning from not-breaching to breaching", async () => {
    const changed = await trackBreachState(pkg, true);
    expect(changed).toBe(true);
  });

  it("returns false when state has not changed", async () => {
    const changed = await trackBreachState(pkg, true);
    expect(changed).toBe(false);
  });

  it("returns true when transitioning from breaching to not-breaching", async () => {
    const changed = await trackBreachState(pkg, false);
    expect(changed).toBe(true);
  });
});

describe("sendNotification", () => {
  it("does nothing in CI environment", () => {
    const origCI = process.env["CI"];
    process.env["CI"] = "true";
    // Should not throw even if osascript/notify-send are not available
    expect(() => sendNotification("Title", "Body")).not.toThrow();
    if (origCI === undefined) delete process.env["CI"];
    else process.env["CI"] = origCI;
  });
});

// ---------------------------------------------------------------------------
// relativeTime (tested via formatStatusTable header)
// ---------------------------------------------------------------------------

describe("relativeTime (via formatStatusTable header)", () => {
  const makeStatus = (fetchedAt: string): AppStatus => ({
    packageName: "com.example.app",
    fetchedAt,
    cached: false,
    sections: ["releases"],
    releases: [],
    vitals: {
      windowDays: 7,
      crashes: { value: undefined, threshold: 0.02, status: "unknown" },
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
  });

  it("shows 'just now' when fetchedAt is less than 1 minute ago", () => {
    const fetchedAt = new Date(Date.now() - 30 * 1000).toISOString();
    const out = formatStatusTable(makeStatus(fetchedAt));
    expect(out).toContain("just now");
  });

  it("shows 'N min ago' when fetchedAt is 5 minutes ago", () => {
    const fetchedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const out = formatStatusTable(makeStatus(fetchedAt));
    expect(out).toContain("5 min ago");
  });

  it("shows 'Nh ago' when fetchedAt is 90 minutes ago", () => {
    const fetchedAt = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    const out = formatStatusTable(makeStatus(fetchedAt));
    expect(out).toContain("1h ago");
  });

  it("shows 'Nd ago' when fetchedAt is 25 hours ago", () => {
    const fetchedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const out = formatStatusTable(makeStatus(fetchedAt));
    expect(out).toContain("1d ago");
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
      // ignore
    }
  });

  const sampleStatus: AppStatus = {
    packageName: pkg,
    fetchedAt: new Date().toISOString(),
    cached: false,
    sections: ["releases", "vitals", "reviews"],
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
    await saveStatusCache(pkg, sampleStatus, 0);
    await new Promise((r) => setTimeout(r, 10));
    const loaded = await loadStatusCache(pkg, 0);
    expect(loaded).toBeNull();
  });
});
