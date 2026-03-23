import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";

import { importDataSafety, formatOutput } from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { getOutputFormat } from "../format.js";



export function registerDataSafetyCommands(program: Command): void {
  const dataSafety = program.command("data-safety").description("Manage data safety declarations");

  // Get — not supported by Google Play API (no GET endpoint for data safety)
  dataSafety
    .command("get")
    .description("Get the current data safety declaration")
    .action(async () => {
      console.error(
        "Error: The Google Play Developer API does not provide a GET endpoint for data safety declarations.",
      );
      console.error("");
      console.error("Data safety labels can only be updated (not read) via the API.");
      console.error("To view your current data safety declaration, use the Google Play Console:");
      console.error("  https://play.google.com/console → App content → Data safety");
      console.error("");
      console.error(
        "To update data safety via the API, use: gpc data-safety update --file <csv-file>",
      );
      process.exit(2);
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

  // Export — not supported (no GET endpoint)
  dataSafety
    .command("export")
    .description("Export data safety declaration to a JSON file")
    .option("--output <path>", "Output file path", "data-safety.json")
    .action(async () => {
      console.error(
        "Error: The Google Play Developer API does not provide a GET endpoint for data safety declarations.",
      );
      console.error("Data safety labels cannot be exported via the API.");
      console.error("");
      console.error("To export your data safety declaration, use the Google Play Console:");
      console.error("  App content → Data safety → Export to CSV");
      process.exit(2);
    });
}
