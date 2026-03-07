import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { loadConfig } from "@gpc/config";
import { resolveAuth } from "@gpc/auth";
import { createApiClient } from "@gpc/api";
import {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  activateBasePlan,
  deactivateBasePlan,
  deleteBasePlan,
  migratePrices,
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
  activateOffer,
  deactivateOffer,
  detectOutputFormat,
  formatOutput,
} from "@gpc/core";

function resolvePackageName(packageArg: string | undefined, config: any): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

async function getClient(config: any) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth });
}

export function registerSubscriptionsCommands(program: Command): void {
  const subs = program
    .command("subscriptions")
    .description("Manage subscriptions and base plans");

  subs
    .command("list")
    .description("List subscriptions")
    .option("--page-size <n>", "Results per page", parseInt)
    .option("--page-token <token>", "Page token")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await listSubscriptions(client, packageName, {
          pageSize: options.pageSize,
          pageToken: options.pageToken,
        });
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  subs
    .command("get <product-id>")
    .description("Get a subscription")
    .action(async (productId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await getSubscription(client, packageName, productId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  subs
    .command("create")
    .description("Create a subscription from JSON file")
    .requiredOption("--file <path>", "JSON file with subscription data")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await createSubscription(client, packageName, data);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  subs
    .command("update <product-id>")
    .description("Update a subscription from JSON file")
    .requiredOption("--file <path>", "JSON file with subscription data")
    .option("--update-mask <fields>", "Comma-separated field mask")
    .action(async (productId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await updateSubscription(client, packageName, productId, data, options.updateMask);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  subs
    .command("delete <product-id>")
    .description("Delete a subscription")
    .action(async (productId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);

      try {
        await deleteSubscription(client, packageName, productId);
        console.log(`Subscription ${productId} deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // --- Base Plans ---
  const basePlans = subs
    .command("base-plans")
    .description("Manage base plans");

  basePlans
    .command("activate <product-id> <base-plan-id>")
    .description("Activate a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await activateBasePlan(client, packageName, productId, basePlanId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  basePlans
    .command("deactivate <product-id> <base-plan-id>")
    .description("Deactivate a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await deactivateBasePlan(client, packageName, productId, basePlanId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  basePlans
    .command("delete <product-id> <base-plan-id>")
    .description("Delete a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);

      try {
        await deleteBasePlan(client, packageName, productId, basePlanId);
        console.log(`Base plan ${basePlanId} deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  basePlans
    .command("migrate-prices <product-id> <base-plan-id>")
    .description("Migrate base plan prices")
    .requiredOption("--file <path>", "JSON file with migration data")
    .action(async (productId: string, basePlanId: string, options: any) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await migratePrices(client, packageName, productId, basePlanId, data);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // --- Offers ---
  const offers = subs
    .command("offers")
    .description("Manage subscription offers");

  offers
    .command("list <product-id> <base-plan-id>")
    .description("List offers for a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await listOffers(client, packageName, productId, basePlanId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("get <product-id> <base-plan-id> <offer-id>")
    .description("Get an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await getOffer(client, packageName, productId, basePlanId, offerId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("create <product-id> <base-plan-id>")
    .description("Create an offer from JSON file")
    .requiredOption("--file <path>", "JSON file with offer data")
    .action(async (productId: string, basePlanId: string, options: any) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await createOffer(client, packageName, productId, basePlanId, data);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("update <product-id> <base-plan-id> <offer-id>")
    .description("Update an offer from JSON file")
    .requiredOption("--file <path>", "JSON file with offer data")
    .option("--update-mask <fields>", "Comma-separated field mask")
    .action(async (productId: string, basePlanId: string, offerId: string, options: any) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await updateOffer(client, packageName, productId, basePlanId, offerId, data, options.updateMask);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("delete <product-id> <base-plan-id> <offer-id>")
    .description("Delete an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);

      try {
        await deleteOffer(client, packageName, productId, basePlanId, offerId);
        console.log(`Offer ${offerId} deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("activate <product-id> <base-plan-id> <offer-id>")
    .description("Activate an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await activateOffer(client, packageName, productId, basePlanId, offerId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  offers
    .command("deactivate <product-id> <base-plan-id> <offer-id>")
    .description("Deactivate an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await deactivateOffer(client, packageName, productId, basePlanId, offerId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
