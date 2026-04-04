import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

import type { OneTimeProduct } from "@gpc-cli/api";
import {
  listOneTimeProducts,
  getOneTimeProduct,
  createOneTimeProduct,
  updateOneTimeProduct,
  deleteOneTimeProduct,
  listOneTimeOffers,
  getOneTimeOffer,
  createOneTimeOffer,
  updateOneTimeOffer,
  deleteOneTimeOffer,
  diffOneTimeProduct,
  formatOutput,
  sortResults,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";
import { readJsonFile } from "../json.js";

async function readJsonArray<T = any>(filePath: string): Promise<T[]> {
  const data = await readJsonFile(filePath);
  if (!Array.isArray(data)) {
    const err = new Error(`Expected a JSON array in ${filePath}, got ${typeof data}`);
    Object.assign(err, { code: "USAGE_ERROR", exitCode: 2 });
    throw err;
  }
  return data as T[];
}

export function registerOneTimeProductsCommands(program: Command): void {
  const otp = program
    .command("one-time-products")
    .alias("otp")
    .description("Manage one-time products and offers (modern OTP API)");

  otp
    .command("list")
    .description("List one-time products")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await listOneTimeProducts(client, packageName);
      if (options.sort) {
        result.oneTimeProducts = sortResults(result.oneTimeProducts, options.sort);
      }
      const products = result.oneTimeProducts || [];
      if (format !== "json") {
        if (products.length === 0) {
          console.log("No one-time products found.");
          return;
        }
        const summary = products.map((p: OneTimeProduct) => ({
          productId: p.productId,
          purchaseType: (p as unknown as Record<string, unknown>)["purchaseType"] || "-",
          listings: p.listings ? Object.keys(p.listings).length : 0,
          firstTitle: p.listings ? Object.values(p.listings)[0]?.title || "-" : "-",
        }));
        console.log(formatOutput(summary, format));
      } else {
        console.log(formatOutput(result, format));
      }
    });

  otp
    .command("get <product-id>")
    .description("Get a one-time product")
    .action(async (productId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getOneTimeProduct(client, packageName, productId);
      console.log(formatOutput(result, format));
    });

  otp
    .command("create")
    .description("Create a one-time product from JSON file")
    .requiredOption("--file <path>", "JSON file with product data")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "one-time-products create",
            action: "create",
            target: `one-time product from ${options.file}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const data = await readJsonFile(options.file);
      const result = await createOneTimeProduct(client, packageName, data as any);
      console.log(formatOutput(result, format));
    });

  otp
    .command("update <product-id>")
    .description("Update a one-time product from JSON file")
    .requiredOption("--file <path>", "JSON file with product data")
    .option("--update-mask <fields>", "Comma-separated field mask")
    .action(async (productId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "one-time-products update",
            action: "update",
            target: productId,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const data = await readJsonFile(options.file);
      const result = await updateOneTimeProduct(
        client,
        packageName,
        productId,
        data as any,
        options.updateMask,
      );
      console.log(formatOutput(result, format));
    });

  otp
    .command("delete <product-id>")
    .description("Delete a one-time product")
    .action(async (productId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Delete one-time product "${productId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "one-time-products delete",
            action: "delete",
            target: productId,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      await deleteOneTimeProduct(client, packageName, productId);
      console.log(`One-time product ${productId} deleted.`);
    });

  // --- Offers ---
  const offers = otp.command("offers").description("Manage one-time product offers");

  offers
    .command("list <product-id>")
    .description("List offers for a one-time product")
    .option("--purchase-option <id>", 'Purchase option ID (default: "-" for all)', "-")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (productId: string, options: { purchaseOption: string; sort?: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await listOneTimeOffers(
        client,
        packageName,
        productId,
        options.purchaseOption,
      );
      const items = result.oneTimeProductOffers ?? result.oneTimeOffers ?? [];
      if (options.sort) {
        console.log(formatOutput(sortResults(items, options.sort), format));
      } else {
        console.log(
          formatOutput(items.length > 0 ? result : { oneTimeProductOffers: items }, format),
        );
      }
    });

  offers
    .command("get <product-id> <offer-id>")
    .description("Get an offer for a one-time product")
    .option("--purchase-option <id>", 'Purchase option ID (default: "-" for all)', "-")
    .action(async (productId: string, offerId: string, options: { purchaseOption: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getOneTimeOffer(
        client,
        packageName,
        productId,
        offerId,
        options.purchaseOption,
      );
      console.log(formatOutput(result, format));
    });

  offers
    .command("create <product-id>")
    .description("Create an offer from JSON file")
    .requiredOption("--file <path>", "JSON file with offer data")
    .option("--purchase-option <id>", 'Purchase option ID (default: "-" for all)', "-")
    .action(async (productId: string, options: { file: string; purchaseOption: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "one-time-products offers create",
            action: "create offer for",
            target: productId,
            details: { file: options.file, purchaseOption: options.purchaseOption },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const data = await readJsonFile(options.file);
      const result = await createOneTimeOffer(
        client,
        packageName,
        productId,
        data as any,
        options.purchaseOption,
      );
      console.log(formatOutput(result, format));
    });

  offers
    .command("update <product-id> <offer-id>")
    .description("Update an offer from JSON file")
    .requiredOption("--file <path>", "JSON file with offer data")
    .option("--update-mask <fields>", "Comma-separated field mask")
    .option("--purchase-option <id>", 'Purchase option ID (default: "-" for all)', "-")
    .action(
      async (
        productId: string,
        offerId: string,
        options: { file: string; updateMask?: string; purchaseOption: string },
      ) => {
        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const format = getOutputFormat(program, config);

        if (isDryRun(program)) {
          printDryRun(
            {
              command: "one-time-products offers update",
              action: "update offer",
              target: `${productId}/${offerId}`,
              details: { file: options.file, purchaseOption: options.purchaseOption },
            },
            format,
            formatOutput,
          );
          return;
        }

        const client = await getClient(config);

        const data = await readJsonFile(options.file);
        const result = await updateOneTimeOffer(
          client,
          packageName,
          productId,
          offerId,
          data as any,
          options.updateMask,
          options.purchaseOption,
        );
        console.log(formatOutput(result, format));
      },
    );

  offers
    .command("delete <product-id> <offer-id>")
    .description("Delete an offer")
    .option("--purchase-option <id>", 'Purchase option ID (default: "-" for all)', "-")
    .action(async (productId: string, offerId: string, options: { purchaseOption: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Delete offer "${offerId}" for product "${productId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "one-time-products offers delete",
            action: "delete offer",
            target: `${productId}/${offerId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      await deleteOneTimeOffer(client, packageName, productId, offerId, options.purchaseOption);
      console.log(`Offer ${offerId} deleted.`);
    });

  offers
    .command("cancel <product-id> <offer-id>")
    .description("Cancel an offer (permanent, cannot be re-activated)")
    .option("--purchase-option <id>", 'Purchase option ID (default: "-" for all)', "-")
    .action(async (productId: string, offerId: string, options: { purchaseOption: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(
        `Cancel offer "${offerId}"? This is permanent and cannot be undone.`,
        program,
      );

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "otp offers cancel",
            action: "cancel offer",
            target: `${productId}/${offerId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const format = getOutputFormat(program, config);
      const result = await client.oneTimeProducts.cancelOffer(
        packageName,
        productId,
        options.purchaseOption,
        offerId,
      );
      console.log(formatOutput(result, format));
    });

  offers
    .command("batch-get <product-id>")
    .description("Batch get multiple offers")
    .requiredOption(
      "--file <path>",
      "JSON file with array of {productId, purchaseOptionId, offerId}",
    )
    .option("--purchase-option <id>", 'Purchase option ID in URL path (default: "-")', "-")
    .action(async (productId: string, options: { file: string; purchaseOption: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const requests = await readJsonArray(options.file);
      const result = await client.oneTimeProducts.batchGetOffers(
        packageName,
        productId,
        options.purchaseOption,
        requests.map((r: any) => ({
          packageName,
          productId: r.productId || productId,
          purchaseOptionId: r.purchaseOptionId || "-",
          offerId: r.offerId,
        })),
      );
      console.log(formatOutput(result, format));
    });

  offers
    .command("batch-update <product-id>")
    .description("Batch create or update multiple offers (max 100)")
    .requiredOption("--file <path>", "JSON file with update requests")
    .option("--purchase-option <id>", 'Purchase option ID in URL path (default: "-")', "-")
    .action(async (productId: string, options: { file: string; purchaseOption: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "otp offers batch-update",
            action: "batch update offers for",
            target: productId,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const requests = await readJsonArray(options.file);
      const result = await client.oneTimeProducts.batchUpdateOffers(
        packageName,
        productId,
        options.purchaseOption,
        requests,
      );
      console.log(formatOutput(result, format));
    });

  offers
    .command("batch-update-states <product-id>")
    .description("Batch activate, deactivate, or cancel multiple offers (max 100)")
    .requiredOption("--file <path>", "JSON file with state transition requests")
    .option("--purchase-option <id>", 'Purchase option ID in URL path (default: "-")', "-")
    .action(async (productId: string, options: { file: string; purchaseOption: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "otp offers batch-update-states",
            action: "batch update offer states for",
            target: productId,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const requests = await readJsonArray(options.file);
      const result = await client.oneTimeProducts.batchUpdateOfferStates(
        packageName,
        productId,
        options.purchaseOption,
        requests,
      );
      console.log(formatOutput(result, format));
    });

  offers
    .command("batch-delete <product-id>")
    .description("Batch delete multiple offers (max 100)")
    .requiredOption(
      "--file <path>",
      "JSON file with array of {productId, purchaseOptionId, offerId}",
    )
    .option("--purchase-option <id>", 'Purchase option ID in URL path (default: "-")', "-")
    .action(async (productId: string, options: { file: string; purchaseOption: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Batch delete offers for product "${productId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "otp offers batch-delete",
            action: "batch delete offers for",
            target: productId,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const requests = await readJsonArray(options.file);
      await client.oneTimeProducts.batchDeleteOffers(
        packageName,
        productId,
        options.purchaseOption,
        requests,
      );
      console.log(`Batch delete completed.`);
    });

  // --- Purchase Options batch ---
  const po = otp.command("purchase-options").description("Manage purchase option batch operations");

  po.command("batch-delete <product-id>")
    .description("Batch delete purchase options (max 100)")
    .requiredOption("--file <path>", "JSON file with delete requests")
    .action(async (productId: string, options: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Batch delete purchase options for product "${productId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "otp purchase-options batch-delete",
            action: "batch delete purchase options for",
            target: productId,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const requests = await readJsonArray(options.file);
      await client.oneTimeProducts.batchDeletePurchaseOptions(packageName, productId, requests);
      console.log(`Batch delete completed.`);
    });

  po.command("batch-update-states <product-id>")
    .description("Batch activate or deactivate purchase options (max 100)")
    .requiredOption("--file <path>", "JSON file with state transition requests")
    .action(async (productId: string, options: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "otp purchase-options batch-update-states",
            action: "batch update purchase option states for",
            target: productId,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const requests = await readJsonArray(options.file);
      const result = await client.oneTimeProducts.batchUpdatePurchaseOptionStates(
        packageName,
        productId,
        requests,
      );
      console.log(formatOutput(result, format));
    });

  // --- Diff ---
  otp
    .command("diff <product-id>")
    .description("Compare local JSON file against remote one-time product")
    .requiredOption("--file <path>", "Local JSON file to compare against remote")
    .action(async (productId: string, options: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const localData = (await readJsonFile(options.file)) as OneTimeProduct;
      const diffs = await diffOneTimeProduct(client, packageName, productId, localData);
      if (diffs.length === 0) {
        console.log("No differences found.");
      } else {
        console.log(formatOutput(diffs, format));
      }
    });
}
