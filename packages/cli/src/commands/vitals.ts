import type { Command } from "commander";
import { loadConfig } from "@gpc/config";
import { resolveAuth } from "@gpc/auth";
import { createReportingClient } from "@gpc/api";
import type { ReportingDimension } from "@gpc/api";
import {
  getVitalsOverview,
  getVitalsCrashes,
  getVitalsAnr,
  getVitalsStartup,
  getVitalsRendering,
  getVitalsBattery,
  getVitalsMemory,
  getVitalsAnomalies,
  searchVitalsErrors,
  checkThreshold,
  detectOutputFormat,
  formatOutput,
} from "@gpc/core";

function resolvePackageName(packageArg: string | undefined, config: any): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getReportingClient(config: any) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createReportingClient({ auth });
}

const VALID_DIMENSIONS: ReportingDimension[] = [
  "apiLevel", "versionCode", "deviceModel", "deviceType",
  "countryCode", "deviceRamBucket", "deviceSocName",
  "deviceCpuMakeModel", "deviceGlEsVersion", "deviceVulkanVersion",
  "deviceOpenGlVersion", "deviceBrand",
];

function validateDimension(dim: string): ReportingDimension {
  if (!VALID_DIMENSIONS.includes(dim as ReportingDimension)) {
    console.error(`Error: Invalid dimension "${dim}".`);
    console.error(`Valid dimensions: ${VALID_DIMENSIONS.join(", ")}`);
    process.exit(2);
  }
  return dim as ReportingDimension;
}

type MetricFn = typeof getVitalsCrashes;

function registerMetricCommand(
  parent: Command,
  name: string,
  description: string,
  fn: MetricFn,
  program: Command,
): void {
  parent
    .command(name)
    .description(description)
    .option("--dim <dimension>", "Group by dimension")
    .option("--days <n>", "Number of days to query", parseInt)
    .option("--threshold <value>", "Threshold value for CI alerting", parseFloat)
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const reporting = await getReportingClient(config);
      const format = detectOutputFormat();

      try {
        const result = await fn(reporting, packageName, {
          dimension: options.dim ? validateDimension(options.dim) : undefined,
          days: options.days,
        });
        console.log(formatOutput(result, format));

        if (options.threshold !== undefined) {
          const latestRow = result.rows?.[result.rows.length - 1];
          const metricKeys = latestRow?.metrics ? Object.keys(latestRow.metrics) : [];
          const firstMetric = metricKeys[0];
          const value = firstMetric
            ? Number(latestRow?.metrics[firstMetric]?.decimalValue?.value)
            : undefined;
          const check = checkThreshold(value, options.threshold);
          if (check.breached) {
            console.error(`Threshold breached: ${check.value} > ${check.threshold}`);
            process.exit(6);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}

export function registerVitalsCommands(program: Command): void {
  const vitals = program
    .command("vitals")
    .description("Monitor app vitals, crash rates, and performance metrics");

  vitals
    .command("overview")
    .description("Dashboard summary of all vital metrics")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const reporting = await getReportingClient(config);
      const format = detectOutputFormat();

      try {
        const result = await getVitalsOverview(reporting, packageName);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  registerMetricCommand(vitals, "crashes", "Query crash rate metrics", getVitalsCrashes, program);
  registerMetricCommand(vitals, "anr", "Query ANR rate metrics", getVitalsAnr, program);
  registerMetricCommand(vitals, "startup", "Query slow startup metrics", getVitalsStartup, program);
  registerMetricCommand(vitals, "rendering", "Query slow rendering metrics", getVitalsRendering, program);
  registerMetricCommand(vitals, "battery", "Query excessive wakeup metrics", getVitalsBattery, program);
  registerMetricCommand(vitals, "memory", "Query stuck wakelock metrics", getVitalsMemory, program);

  vitals
    .command("anomalies")
    .description("Detect anomalies in app vitals")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const reporting = await getReportingClient(config);
      const format = detectOutputFormat();

      try {
        const result = await getVitalsAnomalies(reporting, packageName);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  const errors = vitals
    .command("errors")
    .description("Search and view error issues");

  errors
    .command("search")
    .description("Search error issues")
    .option("--filter <text>", "Filter expression")
    .option("--max <n>", "Maximum results", parseInt)
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const reporting = await getReportingClient(config);
      const format = detectOutputFormat();

      try {
        const result = await searchVitalsErrors(reporting, packageName, {
          filter: options.filter,
          maxResults: options.max,
        });
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
