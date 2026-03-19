import { createHttpClient } from "./http.js";
import { createRateLimiter, RATE_LIMIT_BUCKETS } from "./rate-limiter.js";
import type {
  AnomalyDetectionResponse,
  ApiClientOptions,
  ErrorIssuesResponse,
  ErrorReportsResponse,
  MetricSetQuery,
  MetricSetResponse,
  VitalsMetricSet,
} from "./types.js";

const REPORTING_BASE_URL = "https://playdeveloperreporting.googleapis.com/v1beta1";

export interface ReportingApiClient {
  queryMetricSet(
    packageName: string,
    metricSet: VitalsMetricSet,
    query: MetricSetQuery,
  ): Promise<MetricSetResponse>;

  getAnomalies(packageName: string): Promise<AnomalyDetectionResponse>;

  searchErrorIssues(
    packageName: string,
    filter?: string,
    pageSize?: number,
    pageToken?: string,
  ): Promise<ErrorIssuesResponse>;

  searchErrorReports(
    packageName: string,
    issueName: string,
    pageSize?: number,
    pageToken?: string,
  ): Promise<ErrorReportsResponse>;
}

export function createReportingClient(options: ApiClientOptions): ReportingApiClient {
  const http = createHttpClient({ ...options, baseUrl: REPORTING_BASE_URL });
  const reportingBucket = RATE_LIMIT_BUCKETS["reporting"];
  const limiter = options.rateLimiter ?? createRateLimiter(reportingBucket ? [reportingBucket] : []);

  return {
    async queryMetricSet(packageName, metricSet, query) {
      await limiter.acquire("reporting");
      const { data } = await http.post<MetricSetResponse>(
        `/apps/${packageName}/${metricSet}:query`,
        query,
      );
      return data;
    },

    async getAnomalies(packageName) {
      await limiter.acquire("reporting");
      const { data } = await http.get<AnomalyDetectionResponse>(`/apps/${packageName}/anomalies`);
      return data;
    },

    async searchErrorIssues(packageName, filter?, pageSize?, pageToken?) {
      await limiter.acquire("reporting");
      const params: Record<string, string> = {};
      if (filter) params["filter"] = filter;
      if (pageSize) params["pageSize"] = String(pageSize);
      if (pageToken) params["pageToken"] = pageToken;
      const { data } = await http.get<ErrorIssuesResponse>(
        `/apps/${packageName}/errorIssues:search`,
        params,
      );
      return data;
    },

    async searchErrorReports(packageName, issueName, pageSize?, pageToken?) {
      await limiter.acquire("reporting");
      const params: Record<string, string> = {};
      if (pageSize) params["pageSize"] = String(pageSize);
      if (pageToken) params["pageToken"] = pageToken;
      const { data } = await http.get<ErrorReportsResponse>(
        `/apps/${packageName}/errorIssues/${issueName}/reports`,
        params,
      );
      return data;
    },
  };
}
