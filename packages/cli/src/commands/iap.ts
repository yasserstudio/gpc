import { resolvePackageName, getClient } from "../resolve.js";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

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



export function registerIapCommands(program: Command): void {
  const iap = program
    .command("iap")
    .description("Manage in-app products (uses one-time products API)");

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

      console.error(
        "Note: Using oneTimeProducts API (inappproducts endpoint is deprecated, shutdown Aug 2027)",
      );

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

      console.error(
        "Note: Using oneTimeProducts API (inappproducts endpoint is deprecated, shutdown Aug 2027)",
      );

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

  iap
    .command("batch-get")
    .description("Batch get multiple in-app products")
    .option("--skus <skus>", "Comma-separated list of SKUs")
    .option("--file <path>", "JSON file with array of SKUs")
    .action(async (_options) => {
      console.error(
        "Note: The inappproducts batchGet endpoint is permanently blocked by Google Play (returns 403 PERMISSION_DENIED).\n" +
          "Use `gpc iap get <sku>` for a single product, or `gpc iap list` for all products.",
      );
      process.exit(1);
    });

  iap
    .command("batch-update")
    .description("Batch update multiple in-app products from a JSON file")
    .requiredOption("--file <path>", "JSON file with array of product objects")
    .option("--dry-run", "Preview changes without executing")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (options.dryRun || isDryRun(program)) {
        const data = await readJsonFile(options.file);
        const products = Array.isArray(data) ? data : [];
        console.log(`[dry-run] Would batch update ${products.length} product(s)`);
        if (format !== "json") {
          const rows = products.map((p: Record<string, unknown>) => ({
            sku: p["sku"] || "-",
            action: "update",
          }));
          console.log(formatOutput(rows, format));
        } else {
          console.log(formatOutput(products, format));
        }
        return;
      }

      const client = await getClient(config);
      console.error("Note: Using inappproducts batch API");

      const spinner = createSpinner("Batch updating products...");
      if (!program.opts()["quiet"] && process.stderr.isTTY) spinner.start();

      try {
        const data = await readJsonFile(options.file);
        const products = Array.isArray(data) ? data : [];
        const request = {
          requests: products.map((p: Record<string, unknown>) => ({
            inappproduct: p,
            packageName,
            sku: p["sku"] as string,
          })),
        };
        const result = await client.inappproducts.batchUpdate(packageName, request as any);
        spinner.stop("Batch update complete");
        console.log(formatOutput(result, format));
      } catch (error) {
        spinner.fail("Batch update failed");
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
