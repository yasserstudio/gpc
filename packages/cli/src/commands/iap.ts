import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import {
  listOneTimeProducts,
  getOneTimeProduct,
  createInAppProduct,
  updateInAppProduct,
  deleteInAppProduct,
  syncInAppProducts,
  formatOutput,
  sortResults,
  createSpinner,
} from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { getOutputFormat } from "../format.js";
import { requireConfirm } from "../prompt.js";
import { readJsonFile } from "../json.js";

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

export function registerIapCommands(program: Command): void {
  const iap = program.command("iap").description("Manage in-app products (uses one-time products API)");

  iap
    .command("list")
    .description("List in-app products")
    .option("--max <n>", "Maximum results per page", parseInt)
    .option("--limit <n>", "Maximum total results", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      console.error("Note: Using oneTimeProducts API (inappproducts endpoint is deprecated, shutdown Aug 2027)");

      try {
        const result = await listOneTimeProducts(client, packageName);
        let products = result.oneTimeProducts || [];
        if (options.sort) {
          products = sortResults(products, options.sort);
        }
        console.log(formatOutput(products, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  iap
    .command("get <sku>")
    .description("Get an in-app product")
    .action(async (sku: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      console.error("Note: Using oneTimeProducts API (inappproducts endpoint is deprecated, shutdown Aug 2027)");

      try {
        const result = await getOneTimeProduct(client, packageName, sku);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  iap
    .command("create")
    .description("Create an in-app product from JSON file")
    .requiredOption("--file <path>", "JSON file with product data")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "iap create",
            action: "create",
            target: `in-app product from ${options.file}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const data = await readJsonFile(options.file);
        const result = await createInAppProduct(client, packageName, data as any);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  iap
    .command("update <sku>")
    .description("Update an in-app product from JSON file")
    .requiredOption("--file <path>", "JSON file with product data")
    .action(async (sku: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "iap update",
            action: "update",
            target: sku,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const data = await readJsonFile(options.file);
        const result = await updateInAppProduct(client, packageName, sku, data as any);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  iap
    .command("delete <sku>")
    .description("Delete an in-app product")
    .action(async (sku: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Delete in-app product "${sku}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "iap delete",
            action: "delete",
            target: sku,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        await deleteInAppProduct(client, packageName, sku);
        console.log(`In-app product ${sku} deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  iap
    .command("sync")
    .description("Sync in-app products from a directory of JSON files")
    .requiredOption("--dir <path>", "Directory containing product JSON files")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);
      const dryRun = isDryRun(program);

      const spinner = createSpinner("Syncing in-app products...");
      if (!program.opts()["quiet"] && process.stderr.isTTY) spinner.start();

      try {
        const result = await syncInAppProducts(client, packageName, options.dir, {
          dryRun,
        });
        spinner.stop("Sync complete");
        if (dryRun) {
          console.log(`[dry-run] Would create: ${result.created}, update: ${result.updated}`);
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        spinner.fail("Sync failed");
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
