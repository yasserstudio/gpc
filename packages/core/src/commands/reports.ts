import type { PlayApiClient, ReportBucket, ReportType, StatsDimension } from "@gpc/api";

const FINANCIAL_REPORT_TYPES: ReadonlySet<string> = new Set([
  "earnings",
  "sales",
  "estimated_sales",
  "play_balance",
]);

const STATS_REPORT_TYPES: ReadonlySet<string> = new Set([
  "installs",
  "crashes",
  "ratings",
  "reviews",
  "store_performance",
  "subscriptions",
]);

const VALID_DIMENSIONS: ReadonlySet<string> = new Set([
  "country",
  "language",
  "os_version",
  "device",
  "app_version",
  "carrier",
  "overview",
]);

export function isFinancialReportType(type: string): boolean {
  return FINANCIAL_REPORT_TYPES.has(type);
}

export function isStatsReportType(type: string): boolean {
  return STATS_REPORT_TYPES.has(type);
}

export function isValidReportType(type: string): type is ReportType {
  return FINANCIAL_REPORT_TYPES.has(type) || STATS_REPORT_TYPES.has(type);
}

export function isValidStatsDimension(dim: string): dim is StatsDimension {
  return VALID_DIMENSIONS.has(dim);
}

export interface ParsedMonth {
  year: number;
  month: number;
}

export function parseMonth(monthStr: string): ParsedMonth {
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr);
  if (!match) {
    throw new Error(
      `Invalid month format "${monthStr}". Expected YYYY-MM (e.g., 2026-03).`,
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month "${month}". Must be between 01 and 12.`);
  }
  return { year, month };
}

export async function listReports(
  client: PlayApiClient,
  packageName: string,
  reportType: ReportType,
  year: number,
  month: number,
): Promise<ReportBucket[]> {
  const response = await client.reports.list(packageName, reportType, year, month);
  return response.reports || [];
}

export async function downloadReport(
  client: PlayApiClient,
  packageName: string,
  reportType: ReportType,
  year: number,
  month: number,
): Promise<string> {
  const reports = await listReports(client, packageName, reportType, year, month);

  if (reports.length === 0) {
    throw new Error(
      `No ${reportType} reports found for ${year}-${String(month).padStart(2, "0")}.`,
    );
  }

  // Download the first report bucket (signed URI — no auth needed)
  const bucket = reports[0];
  if (!bucket) {
    throw new Error(
      `No ${reportType} reports found for ${year}-${String(month).padStart(2, "0")}.`,
    );
  }
  const uri = bucket.uri;
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error(
      `Failed to download report from signed URI: HTTP ${response.status}`,
    );
  }

  return response.text();
}
