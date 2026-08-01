import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import {
  parseMonth,
  isValidReportType,
  isFinancialReportType,
  isStatsReportType,
  isValidStatsDimension,
  resolveReportsBucket,
  listReports,
  downloadStatsReport,
  downloadFinancialReport,
  formatOutput,
  annotateListResult,
  moreResultsFooter,
  GpcError,
} from "@gpc-cli/core";
import type { ReportType, StatsDimension } from "@gpc-cli/api";
import { resolvePackageName, getAuthClient } from "../resolve.js";
import { getOutputFormat } from "../format.js";

function resolveBucket(bucketFlag: string | undefined, config: object): string {
  if (bucketFlag) return resolveReportsBucket({ reports: { bucket: bucketFlag } });
  return resolveReportsBucket(config);
}

/** The app package narrows stats prefixes; financial reports are account-level. */
function optionalPackageName(program: Command, config: { app?: string }): string | undefined {
  return (program.opts()["app"] as string | undefined) || config.app || process.env["GPC_APP"];
}

// Manual check instead of commander's .requiredOption so the usage exit code is 2 per the
// project contract (commander exits 1 without a global exitOverride).
function requireReportOption(value: unknown, flag: string, example: string): void {
  if (!value) {
    throw new GpcError(
      `Missing required option ${flag}.`,
      "MISSING_REQUIRED_OPTION",
      2,
      `Specify ${flag}, for example: ${flag} ${example}`,
    );
  }
}

function parseLimit(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new GpcError(
      `Invalid --limit "${value}". Must be a positive integer.`,
      "INVALID_LIMIT",
      2,
      "Pass a whole number of results to return, for example: --limit 50",
    );
  }
  return n;
}

// Report CSVs can hold revenue data and review PII — keep saved files owner-only.
const OUTPUT_FILE_MODE = 0o600;

async function saveOrPrint(
  text: string,
  outputFile: string | undefined,
  objectName: string,
  format: string,
): Promise<void> {
  if (outputFile) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(outputFile, text, { encoding: "utf8", mode: OUTPUT_FILE_MODE });
    if (format === "json") {
      console.log(
        JSON.stringify({ objectName, outputFile, bytes: Buffer.byteLength(text) }, null, 2),
      );
    } else {
      console.log(`Saved ${objectName} to ${outputFile}`);
    }
    return;
  }
  if (format === "json") {
    console.log(JSON.stringify({ objectName, csv: text }, null, 2));
  } else {
    process.stdout.write(text);
  }
}

export function registerReportsCommands(program: Command): void {
  const reports = program
    .command("reports")
    .description("Financial and stats reports (via Google Cloud Storage)");

  reports
    .command("list <report-type>")
    .description("List available report files in the Play reports bucket")
    .option("--month <YYYY-MM>", "Only reports for this month (e.g., 2026-03)")
    .option("--bucket <name>", "GCS bucket (default: pubsite_prod_<developerId>)")
    .option("--limit <n>", "Maximum results to return")
    .option("--next-page <token>", "Pagination token for next page")
    .action(async (reportType: string, options) => {
      if (!isValidReportType(reportType)) {
        throw new GpcError(
          `Invalid report type "${reportType}". Valid types: earnings, sales, estimated_sales, installs, crashes, ratings, reviews, store_performance, subscriptions, play_balance`,
          "INVALID_REPORT_TYPE",
          2,
          "Run 'gpc reports list --help' for the full list of report types.",
        );
      }
      const month = options.month ? parseMonth(options.month) : undefined;
      const maxResults = parseLimit(options.limit);

      const config = await loadConfig();
      const bucket = resolveBucket(options.bucket, config);
      const auth = await getAuthClient(config, { storage: true });
      const format = getOutputFormat(program, config);

      const result = await listReports(auth, bucket, reportType, {
        packageName: optionalPackageName(program, config),
        month,
        maxResults,
        pageToken: options.nextPage,
      });

      const emptyMessage = month
        ? `No ${reportType} report files found for ${options.month} in ${bucket}.`
        : `No ${reportType} report files found in ${bucket}.`;
      if (format === "json") {
        console.log(formatOutput(annotateListResult(result, "reports", emptyMessage), format));
        return;
      }
      if (result.reports.length === 0) {
        console.log(emptyMessage);
      } else {
        console.log(
          formatOutput(
            result.reports.map((r) => ({ name: r.name, size: r.size, updated: r.updated ?? "" })),
            format,
          ),
        );
      }
      // Emitted on the empty path too: a month-filtered page can be empty while more
      // pages exist, and the resume hint is the only way forward.
      const footer = moreResultsFooter(result.nextPageToken);
      if (footer) console.log(footer);
    });

  const download = reports.command("download").description("Download a report");

  download
    .command("financial")
    .description("Download a financial report")
    .option("--month <YYYY-MM>", "Report month (e.g., 2026-03)")
    .option("--type <report-type>", "Report type", "earnings")
    .option("--bucket <name>", "GCS bucket (default: pubsite_prod_<developerId>)")
    .option("--output-file <path>", "Save to file instead of stdout (.zip saves the raw archive)")
    .action(async (options) => {
      if (options.type && !isFinancialReportType(options.type)) {
        throw new GpcError(
          `Invalid financial report type "${options.type}". Valid types: earnings, sales, estimated_sales, play_balance`,
          "INVALID_REPORT_TYPE",
          2,
          "Run 'gpc reports download financial --help' for details.",
        );
      }
      requireReportOption(options.month, "--month", "2026-03");
      const month = parseMonth(options.month);

      const config = await loadConfig();
      const bucket = resolveBucket(options.bucket, config);
      const auth = await getAuthClient(config, { storage: true });
      const format = getOutputFormat(program, config);

      // Raw-archive saves don't need the entries extracted (and must not fail on an
      // archive GPC cannot read — the bytes are still worth writing to disk).
      const rawZipSave = Boolean(options.outputFile && /\.zip$/i.test(options.outputFile));
      const result = await downloadFinancialReport(
        auth,
        bucket,
        options.type as ReportType,
        month,
        {
          extractEntries: !rawZipSave,
        },
      );

      if (result.kind === "csv") {
        await saveOrPrint(result.text, options.outputFile, result.objectName, format);
        return;
      }
      if (rawZipSave && options.outputFile) {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(options.outputFile, result.raw, { mode: OUTPUT_FILE_MODE });
        if (format === "json") {
          console.log(
            JSON.stringify(
              {
                objectName: result.objectName,
                outputFile: options.outputFile,
                bytes: result.raw.length,
              },
              null,
              2,
            ),
          );
        } else {
          console.log(`Saved ${result.objectName} to ${options.outputFile}`);
        }
        return;
      }
      if (result.entries.length === 1) {
        const entry = result.entries[0] as { name: string; text: string };
        await saveOrPrint(
          entry.text,
          options.outputFile,
          `${result.objectName}:${entry.name}`,
          format,
        );
        return;
      }
      // Multi-CSV archive: JSON consumers get every entry inline; the human/stdout path
      // is directed to save the archive whole.
      if (format === "json" && !options.outputFile) {
        console.log(
          JSON.stringify(
            {
              objectName: result.objectName,
              entries: result.entries.map((e) => ({ name: e.name, csv: e.text })),
            },
            null,
            2,
          ),
        );
        return;
      }
      throw new GpcError(
        `Report archive ${result.objectName} contains ${result.entries.length} CSV files.`,
        "REPORT_MULTIPLE_ENTRIES",
        2,
        `Save the full archive instead: --output-file report.zip (entries: ${result.entries
          .map((e) => e.name)
          .join(", ")})`,
      );
    });

  download
    .command("stats")
    .description("Download a stats report")
    .option("--month <YYYY-MM>", "Report month (e.g., 2026-03)")
    .option(
      "--type <report-type>",
      "Report type (installs, crashes, ratings, reviews, store_performance, subscriptions)",
    )
    .option(
      "--dimension <dimension>",
      "Report dimension (overview, country, language, os_version, device, app_version, carrier, traffic_source)",
      "overview",
    )
    .option("--bucket <name>", "GCS bucket (default: pubsite_prod_<developerId>)")
    .option("--output-file <path>", "Save to file instead of stdout")
    .action(async (options) => {
      requireReportOption(options.type, "--type", "installs");
      if (!isStatsReportType(options.type)) {
        throw new GpcError(
          `Invalid stats report type "${options.type}". Valid types: installs, crashes, ratings, reviews, store_performance, subscriptions`,
          "INVALID_REPORT_TYPE",
          2,
          "Run 'gpc reports download stats --help' for details.",
        );
      }
      if (!isValidStatsDimension(options.dimension)) {
        throw new GpcError(
          `Invalid dimension "${options.dimension}". Valid dimensions: overview, country, language, os_version, device, app_version, carrier, traffic_source`,
          "INVALID_REPORT_DIMENSION",
          2,
          "Omit --dimension for the default overview report.",
        );
      }
      requireReportOption(options.month, "--month", "2026-03");
      const month = parseMonth(options.month);

      const config = await loadConfig();
      const bucket = resolveBucket(options.bucket, config);
      const packageName = resolvePackageName(program.opts()["app"], config);
      const auth = await getAuthClient(config, { storage: true });
      const format = getOutputFormat(program, config);

      const result = await downloadStatsReport(
        auth,
        bucket,
        packageName,
        options.type as ReportType,
        month,
        options.dimension as StatsDimension,
      );
      await saveOrPrint(result.csv, options.outputFile, result.objectName, format);
    });
}
