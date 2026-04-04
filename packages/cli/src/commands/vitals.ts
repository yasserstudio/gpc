import { resolvePackageName } from "../resolve.js";
import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createReportingClient, PlayApiError } from "@gpc-cli/api";
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
  getVitalsLmk,
  getVitalsAnomalies,
  searchVitalsErrors,
  compareVitalsTrend,
  compareVersionVitals,
  watchVitalsWithAutoHalt,
  checkThreshold,
  formatOutput,
  GpcError,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { red, yellow, green } from "../colors.js";

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
  "startType", // Required dimension for slowStartRateMetricSet
];

const THRESHOLD_CONFIG_KEYS: Record<string, string> = {
  crashes: "crashRate",
  anr: "anrRate",
  startup: "slowStartRate",
  rendering: "slowRenderingRate",
  battery: "excessiveWakeupRate",
  memory: "stuckWakelockRate",
  wakeup: "excessiveWakeupRate",
  lmk: "stuckWakelockRate",
};

function validateDimension(dim: string): ReportingDimension {
  if (!(VALID_DIMENSIONS as readonly string[]).includes(dim)) {
    throw new GpcError(
      `Invalid dimension "${dim}". Valid dimensions: ${VALID_DIMENSIONS.join(", ")}`,
      "VITALS_USAGE_ERROR",
      2,
      `Use one of: ${VALID_DIMENSIONS.join(", ")}`,
    );
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

      let result;
      try {
        result = await fn(reporting, packageName, {
          dimension: options.dim ? validateDimension(options.dim) : undefined,
          days: options.days,
        });
      } catch (err) {
        if (err instanceof PlayApiError && err.statusCode === 403) {
          if (format === "json") {
            console.log(
              formatOutput(
                { rows: [], message: "Reporting API not enabled or insufficient permissions" },
                format,
              ),
            );
          } else {
            console.log(
              `${yellow("⚠")} No vitals data available. The Reporting API may not be enabled for this project.`,
            );
            console.log(
              `  Enable it at: https://console.cloud.google.com/apis/library/playdeveloperreporting.googleapis.com`,
            );
          }
          return;
        }
        throw err;
      }
      if (format !== "json" && (!result.rows || result.rows.length === 0)) {
        console.log(`${yellow("⚠")} No vitals data available.`);
        return;
      }
      if (format !== "json" && result.rows) {
        const rows = result.rows.map((row: unknown) => {
          const rowR = row as Record<string, unknown>;
          const startTime = rowR["startTime"] as Record<string, unknown> | undefined;
          const metrics = rowR["metrics"] as
            | Record<string, Record<string, unknown>>
            | unknown[]
            | undefined;
          const flat: Record<string, unknown> = {
            date: startTime
              ? `${startTime["year"]}-${String(startTime["month"]).padStart(2, "0")}-${String(startTime["day"]).padStart(2, "0")}`
              : "-",
          };
          if (metrics && !Array.isArray(metrics)) {
            for (const [key, val] of Object.entries(metrics)) {
              flat[key] =
                (val as Record<string, unknown>)?.["decimalValue"] !== undefined
                  ? ((val as Record<string, Record<string, unknown>>)?.["decimalValue"]?.[
                      "value"
                    ] ?? "-")
                  : "-";
            }
          } else if (Array.isArray(metrics)) {
            // Fallback: if API returns metrics as array, use metric names from config
            for (let i = 0; i < metrics.length; i++) {
              const val = metrics[i] as Record<string, unknown> | undefined;
              const metricName = val?.["metric"] as string | undefined;
              const key = metricName ?? `metric${i}`;
              flat[key] =
                (val as Record<string, unknown>)?.["decimalValue"] !== undefined
                  ? ((val as Record<string, Record<string, unknown>>)?.["decimalValue"]?.[
                      "value"
                    ] ?? "-")
                  : "-";
            }
          }
          const dims = rowR["dimensions"] as Record<string, unknown> | unknown[] | undefined;
          if (dims && !Array.isArray(dims)) {
            for (const [key, val] of Object.entries(dims)) {
              flat[key] = (val as Record<string, unknown>)?.["stringValue"] ?? "-";
            }
          } else if (Array.isArray(dims)) {
            // Fallback: if API returns dimensions as array
            for (let i = 0; i < dims.length; i++) {
              const val = dims[i] as Record<string, unknown> | undefined;
              const dimName = val?.["dimension"] as string | undefined;
              flat[dimName ?? `dim${i}`] = val?.["stringValue"] ?? val?.["int64Value"] ?? "-";
            }
          }
          return flat;
        });
        console.log(formatOutput(rows, format));
      } else {
        console.log(formatOutput(result, format));
      }

      // Check threshold from flag or config
      const configKey = THRESHOLD_CONFIG_KEYS[name];
      const configThreshold = configKey
        ? (config as unknown as Record<string, unknown>)["vitals"]
          ? ((config as unknown as Record<string, unknown>)["vitals"] as Record<string, unknown>)[
              "thresholds"
            ]
            ? (
                (
                  (config as unknown as Record<string, unknown>)["vitals"] as Record<
                    string,
                    unknown
                  >
                )["thresholds"] as Record<string, unknown>
              )[configKey]
            : undefined
          : undefined
        : undefined;
      const threshold =
        options.threshold ?? (configThreshold !== undefined ? Number(configThreshold) : undefined);
      if (threshold !== undefined) {
        const latestRow = result.rows?.[result.rows.length - 1];
        const metricKeys = latestRow?.metrics ? Object.keys(latestRow.metrics) : [];
        const firstMetric = metricKeys[0];
        const value = firstMetric
          ? Number(latestRow?.metrics[firstMetric]?.decimalValue?.value)
          : undefined;
        const check = checkThreshold(value, threshold);
        if (check.breached) {
          console.error(`${red("✗")} Threshold breached: ${check.value} > ${check.threshold}`);
          process.exitCode = 6;
        }
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

      const result = await getVitalsOverview(reporting, packageName);
      if (Object.keys(result).length === 0) {
        if (format === "json") {
          console.log(formatOutput({ vitals: [], message: "No vitals data available" }, format));
        } else {
          console.log("No vitals data available.");
        }
        return;
      }
      if (format !== "json") {
        const overview = result as Record<string, unknown>;
        const rows = Object.entries(overview).map(([metric, data]) => {
          const metricRows = data as Record<string, unknown>[] | undefined;
          const latest = metricRows?.[metricRows.length - 1];
          const metrics = latest?.["metrics"] as
            | Record<string, Record<string, unknown>>
            | undefined;
          const firstKey = metrics ? Object.keys(metrics)[0] : undefined;
          const value = firstKey
            ? (metrics?.[firstKey]?.["decimalValue"] as Record<string, unknown> | undefined)?.[
                "value"
              ]
            : undefined;
          return {
            metric,
            dataPoints: metricRows?.length || 0,
            latestValue: value ?? "-",
          };
        });
        console.log(formatOutput(rows, format));
      } else {
        console.log(formatOutput(result, format));
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
  registerMetricCommand(
    vitals,
    "wakeup",
    "Query excessive wakeup rate metrics",
    getVitalsBattery,
    program,
  );
  registerMetricCommand(
    vitals,
    "lmk",
    "Query low-memory kill (stuck wakelock) metrics",
    getVitalsLmk,
    program,
  );

  vitals
    .command("anomalies")
    .description("Detect anomalies in app vitals")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const format = getOutputFormat(program, config);

      let result;
      try {
        result = await getVitalsAnomalies(reporting, packageName);
      } catch (err) {
        if (err instanceof PlayApiError && err.statusCode === 403) {
          if (format === "json") {
            console.log(
              formatOutput(
                { anomalies: [], message: "Reporting API not enabled or insufficient permissions" },
                format,
              ),
            );
          } else {
            console.log(
              `${yellow("⚠")} No anomaly data available. The Reporting API may not be enabled for this project.`,
            );
            console.log(
              `  Enable it at: https://console.cloud.google.com/apis/library/playdeveloperreporting.googleapis.com`,
            );
          }
          return;
        }
        throw err;
      }
      console.log(formatOutput(result, format));
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

      const result = await searchVitalsErrors(reporting, packageName, {
        filter: options.filter,
        maxResults: options.max,
      });
      const issues = (result as unknown as Record<string, unknown>)["errorIssues"] as
        | unknown[]
        | undefined;
      if (format !== "json" && (!issues || issues.length === 0)) {
        console.log("No error issues found.");
        return;
      }
      console.log(formatOutput(result, format));
    });

  const METRIC_MAP: Record<string, VitalsMetricSet> = {
    crashes: "crashRateMetricSet",
    anr: "anrRateMetricSet",
    startup: "slowStartRateMetricSet",
    rendering: "slowRenderingRateMetricSet",
    battery: "excessiveWakeupRateMetricSet",
    memory: "stuckBackgroundWakelockRateMetricSet",
  };

  vitals
    .command("compare <metric>")
    .description("Compare metric trend: this period vs previous period")
    .option("--days <n>", "Period length in days", (v) => parseInt(v, 10), 7)
    .action(async (metric: string, options) => {
      const metricSet = METRIC_MAP[metric];
      if (!metricSet) {
        throw new GpcError(
          `Unknown metric "${metric}". Use: ${Object.keys(METRIC_MAP).join(", ")}`,
          "VITALS_USAGE_ERROR",
          2,
          `Valid metrics: ${Object.keys(METRIC_MAP).join(", ")}`,
        );
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const format = getOutputFormat(program, config);

      const result = await compareVitalsTrend(reporting, packageName, metricSet, options.days);
      console.log(formatOutput(result, format));
    });

  vitals
    .command("compare-versions <v1> <v2>")
    .description("Compare vitals side-by-side for two version codes")
    .option("--days <n>", "Number of days to query", (v) => parseInt(v, 10), 30)
    .action(async (v1: string, v2: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const format = getOutputFormat(program, config);

      const result = await compareVersionVitals(reporting, packageName, v1, v2, {
        days: options.days,
      });

      if (format === "json") {
        console.log(formatOutput(result, format));
        return;
      }

      const metrics: [keyof typeof result.v1, string][] = [
        ["crashRate", "Crash Rate"],
        ["anrRate", "ANR Rate"],
        ["slowStartRate", "Slow Start Rate"],
        ["slowRenderingRate", "Slow Rendering Rate"],
      ];

      console.log(`\nVersion Comparison — ${packageName}`);
      console.log(`${"─".repeat(60)}`);
      console.log(`${"Metric".padEnd(22)} ${"v" + v1.padEnd(14)} ${"v" + v2.padEnd(14)} Change`);
      console.log(`${"─".repeat(60)}`);

      for (const [key, label] of metrics) {
        const val1 = result.v1[key] as number | undefined;
        const val2 = result.v2[key] as number | undefined;
        const s1 = val1 !== undefined ? (val1 * 100).toFixed(3) + "%" : "N/A";
        const s2 = val2 !== undefined ? (val2 * 100).toFixed(3) + "%" : "N/A";
        const isRegression = result.regressions.includes(key as string);
        const change =
          val1 !== undefined && val2 !== undefined ? ((val2 - val1) / val1) * 100 : undefined;
        const changeStr =
          change !== undefined ? (change > 0 ? "+" : "") + change.toFixed(1) + "%" : "N/A";
        const colorFn = isRegression
          ? red
          : change !== undefined && change < -1
            ? green
            : (s: string) => s;
        console.log(
          `${label.padEnd(22)} ${s1.padEnd(15)} ${colorFn(s2.padEnd(15))} ${colorFn(changeStr)}`,
        );
      }

      if (result.regressions.length > 0) {
        console.log(`\n${red("✗")} Regressions detected: ${result.regressions.join(", ")}`);
      } else {
        console.log(`\n${green("✓")} No regressions detected.`);
      }
    });

  vitals
    .command("watch")
    .description("Monitor vitals continuously and optionally auto-halt rollout on breach")
    .requiredOption("--threshold <value>", "Breach threshold value", parseFloat)
    .option(
      "--metric <name>",
      "Metric to monitor (crashes, anr, startup, rendering, battery, memory)",
      "crashes",
    )
    .option("--interval <seconds>", "Polling interval in seconds", (v) => parseInt(v, 10), 300)
    .option("--auto-halt-rollout", "Automatically halt rollout if threshold is breached")
    .option("--track <name>", "Track to halt rollout on (required with --auto-halt-rollout)")
    .action(async (options) => {
      const metricSet = METRIC_MAP[options.metric as string];
      if (!metricSet) {
        throw new GpcError(
          `Unknown metric "${options.metric}". Use: ${Object.keys(METRIC_MAP).join(", ")}`,
          "VITALS_USAGE_ERROR",
          2,
          `Valid metrics: ${Object.keys(METRIC_MAP).join(", ")}`,
        );
      }

      if (options.autoHaltRollout && !options.track) {
        throw new GpcError(
          "--track <name> is required when using --auto-halt-rollout",
          "VITALS_USAGE_ERROR",
          2,
          "Add --track <name> to specify which track to halt on breach.",
        );
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const reporting = await getReportingClient(config);
      const intervalMs = (options.interval as number) * 1000;

      console.log(`Watching ${options.metric} for ${packageName}`);
      console.log(`Threshold: ${options.threshold}  Interval: ${options.interval}s`);
      if (options.autoHaltRollout) {
        console.log(`Auto-halt enabled on track: ${options.track}`);
      }
      console.log("Press Ctrl+C to stop.\n");

      const stop = watchVitalsWithAutoHalt(reporting, packageName, {
        intervalMs,
        threshold: options.threshold as number,
        metricSet,
        onPoll: (value, breached) => {
          const ts = new Date().toISOString();
          const valStr = value !== undefined ? (value * 100).toFixed(3) + "%" : "N/A";
          const indicator = breached ? red("✗ BREACH") : green("✓ OK");
          console.log(`[${ts}] ${options.metric}: ${valStr} — ${indicator}`);
        },
        onHalt: options.autoHaltRollout
          ? async (value: number) => {
              console.error(
                `\n${red("✗")} Threshold breached (${(value * 100).toFixed(3)}% > ${options.threshold}%). Halting rollout on track "${options.track}"...`,
              );
              try {
                const { resolveAuth } = await import("@gpc-cli/auth");
                const { createApiClient } = await import("@gpc-cli/api");
                const { updateRollout } = await import("@gpc-cli/core");
                const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
                const apiClient = createApiClient({ auth });
                await updateRollout(apiClient, packageName, options.track as string, "halt");
                console.error(`${red("⚠")} Rollout halted on track "${options.track}".`);
              } catch (err) {
                console.error(
                  `Failed to halt rollout: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
              stop();
              process.exitCode = 6;
            }
          : undefined,
      });

      process.on("SIGINT", () => {
        stop();
        console.log("\nWatch stopped.");
      });
    });
}
