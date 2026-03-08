import type { Command } from "commander";
import { loadConfig } from "@gpc/config";
import { resolveAuth } from "@gpc/auth";
import { createApiClient } from "@gpc/api";
import {
  listReports,
  downloadReport,
  parseMonth,
  isValidReportType,
  isFinancialReportType,
  isStatsReportType,
  isValidStatsDimension,
  detectOutputFormat,
  formatOutput,
} from "@gpc/core";
import type { ReportType, StatsDimension } from "@gpc/api";
import { writeFile } from "node:fs/promises";

function resolvePackageName(packageArg: string | undefined, config: any): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getClient(config: any) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth });
}

export function registerReportsCommands(program: Command): void {
  const reports = program
    .command("reports")
    .description("Download financial and stats reports");

  reports
    .command("list <report-type>")
    .description("List available report buckets")
    .requiredOption("--month <YYYY-MM>", "Report month (e.g., 2026-03)")
    .action(async (reportType: string, options) => {
      if (!isValidReportType(reportType)) {
        console.error(`Error: Invalid report type "${reportType}". Valid types: earnings, sales, estimated_sales, installs, crashes, ratings, reviews, store_performance, subscriptions, play_balance`);
        process.exit(2);
      }
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const { year, month } = parseMonth(options.month);
        const result = await listReports(client, packageName, reportType as ReportType, year, month);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  const download = reports
    .command("download")
    .description("Download a report");

  download
    .command("financial")
    .description("Download a financial report")
    .requiredOption("--month <YYYY-MM>", "Report month (e.g., 2026-03)")
    .option("--type <report-type>", "Report type", "earnings")
    .option("--output-file <path>", "Save to file instead of stdout")
    .action(async (options) => {
      if (!isFinancialReportType(options.type)) {
        console.error(`Error: Invalid financial report type "${options.type}". Valid types: earnings, sales, estimated_sales, play_balance`);
        process.exit(2);
      }
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);

      try {
        const { year, month } = parseMonth(options.month);
        const csv = await downloadReport(client, packageName, options.type as ReportType, year, month);
        if (options.outputFile) {
          await writeFile(options.outputFile, csv, "utf-8");
          console.log(`Report saved to ${options.outputFile}`);
        } else {
          console.log(csv);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  download
    .command("stats")
    .description("Download a stats report")
    .requiredOption("--month <YYYY-MM>", "Report month (e.g., 2026-03)")
    .requiredOption("--type <report-type>", "Report type (installs, crashes, ratings, reviews, store_performance, subscriptions)")
    .option("--output-file <path>", "Save to file instead of stdout")
    .action(async (options) => {
      if (!isStatsReportType(options.type)) {
        console.error(`Error: Invalid stats report type "${options.type}". Valid types: installs, crashes, ratings, reviews, store_performance, subscriptions`);
        process.exit(2);
      }
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);

      try {
        const { year, month } = parseMonth(options.month);
        const csv = await downloadReport(client, packageName, options.type as ReportType, year, month);
        if (options.outputFile) {
          await writeFile(options.outputFile, csv, "utf-8");
          console.log(`Report saved to ${options.outputFile}`);
        } else {
          console.log(csv);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
