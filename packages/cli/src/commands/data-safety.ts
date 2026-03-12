import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import {
  getDataSafety,
  updateDataSafety,
  exportDataSafety,
  importDataSafety,
  formatOutput,
} from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { getOutputFormat } from "../format.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth });
}

export function registerDataSafetyCommands(program: Command): void {
  const dataSafety = program
    .command("data-safety")
    .description("Manage data safety declarations");

  // Get
  dataSafety
    .command("get")
    .description("Get the current data safety declaration")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await getDataSafety(client, packageName);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Update
  dataSafety
    .command("update")
    .description("Update data safety declaration from a JSON file")
    .requiredOption("--file <path>", "Path to data safety JSON file")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "data-safety update",
            action: "update data safety from",
            target: options.file,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await importDataSafety(client, packageName, options.file);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // Export
  dataSafety
    .command("export")
    .description("Export data safety declaration to a JSON file")
    .option("--output <path>", "Output file path", "data-safety.json")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await exportDataSafety(client, packageName, options.output);
        if (format === "json") {
          console.log(formatOutput({ file: options.output, dataSafety: result }, format));
        } else {
          console.log(`Data safety declaration exported to ${options.output}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
