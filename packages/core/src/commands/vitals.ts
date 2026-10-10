import { GpcError } from "../errors.js";
import type {
  ReportingApiClient,
  VitalsMetricSet,
  MetricSetQuery,
  MetricSetResponse,
  MetricRow,
  AnomalyDetectionResponse,
  ErrorIssuesResponse,
  ReportingDimension,
  ReportingAggregation,
} from "@gpc-cli/api";

export interface VitalsQueryOptions {
  dimension?: ReportingDimension;
  days?: number;
  aggregation?: ReportingAggregation;
}

export interface VitalsOverview {
  crashRate?: MetricRow[];
  anrRate?: MetricRow[];
  slowStartRate?: MetricRow[];
  slowRenderingRate?: MetricRow[];
  excessiveWakeupRate?: MetricRow[];
  stuckWakelockRate?: MetricRow[];
  /** Metrics that could not be read, with the reason. Absent when every query succeeded. */
  unavailable?: { metric: string; code: string; reason: string }[];
}

export interface ThresholdResult {
  breached: boolean;
  value: number | undefined;
  threshold: number;
}

const METRIC_SET_METRICS: Record<VitalsMetricSet, string[]> = {
  crashRateMetricSet: ["crashRate", "userPerceivedCrashRate", "distinctUsers"],
  anrRateMetricSet: ["anrRate", "userPerceivedAnrRate", "distinctUsers"],
  slowStartRateMetricSet: ["slowStartRate", "distinctUsers"],
  slowRenderingRateMetricSet: ["slowRenderingRate", "distinctUsers"],
  excessiveWakeupRateMetricSet: ["excessiveWakeupRate", "distinctUsers"],
  stuckBackgroundWakelockRateMetricSet: [
    "stuckBgWakelockRate",
    "stuckBgWakelockRate7dUserWeighted",
    "stuckBgWakelockRate28dUserWeighted",
    "distinctUsers",
  ],
  lmkRateMetricSet: [
    "userPerceivedLmkRate",
    "userPerceivedLmkRate7dUserWeighted",
    "userPerceivedLmkRate28dUserWeighted",
    "distinctUsers",
  ],
  anonRssAndSwapMemoryUsageMetricSet: [
    "anonRssAndSwapMemoryUsageP50",
    "anonRssAndSwapMemoryUsageP75",
    "anonRssAndSwapMemoryUsageP90",
    "anonRssAndSwapMemoryUsageP95",
    "anonRssAndSwapMemoryUsageP99",
    "distinctUsers",
  ],
  bitmapMemoryUsageMetricSet: [
    "bitmapMemoryUsageP50",
    "bitmapMemoryUsageP75",
    "bitmapMemoryUsageP90",
    "bitmapMemoryUsageP95",
    "bitmapMemoryUsageP99",
    "distinctUsers",
  ],
  errorCountMetricSet: ["errorReportCount", "distinctUsers"],
};

/**
 * Dimensions the Reporting API rejects a query without (400 "Required dimensions
 * [startType]"). They are always sent, and a caller's dimension is added on top.
 */
const REQUIRED_DIMENSIONS: Partial<Record<VitalsMetricSet, ReportingDimension[]>> = {
  slowStartRateMetricSet: ["startType"],
  errorCountMetricSet: ["reportType"],
};

/** Returns `query` with the metric set's required dimensions added (no duplicates). */
export function withRequiredDimensions(
  metricSet: VitalsMetricSet,
  query: MetricSetQuery,
): MetricSetQuery {
  const required = REQUIRED_DIMENSIONS[metricSet];
  if (!required) return query;
  const dimensions = [...required];
  for (const dim of query.dimensions ?? []) {
    if (!dimensions.includes(dim)) dimensions.push(dim);
  }
  return { ...query, dimensions };
}

/**
 * Numeric value of `metric` in a row (the first metric when no name is given).
 * Google returns `metrics` as an array of `{ metric, decimalValue }`; the
 * `MetricRow` type describes a name-keyed map, so both shapes are read. A lookup
 * by name on the array always missed, which left `gpc watch` blind.
 */
export function readMetricValue(row: MetricRow | undefined, metric?: string): number | undefined {
  type Entry = { metric?: string; decimalValue?: { value?: string } } | undefined;
  const metrics = row?.metrics as unknown;
  if (!metrics || typeof metrics !== "object") return undefined;
  let entry: Entry;
  if (Array.isArray(metrics)) {
    entry = (metric ? metrics.find((m: Entry) => m?.metric === metric) : metrics[0]) as Entry;
  } else {
    const map = metrics as Record<string, Entry>;
    const key = metric ?? Object.keys(map)[0];
    entry = key ? map[key] : undefined;
  }
  const raw = entry?.decimalValue?.value;
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function rowDateKey(row: MetricRow): string {
  const t = (row as { startTime?: { year?: number; month?: number; day?: number; hours?: number } })
    .startTime;
  if (!t) return "";
  const pad = (n: number | undefined) => String(n ?? 0).padStart(2, "0");
  return `${t.year ?? 0}-${pad(t.month)}-${pad(t.day)}T${pad(t.hours)}`;
}

/** Identifies a row's slice (start type, report type, --dim value); both API shapes. */
function rowSliceKey(row: MetricRow): string {
  type Dim = { dimension?: string; stringValue?: string; int64Value?: string } | undefined;
  const dims = row.dimensions as unknown;
  if (!dims || typeof dims !== "object") return "";
  const pairs = Array.isArray(dims)
    ? (dims as Dim[]).map((d) => [d?.dimension ?? "", d?.stringValue ?? d?.int64Value ?? ""])
    : Object.entries(dims as Record<string, Dim>).map(([k, d]) => [
        k,
        d?.stringValue ?? d?.int64Value ?? "",
      ]);
  return JSON.stringify(pairs.sort());
}

/**
 * Worst (highest) value of `metric` on the most recent day in `rows`. Rows come
 * one per day per slice (start type, report type, --dim value), so "the last
 * row" is an arbitrary slice; a gate must compare the worst one.
 */
export function latestWorstValue(
  rows: MetricRow[] | undefined,
  metric?: string,
): number | undefined {
  if (!rows || rows.length === 0) return undefined;
  const latest = rows.map(rowDateKey).reduce((a, b) => (b > a ? b : a));
  let worst: number | undefined;
  for (const row of rows) {
    if (rowDateKey(row) !== latest) continue;
    const value = readMetricValue(row, metric);
    if (value !== undefined && (worst === undefined || value > worst)) worst = value;
  }
  return worst;
}

/**
 * Average of `metric` over the window for each slice, then the worst slice. Without
 * dimensions this is the plain average; with start types it reports the worst of
 * cold, warm and hot instead of blending them.
 */
export function worstSliceAverage(
  rows: MetricRow[] | undefined,
  metric?: string,
): number | undefined {
  const sums = new Map<string, { total: number; count: number }>();
  for (const row of rows ?? []) {
    const value = readMetricValue(row, metric);
    if (value === undefined) continue;
    const key = rowSliceKey(row);
    const entry = sums.get(key) ?? { total: 0, count: 0 };
    entry.total += value;
    entry.count++;
    sums.set(key, entry);
  }
  let worst: number | undefined;
  for (const { total, count } of sums.values()) {
    const avg = total / count;
    if (worst === undefined || avg > worst) worst = avg;
  }
  return worst;
}

/**
 * Rejects a rate threshold that can never be reached. Google reports rates as
 * fractions (0.02 = 2%), so 1 or more is almost always a percentage written by
 * mistake, and it left the gate silently open.
 */
export function assertRateThreshold(label: string, threshold: number): void {
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new GpcError(
      `Invalid ${label} threshold: expected a fraction such as 0.02.`,
      "THRESHOLD_INVALID",
      2,
      "Write rates as fractions: 0.02 means 2%.",
    );
  }
  if (threshold >= 1) {
    throw new GpcError(
      `${label} threshold ${threshold} can never be reached: rates are between 0 and 1.`,
      "THRESHOLD_INVALID",
      2,
      `Write rates as fractions: ${threshold / 100} means ${threshold}%. Check vitals.thresholds in your config too.`,
    );
  }
}

/** True when the Reporting API refused a metric set because the app is not a game. */
export function isGamesOnlyMetricError(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === "API_METRIC_GAMES_ONLY";
}

async function getFreshnessEndDate(
  reporting: ReportingApiClient,
  packageName: string,
  metricSet: VitalsMetricSet,
  aggregation: ReportingAggregation = "DAILY",
): Promise<Date | undefined> {
  try {
    const info = await reporting.getMetricSetFreshness(packageName, metricSet);
    const match = info.freshnessInfo?.freshnesses?.find((f) => f.aggregationPeriod === aggregation);
    if (match) {
      return new Date(
        Date.UTC(match.latestEndTime.year, match.latestEndTime.month - 1, match.latestEndTime.day),
      );
    }
  } catch {
    // Freshness endpoint unavailable — fall back to yesterday
  }
  return undefined;
}

/**
 * Latest end date a query for `metricSet` may use. Google rejects an end date past
 * the metric's freshness (400 "end_date should be at most the current freshness"),
 * and data commonly lags more than two days, so a fixed "two days ago" fails.
 * Freshness is authoritative when known: capping it at two days ago would hide a
 * day Google has already published from one-day gates (train, --vitals-gate).
 */
export async function latestQueryableEndDate(
  reporting: ReportingApiClient,
  packageName: string,
  metricSet: VitalsMetricSet,
): Promise<Date> {
  const fallback = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const freshnessEnd = await getFreshnessEndDate(reporting, packageName, metricSet);
  return freshnessEnd ?? fallback;
}

function buildQuery(
  metricSet: VitalsMetricSet,
  options?: VitalsQueryOptions,
  freshnessEnd?: Date,
): MetricSetQuery {
  const metrics = METRIC_SET_METRICS[metricSet] ?? ["errorReportCount", "distinctUsers"];

  const days = options?.days ?? 30;
  const DAY_MS = 24 * 60 * 60 * 1000;
  // Same rule as latestQueryableEndDate: freshness when known, else two days ago.
  const end = freshnessEnd ?? new Date(Date.now() - 2 * DAY_MS);
  const start = new Date(end.getTime() - days * DAY_MS);

  const query: MetricSetQuery = {
    metrics,
    timelineSpec: {
      aggregationPeriod: options?.aggregation ?? "DAILY",
      startTime: {
        year: start.getUTCFullYear(),
        month: start.getUTCMonth() + 1,
        day: start.getUTCDate(),
      },
      endTime: {
        year: end.getUTCFullYear(),
        month: end.getUTCMonth() + 1,
        day: end.getUTCDate(),
      },
    },
  };

  if (options?.dimension) {
    query.dimensions = [options.dimension];
  }

  return withRequiredDimensions(metricSet, query);
}

async function queryMetric(
  reporting: ReportingApiClient,
  packageName: string,
  metricSet: VitalsMetricSet,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  const freshnessEnd = await getFreshnessEndDate(
    reporting,
    packageName,
    metricSet,
    options?.aggregation,
  );
  const query = buildQuery(metricSet, options, freshnessEnd);
  return reporting.queryMetricSet(packageName, metricSet, query);
}

export async function getVitalsOverview(
  reporting: ReportingApiClient,
  packageName: string,
): Promise<VitalsOverview> {
  const metricSets: [VitalsMetricSet, Exclude<keyof VitalsOverview, "unavailable">][] = [
    ["crashRateMetricSet", "crashRate"],
    ["anrRateMetricSet", "anrRate"],
    ["slowStartRateMetricSet", "slowStartRate"],
    ["slowRenderingRateMetricSet", "slowRenderingRate"],
    ["excessiveWakeupRateMetricSet", "excessiveWakeupRate"],
    ["stuckBackgroundWakelockRateMetricSet", "stuckWakelockRate"],
  ];

  const freshnessResults = await Promise.allSettled(
    metricSets.map(([metric]) => getFreshnessEndDate(reporting, packageName, metric)),
  );

  const results = await Promise.allSettled(
    metricSets.map(([metric], i) => {
      const fr = freshnessResults[i];
      const freshnessEnd = fr?.status === "fulfilled" ? fr.value : undefined;
      return reporting.queryMetricSet(
        packageName,
        metric,
        buildQuery(metric, undefined, freshnessEnd),
      );
    }),
  );

  // A failed metric is reported, never silently dropped: dropping them all let
  // wrong credentials read as "No vitals data available" with exit 0. The one
  // expected refusal is slow rendering for non-game apps.
  const overview: VitalsOverview = {};
  const unavailable: NonNullable<VitalsOverview["unavailable"]> = [];
  let firstFailure: unknown;
  let succeeded = 0;
  for (let i = 0; i < metricSets.length; i++) {
    const entry = metricSets[i];
    const result = results[i];
    if (!entry || !result) continue;
    const key = entry[1];
    if (result.status === "fulfilled") {
      overview[key] = result.value.rows || [];
      succeeded++;
      continue;
    }
    const err = result.reason as { code?: unknown; message?: unknown } | undefined;
    if (!isGamesOnlyMetricError(err)) firstFailure ??= result.reason;
    unavailable.push({
      metric: key,
      code: typeof err?.code === "string" ? err.code : "UNKNOWN_ERROR",
      reason: isGamesOnlyMetricError(err)
        ? "Only available for apps categorised as games."
        : typeof err?.message === "string"
          ? err.message
          : String(result.reason),
    });
  }

  if (succeeded === 0 && firstFailure !== undefined) throw firstFailure;
  if (unavailable.length > 0) overview.unavailable = unavailable;
  return overview;
}

export async function getVitalsCrashes(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "crashRateMetricSet", options);
}

export async function getVitalsAnr(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "anrRateMetricSet", options);
}

export async function getVitalsStartup(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  // startType is required on every slow-start query; buildQuery adds it.
  return queryMetric(reporting, packageName, "slowStartRateMetricSet", options);
}

export async function getVitalsRendering(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "slowRenderingRateMetricSet", options);
}

export async function getVitalsBattery(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "excessiveWakeupRateMetricSet", options);
}

export async function getVitalsMemory(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "stuckBackgroundWakelockRateMetricSet", options);
}

/** LMK-specific query: enforces DAILY aggregation as required by the API. */
export async function getVitalsLmk(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "lmkRateMetricSet", {
    ...options,
    aggregation: "DAILY",
  });
}

/** Dynamic anonymous RSS plus swap memory usage percentiles. DAILY is the only supported period. */
export async function getVitalsMemoryRss(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "anonRssAndSwapMemoryUsageMetricSet", {
    ...options,
    aggregation: "DAILY",
  });
}

/** Bitmap memory usage percentiles. DAILY is the only supported period. */
export async function getVitalsMemoryBitmap(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "bitmapMemoryUsageMetricSet", {
    ...options,
    aggregation: "DAILY",
  });
}

export async function getVitalsErrorCount(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  // reportType is required on every error-count query; buildQuery adds it.
  return queryMetric(reporting, packageName, "errorCountMetricSet", options);
}

export async function getVitalsAnomalies(
  reporting: ReportingApiClient,
  packageName: string,
): Promise<AnomalyDetectionResponse> {
  return reporting.getAnomalies(packageName);
}

export async function searchVitalsErrors(
  reporting: ReportingApiClient,
  packageName: string,
  options?: { filter?: string; maxResults?: number },
): Promise<ErrorIssuesResponse> {
  return reporting.searchErrorIssues(packageName, options?.filter, options?.maxResults);
}

export interface VitalsTrendComparison {
  metric: string;
  current: number | undefined;
  previous: number | undefined;
  changePercent: number | undefined;
  direction: "improved" | "degraded" | "unchanged" | "unknown";
}

export async function compareVitalsTrend(
  reporting: ReportingApiClient,
  packageName: string,
  metricSet: VitalsMetricSet,
  days: number = 7,
): Promise<VitalsTrendComparison> {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const freshnessEnd = await getFreshnessEndDate(reporting, packageName, metricSet);
  const fallback = nowMs - 2 * DAY_MS;
  const baseMs = freshnessEnd ? Math.min(freshnessEnd.getTime(), fallback) : fallback;

  // Current period: [base - days, base]
  const currentEnd = new Date(baseMs);
  const currentStart = new Date(baseMs - days * DAY_MS);

  // Previous period: [base - 2*days - 1, base - days - 1]  (1-day gap)
  const previousEnd = new Date(baseMs - days * DAY_MS - DAY_MS);
  const previousStart = new Date(baseMs - days * DAY_MS - DAY_MS - days * DAY_MS);

  const metrics = METRIC_SET_METRICS[metricSet] ?? ["errorReportCount", "distinctUsers"];

  // Use UTC accessors to avoid timezone-dependent off-by-one on date boundaries
  const toApiDate = (d: Date) => ({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });

  const makeQuery = (start: Date, end: Date): MetricSetQuery =>
    withRequiredDimensions(metricSet, {
      metrics,
      timelineSpec: {
        aggregationPeriod: "DAILY",
        startTime: toApiDate(start),
        endTime: toApiDate(end),
      },
    });

  const [currentResult, previousResult] = await Promise.all([
    reporting.queryMetricSet(packageName, metricSet, makeQuery(currentStart, currentEnd)),
    reporting.queryMetricSet(packageName, metricSet, makeQuery(previousStart, previousEnd)),
  ]);

  const extractAvg = (rows: MetricRow[] | undefined): number | undefined => {
    if (!rows || rows.length === 0) return undefined;
    const values = rows
      .map((r) => {
        const keys = Object.keys(r.metrics);
        const first = keys[0];
        return first ? Number(r.metrics[first]?.decimalValue?.value) : NaN;
      })
      .filter((v) => !isNaN(v));
    if (values.length === 0) return undefined;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const current = extractAvg(currentResult.rows);
  const previous = extractAvg(previousResult.rows);

  let changePercent: number | undefined;
  let direction: VitalsTrendComparison["direction"] = "unknown";

  if (current !== undefined && previous !== undefined && previous !== 0) {
    changePercent = ((current - previous) / previous) * 100;
    if (Math.abs(changePercent) < 1) {
      direction = "unchanged";
    } else if (changePercent < 0) {
      direction = "improved"; // lower error rate = better
    } else {
      direction = "degraded";
    }
  }

  return {
    metric: metricSet,
    current,
    previous,
    changePercent: changePercent !== undefined ? Math.round(changePercent * 10) / 10 : undefined,
    direction,
  };
}

export function checkThreshold(value: number | undefined, threshold: number): ThresholdResult {
  return {
    breached: value !== undefined && value > threshold,
    value,
    threshold,
  };
}

export interface VersionVitalsRow {
  versionCode: string;
  crashRate?: number;
  anrRate?: number;
  slowStartRate?: number;
  slowRenderingRate?: number;
}

export interface VersionVitalsComparison {
  v1: VersionVitalsRow;
  v2: VersionVitalsRow;
  regressions: string[];
}

/** Compare vitals side-by-side for two version codes. */
export async function compareVersionVitals(
  reporting: ReportingApiClient,
  packageName: string,
  v1: string,
  v2: string,
  options?: { days?: number },
): Promise<VersionVitalsComparison> {
  const days = options?.days ?? 30;
  const metricSets: [VitalsMetricSet, keyof Omit<VersionVitalsRow, "versionCode">][] = [
    ["crashRateMetricSet", "crashRate"],
    ["anrRateMetricSet", "anrRate"],
    ["slowStartRateMetricSet", "slowStartRate"],
    ["slowRenderingRateMetricSet", "slowRenderingRate"],
  ];

  const results = await Promise.allSettled(
    metricSets.map(([ms]) =>
      queryMetric(reporting, packageName, ms, { dimension: "versionCode", days }),
    ),
  );

  const row1: VersionVitalsRow = { versionCode: v1 };
  const row2: VersionVitalsRow = { versionCode: v2 };

  for (let i = 0; i < metricSets.length; i++) {
    const entry = metricSets[i];
    const result = results[i];
    if (!entry || !result || result.status !== "fulfilled") continue;
    const key = entry[1];
    const rows = result.value.rows ?? [];

    const extractAvgForVersion = (vc: string): number | undefined => {
      const matching = rows.filter((r) => {
        const dims = r.dimensions as Record<string, unknown>[] | undefined;
        return dims?.some((d) => (d as Record<string, unknown>)["stringValue"] === vc) ?? false;
      });
      if (matching.length === 0) return undefined;
      const values = matching
        .map((r) => {
          const firstKey = Object.keys(r.metrics)[0];
          return firstKey ? Number(r.metrics[firstKey]?.decimalValue?.value) : NaN;
        })
        .filter((v) => !isNaN(v));
      if (values.length === 0) return undefined;
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    (row1 as unknown as Record<string, unknown>)[key] = extractAvgForVersion(v1);
    (row2 as unknown as Record<string, unknown>)[key] = extractAvgForVersion(v2);
  }

  const regressions: string[] = [];
  for (const [, key] of metricSets) {
    const val1 = (row1 as unknown as Record<string, unknown>)[key] as number | undefined;
    const val2 = (row2 as unknown as Record<string, unknown>)[key] as number | undefined;
    if (val1 !== undefined && val2 !== undefined && val2 > val1 * 1.05) {
      regressions.push(key as string);
    }
  }

  return { v1: row1, v2: row2, regressions };
}

export interface WatchVitalsOptions {
  /** Polling interval in milliseconds. Defaults to 5 minutes. */
  intervalMs?: number;
  /** Threshold value; breach triggers halt. */
  threshold: number;
  /** Metric set to monitor. Defaults to crashRateMetricSet. */
  metricSet?: VitalsMetricSet;
  /** Called when threshold is breached. Implement halt logic here. */
  onHalt?: (value: number) => Promise<void>;
  /** Called on each poll result (value may be undefined if no data). */
  onPoll?: (value: number | undefined, breached: boolean) => void;
  /** Called when a poll fails; polling continues. */
  onError?: (err: unknown) => void;
}

/**
 * Poll vitals on an interval; invoke onHalt if threshold is breached.
 * Returns a stop function — call it to cancel the watch loop.
 */
export function watchVitalsWithAutoHalt(
  reporting: ReportingApiClient,
  packageName: string,
  options: WatchVitalsOptions,
): () => void {
  const {
    intervalMs = 5 * 60 * 1000,
    threshold,
    metricSet = "crashRateMetricSet",
    onHalt,
    onPoll,
    onError,
  } = options;

  let stopped = false;
  let haltTriggered = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const result = await queryMetric(reporting, packageName, metricSet, { days: 1 });
      const value = latestWorstValue(result.rows, METRIC_SET_METRICS[metricSet]?.[0]);
      const breached = value !== undefined && value > threshold;
      onPoll?.(value, breached);

      if (breached && !haltTriggered && onHalt) {
        haltTriggered = true;
        await onHalt(value as number);
      }
    } catch (err) {
      // Keep polling, but say so: a silent failure looked like a healthy metric.
      onError?.(err);
    }

    if (!stopped) {
      timerId = setTimeout(poll, intervalMs);
    }
  };

  let timerId = setTimeout(poll, 0);

  return () => {
    stopped = true;
    clearTimeout(timerId);
  };
}
