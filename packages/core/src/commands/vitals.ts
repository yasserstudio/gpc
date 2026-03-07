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
} from "@gpc/api";

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

function buildQuery(options?: VitalsQueryOptions): MetricSetQuery {
  const query: MetricSetQuery = {
    metrics: ["errorReportCount", "distinctUsers"],
  };

  if (options?.dimension) {
    query.dimensions = [options.dimension];
  }

  if (options?.days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - options.days);
    query.timelineSpec = {
      aggregationPeriod: options.aggregation ?? "DAILY",
      startTime: {
        year: start.getFullYear(),
        month: start.getMonth() + 1,
        day: start.getDate(),
      },
      endTime: {
        year: end.getFullYear(),
        month: end.getMonth() + 1,
        day: end.getDate(),
      },
    };
  }

  return query;
}

async function queryMetric(
  reporting: ReportingApiClient,
  packageName: string,
  metricSet: VitalsMetricSet,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  const query = buildQuery(options);
  return reporting.queryMetricSet(packageName, metricSet, query);
}

export async function getVitalsOverview(
  reporting: ReportingApiClient,
  packageName: string,
): Promise<VitalsOverview> {
  const metricSets: [VitalsMetricSet, keyof VitalsOverview][] = [
    ["vitals.crashrate", "crashRate"],
    ["vitals.anrrate", "anrRate"],
    ["vitals.slowstartrate", "slowStartRate"],
    ["vitals.slowrenderingrate", "slowRenderingRate"],
    ["vitals.excessivewakeuprate", "excessiveWakeupRate"],
    ["vitals.stuckbackgroundwakelockrate", "stuckWakelockRate"],
  ];

  const results = await Promise.allSettled(
    metricSets.map(([metric]) =>
      reporting.queryMetricSet(packageName, metric, {
        metrics: ["errorReportCount", "distinctUsers"],
      }),
    ),
  );

  const overview: VitalsOverview = {};
  for (let i = 0; i < metricSets.length; i++) {
    const entry = metricSets[i]!;
    const key = entry[1];
    const result = results[i]!;
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
  return queryMetric(reporting, packageName, "vitals.crashrate", options);
}

export async function getVitalsAnr(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "vitals.anrrate", options);
}

export async function getVitalsStartup(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "vitals.slowstartrate", options);
}

export async function getVitalsRendering(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "vitals.slowrenderingrate", options);
}

export async function getVitalsBattery(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "vitals.excessivewakeuprate", options);
}

export async function getVitalsMemory(
  reporting: ReportingApiClient,
  packageName: string,
  options?: VitalsQueryOptions,
): Promise<MetricSetResponse> {
  return queryMetric(reporting, packageName, "vitals.stuckbackgroundwakelockrate", options);
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
  return reporting.searchErrorIssues(
    packageName,
    options?.filter,
    options?.maxResults,
  );
}

export function checkThreshold(
  value: number | undefined,
  threshold: number,
): ThresholdResult {
  return {
    breached: value !== undefined && value > threshold,
    value,
    threshold,
  };
}
