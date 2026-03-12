import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createReportingClient } from "@gpc-cli/api";
import type { ReportingDimension } from "@gpc-cli/api";
import type { VitalsMetricSet } from "@gpc-cli/api";
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
  compareVitalsTrend,
  checkThreshold,
  formatOutput,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getReportingClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createReportingClient({ auth });
}

const VALID_DIMENSIONS: ReportingDimension[] = [
  "apiLevel",
  "versionCode",
  "deviceModel",
  "deviceType",
  "countryCode",
  "deviceRamBucket",
  "deviceSocName",
  "deviceCpuMakeModel",
  "deviceGlEsVersion",
  "deviceVulkanVersion",
  "deviceOpenGlVersion",
  "deviceBrand",
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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const format = getOutputFormat(program, config);

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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const format = getOutputFormat(program, config);

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
  registerMetricCommand(
    vitals,
    "rendering",
    "Query slow rendering metrics",
    getVitalsRendering,
    program,
  );
  registerMetricCommand(
    vitals,
    "battery",
    "Query excessive wakeup metrics",
    getVitalsBattery,
    program,
  );
  registerMetricCommand(vitals, "memory", "Query stuck wakelock metrics", getVitalsMemory, program);

  vitals
    .command("anomalies")
    .description("Detect anomalies in app vitals")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await getVitalsAnomalies(reporting, packageName);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  const errors = vitals.command("errors").description("Search and view error issues");

  errors
    .command("search")
    .description("Search error issues")
    .option("--filter <text>", "Filter expression")
    .option("--max <n>", "Maximum results", parseInt)
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const format = getOutputFormat(program, config);

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

  const METRIC_MAP: Record<string, VitalsMetricSet> = {
    crashes: "vitals.crashrate",
    anr: "vitals.anrrate",
    startup: "vitals.slowstartrate",
    rendering: "vitals.slowrenderingrate",
    battery: "vitals.excessivewakeuprate",
    memory: "vitals.stuckbackgroundwakelockrate",
  };

  vitals
    .command("compare <metric>")
    .description("Compare metric trend: this period vs previous period")
    .option("--days <n>", "Period length in days", parseInt, 7)
    .action(async (metric: string, options) => {
      const metricSet = METRIC_MAP[metric];
      if (!metricSet) {
        console.error(
          `Error: Unknown metric "${metric}". Use: ${Object.keys(METRIC_MAP).join(", ")}`,
        );
        process.exit(2);
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await compareVitalsTrend(reporting, packageName, metricSet, options.days);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
