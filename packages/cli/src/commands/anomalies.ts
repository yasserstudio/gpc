import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createReportingClient } from "@gpc-cli/api";
import { getVitalsAnomalies, formatOutput } from "@gpc-cli/core";
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

      try {
        const result = await getVitalsAnomalies(reporting, packageName);
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
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
