import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import {
  listBundles,
  findBundle,
  waitForBundle,
  formatOutput,
  GpcError,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { resolvePackageName, getClient } from "../resolve.js";

export function registerBundlesCommands(program: Command): void {
  const bundles = program.command("bundles").description("Manage uploaded app bundles (API)");

  bundles
    .command("list")
    .description("List all processed bundles")
    .action(async () => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);

      const result = await listBundles(client, packageName);

      if (format === "json") {
        console.log(formatOutput(result, "json"));
      } else {
        if (result.length === 0) {
          console.log("No bundles found.");
          return;
        }
        console.log(formatOutput(
          result.map((b) => ({
            versionCode: b.versionCode,
            sha256: b.sha256.slice(0, 12) + "...",
          })),
          format,
        ));
      }
    });

  bundles
    .command("find")
    .description("Find a specific bundle by version code")
    .requiredOption("--version-code <n>", "Version code to find", (v) => parseInt(v, 10))
    .action(async (options: { versionCode: number }) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);

      const result = await findBundle(client, packageName, options.versionCode);

      if (!result) {
        if (format === "json") {
          console.log(formatOutput(null, "json"));
        } else {
          console.error(`Bundle with version code ${options.versionCode} not found.`);
        }
        process.exit(1);
      }

      console.log(formatOutput(result, format));
    });

  bundles
    .command("wait")
    .description("Wait for a bundle to finish server-side processing")
    .requiredOption("--version-code <n>", "Version code to wait for", (v) => parseInt(v, 10))
    .option("--timeout <seconds>", "Timeout in seconds (default: 600)", (v) => parseInt(v, 10))
    .option("--interval <seconds>", "Poll interval in seconds (default: 15)", (v) => parseInt(v, 10))
    .action(async (options: { versionCode: number; timeout?: number; interval?: number }) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);

      if (format !== "json") {
        process.stderr.write(
          `Waiting for bundle ${options.versionCode} to finish processing...\n`,
        );
      }

      const result = await waitForBundle(client, packageName, options.versionCode, {
        timeout: options.timeout ? options.timeout * 1000 : undefined,
        interval: options.interval ? options.interval * 1000 : undefined,
      });

      if (format !== "json") {
        process.stderr.write(`Bundle ${result.versionCode} is ready.\n`);
      }
      console.log(formatOutput(result, format));
    });
}
