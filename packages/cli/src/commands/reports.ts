import type { Command } from "commander";
import {
  parseMonth,
  isValidReportType,
  isFinancialReportType,
  isStatsReportType,
  GpcError,
} from "@gpc-cli/core";

const FINANCIAL_REPORT_MESSAGE = `Financial reports (earnings, sales, estimated_sales, play_balance) are not available through the Google Play Developer API.

These reports are delivered as CSV files in Google Cloud Storage buckets.
To access them:
  1. Open Google Play Console → "Download reports" → "Financial"
  2. For programmatic access, use the GCS bucket URI shown in Play Console
     with the Google Cloud Storage API or gsutil.

See: https://support.google.com/googleplay/android-developer/answer/6135870`;

const STATS_REPORT_MESSAGE = `Stats reports (installs, crashes, ratings, reviews, store_performance, subscriptions) are not available through the Google Play Developer API as downloadable CSVs.

These reports are delivered as CSV files in Google Cloud Storage buckets.
To access them:
  1. Open Google Play Console → "Download reports" → "Statistics"
  2. For programmatic access, use the GCS bucket URI shown in Play Console
     with the Google Cloud Storage API or gsutil.

For real-time crash and ANR metrics, use:
  gpc vitals crashes
  gpc vitals anr
  gpc vitals overview

See: https://support.google.com/googleplay/android-developer/answer/6135870`;

export function registerReportsCommands(program: Command): void {
  const reports = program
    .command("reports")
    .description("Financial and stats reports (via Google Cloud Storage)");

  reports
    .command("list <report-type>")
    .description("List available reports")
    .option("--month <YYYY-MM>", "Report month (e.g., 2026-03)")
    .option("--limit <n>", "Maximum results to return")
    .option("--next-page <token>", "Pagination token for next page")
    .action(async (reportType: string, options) => {
      if (!isValidReportType(reportType)) {
        throw new GpcError(
          `Invalid report type "${reportType}". Valid types: earnings, sales, estimated_sales, installs, crashes, ratings, reviews, store_performance, subscriptions, play_balance`,
          "INVALID_REPORT_TYPE",
          2,
        );
      }

      // Validate month format if provided
      if (options.month) {
        parseMonth(options.month);
      }

      const message = isFinancialReportType(reportType)
        ? FINANCIAL_REPORT_MESSAGE
        : STATS_REPORT_MESSAGE;
      throw new GpcError(message, "REPORT_NOT_AVAILABLE", 2);
    });

  const download = reports.command("download").description("Download a report");

  download
    .command("financial")
    .description("Download a financial report")
    .option("--month <YYYY-MM>", "Report month (e.g., 2026-03)")
    .option("--type <report-type>", "Report type", "earnings")
    .option("--output-file <path>", "Save to file instead of stdout")
    .action(async (options) => {
      if (options.type && !isFinancialReportType(options.type)) {
        throw new GpcError(
          `Invalid financial report type "${options.type}". Valid types: earnings, sales, estimated_sales, play_balance`,
          "INVALID_REPORT_TYPE",
          2,
        );
      }

      throw new GpcError(FINANCIAL_REPORT_MESSAGE, "REPORT_NOT_AVAILABLE", 2);
    });

  download
    .command("stats")
    .description("Download a stats report")
    .option("--month <YYYY-MM>", "Report month (e.g., 2026-03)")
    .option(
      "--type <report-type>",
      "Report type (installs, crashes, ratings, reviews, store_performance, subscriptions)",
    )
    .option("--output-file <path>", "Save to file instead of stdout")
    .action(async (options) => {
      if (options.type && !isStatsReportType(options.type)) {
        throw new GpcError(
          `Invalid stats report type "${options.type}". Valid types: installs, crashes, ratings, reviews, store_performance, subscriptions`,
          "INVALID_REPORT_TYPE",
          2,
        );
      }

      throw new GpcError(STATS_REPORT_MESSAGE, "REPORT_NOT_AVAILABLE", 2);
    });
}
