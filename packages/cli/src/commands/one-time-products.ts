import { readFile } from "node:fs/promises";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
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
  detectOutputFormat,
  formatOutput,
  sortResults,
} from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";

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
      const format = detectOutputFormat();

      try {
        const result = await listOneTimeProducts(client, packageName);
        if (options.sort) {
          result.oneTimeProducts = sortResults(result.oneTimeProducts, options.sort);
        }
        console.log(formatOutput(result, format));
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
      const format = detectOutputFormat();

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
      const format = detectOutputFormat();

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
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await createOneTimeProduct(client, packageName, data);
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
    .action(async (productId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = detectOutputFormat();

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
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await updateOneTimeProduct(client, packageName, productId, data);
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
        const format = detectOutputFormat();
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
      const format = detectOutputFormat();

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
      const format = detectOutputFormat();

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
      const format = detectOutputFormat();

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
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await createOneTimeOffer(client, packageName, productId, data);
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
    .action(async (productId: string, offerId: string, options: { file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = detectOutputFormat();

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
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await updateOneTimeOffer(client, packageName, productId, offerId, data);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("delete <product-id> <offer-id>")
    .description("Delete an offer")
    .action(async (productId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Delete offer "${offerId}" for product "${productId}"?`, program);

      if (isDryRun(program)) {
        const format = detectOutputFormat();
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
}
