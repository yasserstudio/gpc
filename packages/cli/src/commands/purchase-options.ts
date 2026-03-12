import { readFile } from "node:fs/promises";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import {
  listPurchaseOptions,
  getPurchaseOption,
  createPurchaseOption,
  activatePurchaseOption,
  deactivatePurchaseOption,
  formatOutput,
  sortResults,
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

export function registerPurchaseOptionsCommands(program: Command): void {
  const po = program
    .command("purchase-options")
    .description("Manage purchase options");

  po.command("list")
    .description("List purchase options")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listPurchaseOptions(client, packageName);
        if (options.sort) {
          result.purchaseOptions = sortResults(result.purchaseOptions, options.sort);
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  po.command("get <id>")
    .description("Get a purchase option")
    .action(async (id: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await getPurchaseOption(client, packageName, id);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  po.command("create")
    .description("Create a purchase option from JSON file")
    .requiredOption("--file <path>", "JSON file with purchase option data")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "purchase-options create",
            action: "create",
            target: `purchase option from ${options.file}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await createPurchaseOption(client, packageName, data);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  po.command("activate <id>")
    .description("Activate a purchase option")
    .action(async (id: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "purchase-options activate",
            action: "activate",
            target: id,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await activatePurchaseOption(client, packageName, id);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  po.command("deactivate <id>")
    .description("Deactivate a purchase option")
    .action(async (id: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "purchase-options deactivate",
            action: "deactivate",
            target: id,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await deactivatePurchaseOption(client, packageName, id);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
