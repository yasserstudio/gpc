import type { PlayApiClient, ReportBucket, ReportType, StatsDimension } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

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
    throw new GpcError(
      `Invalid month format "${monthStr}". Expected YYYY-MM (e.g., 2026-03).`,
      "REPORT_INVALID_MONTH",
      2,
      "Use the format YYYY-MM, for example: --month 2026-03",
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new GpcError(
      `Invalid month "${month}". Must be between 01 and 12.`,
      "REPORT_INVALID_MONTH",
      2,
      "The month value must be between 01 and 12.",
    );
  }
  return { year, month };
}

export async function listReports(
  _client: PlayApiClient,
  _packageName: string,
  reportType: ReportType,
  _year: number,
  _month: number,
): Promise<ReportBucket[]> {
  throw new GpcError(
    `Report listing for "${reportType}" is not available through the Google Play Developer API.`,
    "REPORT_NOT_SUPPORTED",
    1,
    isFinancialReportType(reportType)
      ? "Financial reports are delivered via Google Cloud Storage. Access them from Play Console → Download reports → Financial."
      : "Stats reports are delivered via Google Cloud Storage. For real-time metrics, use 'gpc vitals' commands.",
  );
}

export async function downloadReport(
  _client: PlayApiClient,
  _packageName: string,
  reportType: ReportType,
  _year: number,
  _month: number,
): Promise<string> {
  throw new GpcError(
    `Report download for "${reportType}" is not available through the Google Play Developer API.`,
    "REPORT_NOT_SUPPORTED",
    1,
    isFinancialReportType(reportType)
      ? "Financial reports are delivered via Google Cloud Storage. Access them from Play Console → Download reports → Financial."
      : "Stats reports are delivered via Google Cloud Storage. For real-time metrics, use 'gpc vitals' commands.",
  );
}
