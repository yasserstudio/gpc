import type { Command } from "commander";
import { Option } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import {
  getProductPurchase,
  acknowledgeProductPurchase,
  consumeProductPurchase,
  getSubscriptionPurchase,
  cancelSubscriptionPurchase,
  deferSubscriptionPurchase,
  revokeSubscriptionPurchase,
  refundSubscriptionV2,
  listVoidedPurchases,
  refundOrder,
  formatOutput,
} from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { getOutputFormat } from "../format.js";
import { isInteractive, requireOption, requireConfirm } from "../prompt.js";

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

export function registerPurchasesCommands(program: Command): void {
  const purchases = program.command("purchases").description("Manage purchases and orders");

  purchases
    .command("get <product-id> <token>")
    .description("Get a product purchase")
    .action(async (productId: string, token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await getProductPurchase(client, packageName, productId, token);
        if (format !== "json") {
          const r = result as unknown as Record<string, unknown>;
          const row = {
            orderId: r["orderId"] || "-",
            purchaseState: r["purchaseState"] ?? "-",
            consumptionState: r["consumptionState"] ?? "-",
            purchaseTime: r["purchaseTimeMillis"] ? new Date(Number(r["purchaseTimeMillis"])).toISOString() : "-",
            acknowledged: r["acknowledgementState"] ?? "-",
          };
          console.log(formatOutput(row, format));
        } else {
          console.log(formatOutput(result, format));
        }
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
      const packageName = resolvePackageName(program.opts()["app"], config);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases acknowledge",
            action: "acknowledge",
            target: `${productId}/${token}`,
            details: { payload: options.payload },
          },
          format,
          formatOutput,
        );
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
      const packageName = resolvePackageName(program.opts()["app"], config);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases consume",
            action: "consume",
            target: `${productId}/${token}`,
          },
          format,
          formatOutput,
        );
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
  const sub = purchases.command("subscription").description("Manage subscription purchases");

  sub
    .command("get <token>")
    .description("Get a subscription purchase (v2)")
    .action(async (token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await getSubscriptionPurchase(client, packageName, token);
        if (format !== "json") {
          const r = result as unknown as Record<string, unknown>;
          const lineItems = r["lineItems"] as Record<string, unknown>[] | undefined;
          const row = {
            subscriptionState: r["subscriptionState"] || "-",
            startTime: r["startTime"] || "-",
            expiryTime: r["expiryTime"] || "-",
            linkedPurchaseToken: r["linkedPurchaseToken"] ? "yes" : "no",
            lineItems: lineItems?.length || 0,
            acknowledgement: r["acknowledgementState"] || "-",
          };
          console.log(formatOutput(row, format));
        } else {
          console.log(formatOutput(result, format));
        }
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
      const packageName = resolvePackageName(program.opts()["app"], config);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases subscription cancel",
            action: "cancel subscription",
            target: `${subscriptionId}/${token}`,
          },
          format,
          formatOutput,
        );
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
    .option("--expiry <iso-date>", "Desired new expiry date (ISO 8601)")
    .action(async (subscriptionId: string, token: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);

      options.expiry = await requireOption(
        "expiry",
        options.expiry,
        {
          message: "New expiry date (ISO 8601, e.g. 2026-12-31T23:59:59Z):",
        },
        interactive,
      );

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "purchases subscription defer",
            action: "defer subscription",
            target: `${subscriptionId}/${token}`,
            details: { expiry: options.expiry },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await deferSubscriptionPurchase(
          client,
          packageName,
          subscriptionId,
          token,
          options.expiry,
        );
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  sub
    .command("refund <token>")
    .description("Refund a subscription purchase (v2)")
    .action(async (token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Refund subscription for token "${token.slice(0, 16)}..."?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases subscription refund",
            action: "refund subscription",
            target: token,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        await refundSubscriptionV2(client, packageName, token);
        console.log(`Subscription refunded.`);
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
      const packageName = resolvePackageName(program.opts()["app"], config);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases subscription revoke",
            action: "revoke subscription",
            target: token,
          },
          format,
          formatOutput,
        );
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
    .addOption(new Option("--max-results <n>", "Maximum results per page").argParser(parseInt).hideHelp())
    .option("--limit <n>", "Maximum total results", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await listVoidedPurchases(client, packageName, {
          startTime: options.startTime,
          endTime: options.endTime,
          maxResults: options.maxResults,
          limit: options.limit,
          nextPage: options.nextPage,
        });
        if (format !== "json") {
          const purchases = (result as Record<string, unknown>)["voidedPurchases"] as Record<string, unknown>[] | undefined;
          if (purchases && purchases.length > 0) {
            const rows = purchases.map((p) => ({
              orderId: p["orderId"] || "-",
              purchaseToken: String(p["purchaseToken"] || "-").slice(0, 16) + "...",
              voidedTime: p["voidedTimeMillis"] ? new Date(Number(p["voidedTimeMillis"])).toISOString() : "-",
              voidedSource: p["voidedSource"] ?? "-",
              voidedReason: p["voidedReason"] ?? "-",
            }));
            console.log(formatOutput(rows, format));
          } else {
            console.log("No voided purchases found.");
          }
        } else {
          console.log(formatOutput(result, format));
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  // --- Orders ---
  const orders = purchases.command("orders").description("Manage orders");

  orders
    .command("refund <order-id>")
    .description("Refund an order")
    .option("--full-refund", "Full refund")
    .option("--prorated-refund", "Prorated refund")
    .action(async (orderId: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Refund order "${orderId}"?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases orders refund",
            action: "refund",
            target: orderId,
            details: { fullRefund: options.fullRefund, proratedRefund: options.proratedRefund },
          },
          format,
          formatOutput,
        );
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
