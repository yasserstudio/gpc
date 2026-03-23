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
  errorCountMetricSet: ["errorReportCount", "distinctUsers"],
};

function buildQuery(metricSet: VitalsMetricSet, options?: VitalsQueryOptions): MetricSetQuery {
  const metrics = METRIC_SET_METRICS[metricSet] ?? ["errorReportCount", "distinctUsers"];

  const days = options?.days ?? 30;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const end = new Date(Date.now() - DAY_MS); // API data lags ~1 day; cap to yesterday
  const start = new Date(Date.now() - DAY_MS - days * DAY_MS);

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

  return query;
}

async function queryMetric(
  reporting: ReportingApiClient,
  packageName: string,
  metricSet: VitalsMetricSet,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  const query = buildQuery(metricSet, options);
  return reporting.queryMetricSet(packageName, metricSet, query);
}

export async function getVitalsOverview(
  reporting: ReportingApiClient,
  packageName: string,
): Promise<VitalsOverview> {
  const metricSets: [VitalsMetricSet, keyof VitalsOverview][] = [
    ["crashRateMetricSet", "crashRate"],
    ["anrRateMetricSet", "anrRate"],
    ["slowStartRateMetricSet", "slowStartRate"],
    ["slowRenderingRateMetricSet", "slowRenderingRate"],
    ["excessiveWakeupRateMetricSet", "excessiveWakeupRate"],
    ["stuckBackgroundWakelockRateMetricSet", "stuckWakelockRate"],
  ];

  const results = await Promise.allSettled(
    metricSets.map(([metric]) => reporting.queryMetricSet(packageName, metric, buildQuery(metric))),
  );

  const overview: VitalsOverview = {};
  for (let i = 0; i < metricSets.length; i++) {
    const entry = metricSets[i];
    if (!entry) continue;
    const key = entry[1];
    const result = results[i];
    if (!result) continue;
    if (result.status === "fulfilled") {
      overview[key] = result.value.rows || [];
    }
  }

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
  // API requires startType as a dimension for slowStartRateMetricSet;
  // auto-include it if no dimension is explicitly specified
  const opts = options?.dimension
    ? options
    : { ...options, dimension: "startType" as ReportingDimension };
  return queryMetric(reporting, packageName, "slowStartRateMetricSet", opts);
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
  return queryMetric(reporting, packageName, "stuckBackgroundWakelockRateMetricSet", {
    ...options,
    aggregation: "DAILY",
  });
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

  // Cap to 2 days ago — API data typically lags 1-2 days; using 2 ensures
  // the endTime is always within the available data window.
  const baseMs = nowMs - 2 * DAY_MS;

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

  const makeQuery = (start: Date, end: Date): MetricSetQuery => ({
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
  } = options;

  let stopped = false;
  let haltTriggered = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const result = await queryMetric(reporting, packageName, metricSet, { days: 1 });
      const latestRow = result.rows?.[result.rows.length - 1];
      const firstMetric = latestRow?.metrics ? Object.keys(latestRow.metrics)[0] : undefined;
      const value = firstMetric
        ? Number(latestRow?.metrics[firstMetric]?.decimalValue?.value)
        : undefined;

      const breached = value !== undefined && value > threshold;
      onPoll?.(value, breached);

      if (breached && !haltTriggered && onHalt) {
        haltTriggered = true;
        await onHalt(value as number);
      }
    } catch {
      // swallow errors in background polling
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
