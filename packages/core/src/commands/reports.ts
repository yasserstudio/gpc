import type { ReportType, StatsDimension } from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import {
  listReportObjects,
  downloadReportObject,
  type ReportsAuth,
  type ReportObject,
} from "../reports/gcs.js";
import { decodeStatsCsv, extractCsvEntriesFromZip, isZip, type ZipCsvEntry } from "../reports/decode.js";
import { reportObjectNotFoundError } from "../reports/errors.js";

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
  "traffic_source",
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

/** "2026-06" -> "202606", the token embedded in Play report object names. */
export function monthToken(parsed: ParsedMonth): string {
  return `${parsed.year}${String(parsed.month).padStart(2, "0")}`;
}

/**
 * True when the object name carries this month token as a standalone digit run. A bare
 * substring test is not enough: financial object names also embed account/merchant ids,
 * and any longer digit run can contain the 6 digits of another month (e.g. id 5202606374
 * contains "202606"), silently matching the wrong month.
 */
function nameHasMonth(name: string, token: string): boolean {
  return new RegExp(`(?<![0-9])${token}(?![0-9])`).test(name);
}

/**
 * Resolve the reports bucket name. Play links one bucket per developer account, named
 * pubsite_prod_<developerId>; an explicit config/flag value wins for accounts whose bucket
 * URI differs.
 */
export function resolveReportsBucket(config: {
  reports?: { bucket?: string };
  developerId?: string;
}): string {
  const explicit = config.reports?.bucket?.trim();
  if (explicit) {
    // Accept a full gs:// URI pasted from Play Console and reduce it to the bucket name.
    const reduced = explicit.replace(/^gs:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9][a-z0-9._-]{1,221}$/.test(reduced)) {
      throw new GpcError(
        `Invalid reports bucket name "${reduced}".`,
        "REPORT_BUCKET_INVALID",
        2,
        "Copy the exact Cloud Storage URI from Play Console -> Download reports. The bucket " +
          "name looks like pubsite_prod_<developerId>.",
      );
    }
    return reduced;
  }
  if (config.developerId) {
    return `pubsite_prod_${config.developerId}`;
  }
  throw new GpcError(
    "Cannot determine the Play reports bucket: no bucket configured and no developer id set.",
    "REPORT_BUCKET_UNKNOWN",
    2,
    "Set your developer id (gpc config set developerId <id> or GPC_DEVELOPER_ID) so the " +
      "default pubsite_prod_<developerId> bucket can be derived, or pass the bucket " +
      "directly with --bucket / GPC_REPORTS_BUCKET / the reports.bucket config key. The " +
      "exact URI is shown in Play Console -> Download reports.",
  );
}

/**
 * Object-name prefix for a report type, per Play's documented bucket layout:
 *   stats/<type>/<type>_<package>_<YYYYMM>_<dimension>.csv
 *   reviews/reviews_<package>_<YYYYMM>.csv
 *   financial-stats/subscriptions/subscriptions_<package>_<YYYYMM>_country.csv
 *   earnings/earnings_<YYYYMM>*.zip   sales/salesreport_<YYYYMM>.zip   play_balance/...
 * Financial reports are account-level, so the package name never narrows them.
 */
export function reportPrefix(reportType: ReportType, packageName?: string): string {
  switch (reportType) {
    case "earnings":
      return "earnings/";
    case "sales":
    case "estimated_sales":
      return "sales/";
    case "play_balance":
      return "play_balance/";
    case "reviews":
      return packageName ? `reviews/reviews_${packageName}_` : "reviews/";
    case "subscriptions":
      return packageName
        ? `financial-stats/subscriptions/subscriptions_${packageName}_`
        : "financial-stats/subscriptions/";
    default:
      return packageName
        ? `stats/${reportType}/${reportType}_${packageName}_`
        : `stats/${reportType}/`;
  }
}

export interface ListReportsResult {
  reports: ReportObject[];
  nextPageToken?: string;
}

export async function listReports(
  auth: ReportsAuth,
  bucket: string,
  reportType: ReportType,
  options: {
    packageName?: string;
    month?: ParsedMonth;
    maxResults?: number;
    pageToken?: string;
  } = {},
): Promise<ListReportsResult> {
  const packageName = isStatsReportType(reportType) ? options.packageName : undefined;
  // When both the package and the month are known, the month is part of the object-name
  // prefix (stats/<t>/<t>_<pkg>_<YYYYMM>...), so narrow server-side: it keeps pagination
  // consistent (a month-filtered page can otherwise be empty while pages remain).
  const basePrefix = reportPrefix(reportType, packageName);
  const serverSideMonth = Boolean(packageName && options.month);
  const prefix = serverSideMonth
    ? `${basePrefix}${monthToken(options.month as ParsedMonth)}`
    : basePrefix;
  const { objects, nextPageToken } = await listReportObjects(auth, bucket, {
    prefix,
    maxResults: options.maxResults,
    pageToken: options.pageToken,
  });
  const reports =
    options.month && !serverSideMonth
      ? objects.filter((o) => nameHasMonth(o.name, monthToken(options.month as ParsedMonth)))
      : objects;
  return { reports, nextPageToken };
}

export interface StatsReportDownload {
  objectName: string;
  csv: string;
}

export async function downloadStatsReport(
  auth: ReportsAuth,
  bucket: string,
  packageName: string,
  reportType: ReportType,
  month: ParsedMonth,
  dimension: StatsDimension,
): Promise<StatsReportDownload> {
  const token = monthToken(month);
  const prefix = `${reportPrefix(reportType, packageName)}${token}`;
  const { objects } = await listReportObjects(auth, bucket, { prefix });

  // Reviews reports have no dimension axis: reviews_<pkg>_<YYYYMM>.csv
  const wanted =
    reportType === "reviews"
      ? objects.find((o) => o.name.endsWith(`${token}.csv`))
      : objects.find((o) => o.name.endsWith(`${token}_${dimension}.csv`));

  if (!wanted) {
    const available = objects
      .map((o) => new RegExp(`(?<![0-9])${token}_([a-z_]+)\\.csv$`).exec(o.name)?.[1])
      .filter((d): d is string => Boolean(d));
    throw reportObjectNotFoundError({
      reportType,
      month: `${month.year}-${String(month.month).padStart(2, "0")}`,
      dimension: reportType === "reviews" ? undefined : dimension,
      available: [...new Set(available)],
    });
  }

  const bytes = await downloadReportObject(auth, bucket, wanted.name);
  try {
    return { objectName: wanted.name, csv: decodeStatsCsv(bytes) };
  } catch (err) {
    throw new GpcError(
      `Could not decode the report "${wanted.name}": ${err instanceof Error ? err.message : String(err)}`,
      "REPORT_DECODE_FAILED",
      4,
      "Re-download in case the transfer was corrupted. If the error persists, the object " +
        "may be malformed; download it from Play Console -> Download reports to compare.",
    );
  }
}

export type FinancialReportDownload =
  | { objectName: string; kind: "csv"; text: string }
  | { objectName: string; kind: "zip"; entries: ZipCsvEntry[]; raw: Buffer };

export async function downloadFinancialReport(
  auth: ReportsAuth,
  bucket: string,
  reportType: ReportType,
  month: ParsedMonth,
  options: { extractEntries?: boolean } = {},
): Promise<FinancialReportDownload> {
  const token = monthToken(month);
  const { objects } = await listReportObjects(auth, bucket, {
    prefix: reportPrefix(reportType),
  });
  const matches = objects.filter((o) => nameHasMonth(o.name, token));

  if (matches.length === 0) {
    const availableMonths = [
      ...new Set(
        objects
          .map((o) => /(?<![0-9])(\d{4})(\d{2})(?![0-9])/.exec(o.name))
          .filter((m): m is RegExpExecArray => m !== null)
          .map((m) => `${m[1]}-${m[2]}`),
      ),
    ].slice(-6);
    throw reportObjectNotFoundError({
      reportType,
      month: `${month.year}-${String(month.month).padStart(2, "0")}`,
      available: availableMonths,
    });
  }

  // Play publishes one archive per month per financial report type; if variants ever
  // coexist, take the lexicographically last (most specific / most recent naming).
  const chosen = matches[matches.length - 1] as ReportObject;
  const bytes = await downloadReportObject(auth, bucket, chosen.name);

  if (isZip(bytes)) {
    // Extraction is skippable (extractEntries: false) for raw-archive saves, where a
    // corrupt-but-downloadable archive should still land on disk.
    if (options.extractEntries === false) {
      return { objectName: chosen.name, kind: "zip", entries: [], raw: bytes };
    }
    let entries: ZipCsvEntry[];
    try {
      entries = await extractCsvEntriesFromZip(bytes);
    } catch (err) {
      throw new GpcError(
        `Could not read the report archive "${chosen.name}": ${err instanceof Error ? err.message : String(err)}`,
        "REPORT_ARCHIVE_UNREADABLE",
        4,
        "Save the raw archive instead (--output-file report.zip) and open it locally, or " +
          "re-download in case the transfer was corrupted.",
      );
    }
    return { objectName: chosen.name, kind: "zip", entries, raw: bytes };
  }
  return { objectName: chosen.name, kind: "csv", text: decodeStatsCsv(bytes) };
}
