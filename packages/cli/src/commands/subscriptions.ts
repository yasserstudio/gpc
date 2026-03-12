import { readFile } from "node:fs/promises";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { Option } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
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
  formatOutput,
  sortResults,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
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

export function registerSubscriptionsCommands(program: Command): void {
  const subs = program.command("subscriptions").description("Manage subscriptions and base plans");

  subs
    .command("list")
    .description("List subscriptions")
    .addOption(new Option("--page-size <n>", "Results per page").argParser(parseInt).hideHelp())
    .addOption(new Option("--page-token <token>", "Page token").hideHelp())
    .option("--limit <n>", "Maximum total results", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listSubscriptions(client, packageName, {
          pageSize: options.pageSize,
          pageToken: options.pageToken,
          limit: options.limit,
          nextPage: options.nextPage,
        });
        if (options.sort) {
          result.subscriptions = sortResults(result.subscriptions, options.sort);
        }
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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions create",
            action: "create",
            target: `subscription from ${options.file}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions update",
            action: "update",
            target: productId,
            details: { file: options.file, updateMask: options.updateMask },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const data = JSON.parse(await readFile(options.file, "utf-8"));
        const result = await updateSubscription(
          client,
          packageName,
          productId,
          data,
          options.updateMask,
        );
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
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Delete subscription "${productId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "subscriptions delete",
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
        await deleteSubscription(client, packageName, productId);
        console.log(`Subscription ${productId} deleted.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // --- Base Plans ---
  const basePlans = subs.command("base-plans").description("Manage base plans");

  basePlans
    .command("activate <product-id> <base-plan-id>")
    .description("Activate a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions base-plans activate",
            action: "activate",
            target: `${productId}/${basePlanId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions base-plans deactivate",
            action: "deactivate",
            target: `${productId}/${basePlanId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

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
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(
        `Delete base plan "${basePlanId}" from subscription "${productId}"?`,
        program,
      );

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "subscriptions base-plans delete",
            action: "delete",
            target: `${productId}/${basePlanId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

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
    .action(
      async (
        productId: string,
        basePlanId: string,
        options: { file: string; updateMask?: string },
      ) => {
        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const format = getOutputFormat(program, config);

        if (isDryRun(program)) {
          printDryRun(
            {
              command: "subscriptions base-plans migrate-prices",
              action: "migrate prices for",
              target: `${productId}/${basePlanId}`,
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
          const result = await migratePrices(client, packageName, productId, basePlanId, data);
          console.log(formatOutput(result, format));
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(4);
        }
      },
    );

  // --- Offers ---
  const offers = subs.command("offers").description("Manage subscription offers");

  offers
    .command("list <product-id> <base-plan-id>")
    .description("List offers for a base plan")
    .action(async (productId: string, basePlanId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

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
    .action(
      async (
        productId: string,
        basePlanId: string,
        options: { file: string; updateMask?: string },
      ) => {
        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const format = getOutputFormat(program, config);

        if (isDryRun(program)) {
          printDryRun(
            {
              command: "subscriptions offers create",
              action: "create offer for",
              target: `${productId}/${basePlanId}`,
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
          const result = await createOffer(client, packageName, productId, basePlanId, data);
          console.log(formatOutput(result, format));
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(4);
        }
      },
    );

  offers
    .command("update <product-id> <base-plan-id> <offer-id>")
    .description("Update an offer from JSON file")
    .requiredOption("--file <path>", "JSON file with offer data")
    .option("--update-mask <fields>", "Comma-separated field mask")
    .action(
      async (
        productId: string,
        basePlanId: string,
        offerId: string,
        options: { file: string; updateMask?: string },
      ) => {
        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const format = getOutputFormat(program, config);

        if (isDryRun(program)) {
          printDryRun(
            {
              command: "subscriptions offers update",
              action: "update offer",
              target: `${productId}/${basePlanId}/${offerId}`,
              details: { file: options.file, updateMask: options.updateMask },
            },
            format,
            formatOutput,
          );
          return;
        }

        const client = await getClient(config);

        try {
          const data = JSON.parse(await readFile(options.file, "utf-8"));
          const result = await updateOffer(
            client,
            packageName,
            productId,
            basePlanId,
            offerId,
            data,
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
    .command("delete <product-id> <base-plan-id> <offer-id>")
    .description("Delete an offer")
    .action(async (productId: string, basePlanId: string, offerId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Delete offer "${offerId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "subscriptions offers delete",
            action: "delete offer",
            target: `${productId}/${basePlanId}/${offerId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions offers activate",
            action: "activate offer",
            target: `${productId}/${basePlanId}/${offerId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

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
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "subscriptions offers deactivate",
            action: "deactivate offer",
            target: `${productId}/${basePlanId}/${offerId}`,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await deactivateOffer(client, packageName, productId, basePlanId, offerId);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
