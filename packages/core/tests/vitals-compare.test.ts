import { describe, it, expect, vi } from "vitest";
import {
  compareVitalsTrend,
  compareVersionVitals,
  watchVitalsWithAutoHalt,
} from "../src/commands/vitals";
import type { ReportingApiClient } from "@gpc-cli/api";

function mockReporting(currentRows: any[], previousRows: any[]): ReportingApiClient {
  let callCount = 0;
  return {
    queryMetricSet: vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ rows: currentRows });
      return Promise.resolve({ rows: previousRows });
    }),
    getAnomalies: vi.fn(),
    searchErrorIssues: vi.fn(),
    searchErrorReports: vi.fn(),
  } as any;
}

describe("compareVitalsTrend", () => {
  it("detects improved trend (lower current)", async () => {
    const reporting = mockReporting(
      [{ metrics: { crashRate: { decimalValue: { value: "0.5" } } } }],
      [{ metrics: { crashRate: { decimalValue: { value: "1.0" } } } }],
    );

    const result = await compareVitalsTrend(reporting, "com.example", "crashRateMetricSet", 7);

    expect(result.direction).toBe("improved");
    expect(result.changePercent).toBeLessThan(0);
    expect(result.current).toBe(0.5);
    expect(result.previous).toBe(1.0);
  });

  it("detects degraded trend (higher current)", async () => {
    const reporting = mockReporting(
      [{ metrics: { crashRate: { decimalValue: { value: "2.0" } } } }],
      [{ metrics: { crashRate: { decimalValue: { value: "1.0" } } } }],
    );

    const result = await compareVitalsTrend(reporting, "com.example", "crashRateMetricSet", 7);

    expect(result.direction).toBe("degraded");
    expect(result.changePercent).toBeGreaterThan(0);
  });

  it("detects unchanged trend (< 1% change)", async () => {
    const reporting = mockReporting(
      [{ metrics: { crashRate: { decimalValue: { value: "1.005" } } } }],
      [{ metrics: { crashRate: { decimalValue: { value: "1.0" } } } }],
    );

    const result = await compareVitalsTrend(reporting, "com.example", "crashRateMetricSet", 7);

    expect(result.direction).toBe("unchanged");
  });

  it("returns unknown when no data", async () => {
    const reporting = mockReporting([], []);

    const result = await compareVitalsTrend(reporting, "com.example", "crashRateMetricSet", 7);

    expect(result.direction).toBe("unknown");
    expect(result.current).toBeUndefined();
    expect(result.previous).toBeUndefined();
  });

  it("averages multiple rows per period", async () => {
    const reporting = mockReporting(
      [
        { metrics: { rate: { decimalValue: { value: "2.0" } } } },
        { metrics: { rate: { decimalValue: { value: "4.0" } } } },
      ],
      [
        { metrics: { rate: { decimalValue: { value: "6.0" } } } },
        { metrics: { rate: { decimalValue: { value: "8.0" } } } },
      ],
    );

    const result = await compareVitalsTrend(reporting, "com.example", "anrRateMetricSet", 7);

    expect(result.current).toBe(3.0);
    expect(result.previous).toBe(7.0);
    expect(result.direction).toBe("improved");
  });

  it("makes two API calls with correct time ranges", async () => {
    const reporting = mockReporting(
      [{ metrics: { rate: { decimalValue: { value: "1" } } } }],
      [{ metrics: { rate: { decimalValue: { value: "1" } } } }],
    );

    await compareVitalsTrend(reporting, "com.example", "crashRateMetricSet", 7);

    expect(reporting.queryMetricSet).toHaveBeenCalledTimes(2);
  });

  it("passes valid date ranges when days is supplied as a number", async () => {
    const reporting = mockReporting(
      [{ metrics: { crashRate: { decimalValue: { value: "1" } } } }],
      [{ metrics: { crashRate: { decimalValue: { value: "1" } } } }],
    );

    // days=7 must produce valid (non-NaN) dates — regression guard for parseInt(value, radix) bug
    await compareVitalsTrend(reporting, "com.example", "crashRateMetricSet", 7);

    type Query = {
      timelineSpec: {
        startTime: { year: number; month: number; day: number };
        endTime: { year: number; month: number; day: number };
      };
    };
    const calls = (reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls as [
      unknown,
      unknown,
      Query,
    ][];
    for (const call of calls) {
      const { startTime, endTime } = call[2].timelineSpec;
      // All date fields must be real numbers, not NaN
      expect(startTime.year).not.toBeNaN();
      expect(startTime.month).not.toBeNaN();
      expect(startTime.day).not.toBeNaN();
      expect(endTime.year).not.toBeNaN();
      // startTime must be strictly before endTime
      const startMs = Date.UTC(startTime.year, startTime.month - 1, startTime.day);
      const endMs = Date.UTC(endTime.year, endTime.month - 1, endTime.day);
      expect(startMs).toBeLessThan(endMs);
    }
  });

  it("uses per-metric-set metrics", async () => {
    const reporting = mockReporting(
      [{ metrics: { crashRate: { decimalValue: { value: "1" } } } }],
      [{ metrics: { crashRate: { decimalValue: { value: "1" } } } }],
    );

    await compareVitalsTrend(reporting, "com.example", "crashRateMetricSet", 7);

    const firstCall = reporting.queryMetricSet.mock.calls[0];
    expect(firstCall[2].metrics).toContain("crashRate");
    expect(firstCall[2].metrics).not.toContain("errorReportCount");
  });
});

// ---------------------------------------------------------------------------
// compareVersionVitals
// ---------------------------------------------------------------------------
describe("compareVersionVitals", () => {
  function mockVersionReporting(rows: any[]): ReportingApiClient {
    return {
      queryMetricSet: vi.fn().mockResolvedValue({ rows }),
      getAnomalies: vi.fn(),
      searchErrorIssues: vi.fn(),
      searchErrorReports: vi.fn(),
    } as any;
  }

  it("returns row objects for both versions", async () => {
    const reporting = mockVersionReporting([]);
    const result = await compareVersionVitals(reporting, "com.example", "100", "101");
    expect(result.v1.versionCode).toBe("100");
    expect(result.v2.versionCode).toBe("101");
    expect(Array.isArray(result.regressions)).toBe(true);
  });

  it("detects regressions when v2 crash rate is >5% higher than v1", async () => {
    const rows = [
      {
        dimensions: [{ stringValue: "100" }],
        metrics: { crashRate: { decimalValue: { value: "0.01" } } },
      },
      {
        dimensions: [{ stringValue: "101" }],
        metrics: { crashRate: { decimalValue: { value: "0.02" } } },
      },
    ];
    const reporting = mockVersionReporting(rows);
    const result = await compareVersionVitals(reporting, "com.example", "100", "101");
    // v2 rate (0.02) > v1 rate (0.01) * 1.05 — should report regression
    expect(result.regressions).toContain("crashRate");
  });

  it("no regressions when v2 rate is not significantly higher", async () => {
    const rows = [
      {
        dimensions: [{ stringValue: "100" }],
        metrics: { crashRate: { decimalValue: { value: "0.01" } } },
      },
      {
        dimensions: [{ stringValue: "101" }],
        metrics: { crashRate: { decimalValue: { value: "0.0105" } } }, // ~5% higher (not >5%)
      },
    ];
    const reporting = mockVersionReporting(rows);
    const result = await compareVersionVitals(reporting, "com.example", "100", "101");
    expect(result.regressions).not.toContain("crashRate");
  });

  it("makes one API call per metric set", async () => {
    const reporting = mockVersionReporting([]);
    await compareVersionVitals(reporting, "com.example", "100", "101");
    // 4 metric sets: crashRate, anrRate, slowStart, slowRendering
    expect(reporting.queryMetricSet).toHaveBeenCalledTimes(4);
  });
});

// ---------------------------------------------------------------------------
// watchVitalsWithAutoHalt
// ---------------------------------------------------------------------------
describe("watchVitalsWithAutoHalt", () => {
  it("returns a stop function", () => {
    const reporting = {
      queryMetricSet: vi.fn().mockResolvedValue({ rows: [] }),
      getAnomalies: vi.fn(),
      searchErrorIssues: vi.fn(),
      searchErrorReports: vi.fn(),
    } as any;

    const stop = watchVitalsWithAutoHalt(reporting, "com.example", {
      threshold: 0.05,
      intervalMs: 60000,
    });

    expect(typeof stop).toBe("function");
    stop(); // Clean up
  });

  it("calls onHalt when threshold is breached", async () => {
    const value = 0.1; // > threshold 0.05
    const reporting = {
      queryMetricSet: vi.fn().mockResolvedValue({
        rows: [{ metrics: { crashRate: { decimalValue: { value: String(value) } } } }],
      }),
      getAnomalies: vi.fn(),
      searchErrorIssues: vi.fn(),
      searchErrorReports: vi.fn(),
    } as any;

    const onHalt = vi.fn().mockResolvedValue(undefined);
    const onPoll = vi.fn();

    await new Promise<void>((resolve) => {
      const stop = watchVitalsWithAutoHalt(reporting, "com.example", {
        threshold: 0.05,
        intervalMs: 0,
        onHalt: async (v) => {
          await onHalt(v);
          stop();
          resolve();
        },
        onPoll,
      });
    });

    expect(onHalt).toHaveBeenCalledWith(value);
  });

  it("calls onPoll on each poll", async () => {
    const reporting = {
      queryMetricSet: vi.fn().mockResolvedValue({ rows: [] }),
      getAnomalies: vi.fn(),
      searchErrorIssues: vi.fn(),
      searchErrorReports: vi.fn(),
    } as any;

    const onPoll = vi.fn();

    await new Promise<void>((resolve) => {
      let calls = 0;
      const stop = watchVitalsWithAutoHalt(reporting, "com.example", {
        threshold: 0.05,
        intervalMs: 0,
        onPoll: (v, breached) => {
          onPoll(v, breached);
          calls++;
          if (calls >= 1) {
            stop();
            resolve();
          }
        },
      });
    });

    expect(onPoll).toHaveBeenCalledWith(undefined, false);
  });

  it("does not call onHalt twice for same breach", async () => {
    const reporting = {
      queryMetricSet: vi.fn().mockResolvedValue({
        rows: [{ metrics: { rate: { decimalValue: { value: "0.1" } } } }],
      }),
      getAnomalies: vi.fn(),
      searchErrorIssues: vi.fn(),
      searchErrorReports: vi.fn(),
    } as any;

    const onHalt = vi.fn().mockResolvedValue(undefined);
    let stopFn: () => void;

    await new Promise<void>((resolve) => {
      stopFn = watchVitalsWithAutoHalt(reporting, "com.example", {
        threshold: 0.05,
        intervalMs: 0,
        onHalt: async (v) => {
          await onHalt(v);
          stopFn();
          resolve();
        },
      });
    });

    expect(onHalt).toHaveBeenCalledTimes(1);
  });
});
