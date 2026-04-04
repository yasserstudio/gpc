import { resolvePackageName } from "../resolve.js";
import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createReportingClient, PlayApiError } from "@gpc-cli/api";
import { getVitalsAnomalies, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { yellow } from "../colors.js";

async function getReportingClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createReportingClient({ auth });
}

export function registerAnomaliesCommands(program: Command): void {
  const anomalies = program.command("anomalies").description("Detect and list vitals anomalies");

  anomalies
    .command("list")
    .description("List detected vitals anomalies")
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
      const items = (result as unknown as Record<string, unknown>)["anomalies"] as
        | unknown[]
        | undefined;

      if (format !== "json") {
        if (!items || items.length === 0) {
          console.log("No anomalies detected.");
          return;
        }
        const rows = items.map((item) => {
          const a = item as Record<string, unknown>;
          return {
            name: String(a["name"] ?? "-"),
            metricSet: String(a["metricSet"] ?? "-"),
            aggregationPeriod: String(a["aggregationPeriod"] ?? "-"),
          };
        });
        console.log(formatOutput(rows, format));
      } else {
        console.log(formatOutput(result, format));
      }
    });
}
