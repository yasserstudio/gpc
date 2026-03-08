import type { Command } from "commander";
import { loadConfig } from "@gpc/config";
import { resolveAuth } from "@gpc/auth";
import { createApiClient } from "@gpc/api";
import {
  getProductPurchase,
  acknowledgeProductPurchase,
  consumeProductPurchase,
  getSubscriptionPurchase,
  cancelSubscriptionPurchase,
  deferSubscriptionPurchase,
  revokeSubscriptionPurchase,
  listVoidedPurchases,
  refundOrder,
  detectOutputFormat,
  formatOutput,
} from "@gpc/core";
import { isDryRun, printDryRun } from "../dry-run.js";

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

export function registerPurchasesCommands(program: Command): void {
  const purchases = program
    .command("purchases")
    .description("Manage purchases and orders");

  purchases
    .command("get <product-id> <token>")
    .description("Get a product purchase")
    .action(async (productId: string, token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await getProductPurchase(client, packageName, productId, token);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  purchases
    .command("acknowledge <product-id> <token>")
    .description("Acknowledge a product purchase")
    .option("--payload <text>", "Developer payload")
    .action(async (productId: string, token: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);

      if (isDryRun(program)) {
        const format = detectOutputFormat();
        printDryRun({
          command: "purchases acknowledge",
          action: "acknowledge",
          target: `${productId}/${token}`,
          details: { payload: options.payload },
        }, format, formatOutput);
        return;
      }

      const client = await getClient(config);

      try {
        await acknowledgeProductPurchase(client, packageName, productId, token, options.payload);
        console.log(`Purchase acknowledged.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  purchases
    .command("consume <product-id> <token>")
    .description("Consume a product purchase")
    .action(async (productId: string, token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);

      if (isDryRun(program)) {
        const format = detectOutputFormat();
        printDryRun({
          command: "purchases consume",
          action: "consume",
          target: `${productId}/${token}`,
        }, format, formatOutput);
        return;
      }

      const client = await getClient(config);

      try {
        await consumeProductPurchase(client, packageName, productId, token);
        console.log(`Purchase consumed.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // --- Subscription purchases ---
  const sub = purchases
    .command("subscription")
    .description("Manage subscription purchases");

  sub
    .command("get <token>")
    .description("Get a subscription purchase (v2)")
    .action(async (token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await getSubscriptionPurchase(client, packageName, token);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  sub
    .command("cancel <subscription-id> <token>")
    .description("Cancel a subscription (v1)")
    .action(async (subscriptionId: string, token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);

      if (isDryRun(program)) {
        const format = detectOutputFormat();
        printDryRun({
          command: "purchases subscription cancel",
          action: "cancel subscription",
          target: `${subscriptionId}/${token}`,
        }, format, formatOutput);
        return;
      }

      const client = await getClient(config);

      try {
        await cancelSubscriptionPurchase(client, packageName, subscriptionId, token);
        console.log(`Subscription cancelled.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  sub
    .command("defer <subscription-id> <token>")
    .description("Defer a subscription expiry")
    .requiredOption("--expiry <iso-date>", "Desired new expiry date (ISO 8601)")
    .action(async (subscriptionId: string, token: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const format = detectOutputFormat();

      if (isDryRun(program)) {
        printDryRun({
          command: "purchases subscription defer",
          action: "defer subscription",
          target: `${subscriptionId}/${token}`,
          details: { expiry: options.expiry },
        }, format, formatOutput);
        return;
      }

      const client = await getClient(config);

      try {
        const result = await deferSubscriptionPurchase(client, packageName, subscriptionId, token, options.expiry);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  sub
    .command("revoke <token>")
    .description("Revoke a subscription (v2)")
    .action(async (token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);

      if (isDryRun(program)) {
        const format = detectOutputFormat();
        printDryRun({
          command: "purchases subscription revoke",
          action: "revoke subscription",
          target: token,
        }, format, formatOutput);
        return;
      }

      const client = await getClient(config);

      try {
        await revokeSubscriptionPurchase(client, packageName, token);
        console.log(`Subscription revoked.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // --- Voided purchases ---
  purchases
    .command("voided")
    .description("List voided purchases")
    .option("--start-time <time>", "Start time (milliseconds)")
    .option("--end-time <time>", "End time (milliseconds)")
    .option("--max-results <n>", "Maximum results", parseInt)
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await listVoidedPurchases(client, packageName, {
          startTime: options.startTime,
          endTime: options.endTime,
          maxResults: options.maxResults,
        });
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // --- Orders ---
  const orders = purchases
    .command("orders")
    .description("Manage orders");

  orders
    .command("refund <order-id>")
    .description("Refund an order")
    .option("--full-refund", "Full refund")
    .option("--prorated-refund", "Prorated refund")
    .action(async (orderId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts().app, config);

      if (isDryRun(program)) {
        const format = detectOutputFormat();
        printDryRun({
          command: "purchases orders refund",
          action: "refund",
          target: orderId,
          details: { fullRefund: options.fullRefund, proratedRefund: options.proratedRefund },
        }, format, formatOutput);
        return;
      }

      const client = await getClient(config);

      try {
        await refundOrder(client, packageName, orderId, {
          fullRefund: options.fullRefund,
          proratedRefund: options.proratedRefund,
        });
        console.log(`Order ${orderId} refunded.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
