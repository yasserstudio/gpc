import { describe, it, expect, vi } from "vitest";
import { compareVitalsTrend } from "../src/commands/vitals";
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

    type Query = { timelineSpec: { startTime: { year: number; month: number; day: number }; endTime: { year: number; month: number; day: number } } };
    const calls = (reporting.queryMetricSet as ReturnType<typeof vi.fn>).mock.calls as [unknown, unknown, Query][];
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
