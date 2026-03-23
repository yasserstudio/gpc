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

      try {
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
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
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

      try {
        const result = await getOneTimeProduct(client, packageName, productId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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

      try {
        const data = await readJsonFile(options.file);
        const result = await createOneTimeProduct(client, packageName, data as any);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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

      try {
        const data = await readJsonFile(options.file);
        const result = await updateOneTimeProduct(
          client,
          packageName,
          productId,
          data as any,
          options.updateMask,
        );
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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

      try {
        await deleteOneTimeProduct(client, packageName, productId);
        console.log(`One-time product ${productId} deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // --- Offers ---
  const offers = otp.command("offers").description("Manage one-time product offers");

  offers
    .command("list <product-id>")
    .description("List offers for a one-time product")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (productId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listOneTimeOffers(client, packageName, productId);
        if (options.sort) {
          result.oneTimeOffers = sortResults(result.oneTimeOffers, options.sort);
        }
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("get <product-id> <offer-id>")
    .description("Get an offer for a one-time product")
    .action(async (productId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await getOneTimeOffer(client, packageName, productId, offerId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("create <product-id>")
    .description("Create an offer from JSON file")
    .requiredOption("--file <path>", "JSON file with offer data")
    .action(async (productId: string, options: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "one-time-products offers create",
            action: "create offer for",
            target: productId,
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
        const result = await createOneTimeOffer(client, packageName, productId, data as any);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("update <product-id> <offer-id>")
    .description("Update an offer from JSON file")
    .requiredOption("--file <path>", "JSON file with offer data")
    .option("--update-mask <fields>", "Comma-separated field mask")
    .action(
      async (
        productId: string,
        offerId: string,
        options: { file: string; updateMask?: string },
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
          const result = await updateOneTimeOffer(
            client,
            packageName,
            productId,
            offerId,
            data as any,
            options.updateMask,
          );
          console.log(formatOutput(result, format));
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(4);
        }
      },
    );

  offers
    .command("delete <product-id> <offer-id>")
    .description("Delete an offer")
    .action(async (productId: string, offerId: string) => {
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

      try {
        await deleteOneTimeOffer(client, packageName, productId, offerId);
        console.log(`Offer ${offerId} deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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

      try {
        const localData = (await readJsonFile(options.file)) as OneTimeProduct;
        const diffs = await diffOneTimeProduct(client, packageName, productId, localData);
        if (diffs.length === 0) {
          console.log("No differences found.");
        } else {
          console.log(formatOutput(diffs, format));
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
