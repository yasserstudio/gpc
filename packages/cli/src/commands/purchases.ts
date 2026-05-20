import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { Option } from "commander";
import { loadConfig } from "@gpc-cli/config";

import {
  getProductPurchase,
  getProductPurchaseV2,
  acknowledgeProductPurchase,
  consumeProductPurchase,
  getSubscriptionPurchase,
  cancelSubscriptionPurchase,
  cancelSubscriptionV2,
  deferSubscriptionPurchase,
  deferSubscriptionV2,
  revokeSubscriptionPurchase,
  listVoidedPurchases,
  refundOrder,
  getOrderDetails,
  batchGetOrders,
  formatOutput,
} from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { getOutputFormat } from "../format.js";
import { isInteractive, requireOption, requireConfirm } from "../prompt.js";

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

      const result = await getProductPurchase(client, packageName, productId, token);
      if (format !== "json") {
        const r = result as unknown as Record<string, unknown>;
        const row = {
          orderId: r["orderId"] || "-",
          purchaseState: r["purchaseState"] ?? "-",
          consumptionState: r["consumptionState"] ?? "-",
          purchaseTime: r["purchaseTimeMillis"]
            ? new Date(Number(r["purchaseTimeMillis"])).toISOString()
            : "-",
          acknowledged: r["acknowledgementState"] ?? "-",
        };
        console.log(formatOutput(row, format));
      } else {
        console.log(formatOutput(result, format));
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

      await acknowledgeProductPurchase(client, packageName, productId, token, options.payload);
      console.log(`Purchase acknowledged.`);
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

      await consumeProductPurchase(client, packageName, productId, token);
      console.log(`Purchase consumed.`);
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

      await requireConfirm(
        `Cancel subscription ${subscriptionId}? This cannot be undone.`,
        program,
      );

      const client = await getClient(config);

      await cancelSubscriptionPurchase(client, packageName, subscriptionId, token);
      console.log(`Subscription cancelled.`);
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

      const result = await deferSubscriptionPurchase(
        client,
        packageName,
        subscriptionId,
        token,
        options.expiry,
      );
      console.log(formatOutput(result, format));
    });

  sub
    .command("refund <token>")
    .description("Refund a subscription purchase (use 'orders refund' instead)")
    .action(async () => {
      console.error(
        `The subscriptionsv2 refund endpoint does not exist in the Google Play API.\n\n` +
          `Use one of these instead:\n` +
          `  gpc purchases orders refund <order-id>          Refund via orders API\n` +
          `  gpc purchases subscription revoke <token>       Revoke + refund via v2 API\n`,
      );
      process.exit(2);
    });

  sub
    .command("revoke <token>")
    .description("Revoke a subscription (v2)")
    .option(
      "--refund-type <type>",
      "Refund type: full, prorated, or item (default: prorated)",
    )
    .option("--product-id <id>", "Product ID for item-based refund (required with --refund-type item)")
    .action(async (token: string, opts: { refundType?: string; productId?: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const refundType = (opts.refundType ?? "prorated") as "full" | "prorated" | "item";

      if (!["full", "prorated", "item"].includes(refundType)) {
        console.error(`Invalid --refund-type "${refundType}". Use: full, prorated, or item`);
        process.exit(2);
      }

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases subscription revoke",
            action: "revoke subscription",
            target: token,
            refundType,
            ...(opts.productId && { productId: opts.productId }),
          },
          format,
          formatOutput,
        );
        return;
      }

      await requireConfirm(`Revoke subscription (${refundType} refund)? This cannot be undone.`, program);

      const client = await getClient(config);

      await revokeSubscriptionPurchase(client, packageName, token, refundType, opts.productId);
      console.log(`Subscription revoked (${refundType} refund).`);
    });

  // --- Voided purchases ---
  purchases
    .command("voided")
    .description("List voided purchases")
    .option("--start-time <time>", "Start time (milliseconds)")
    .option("--end-time <time>", "End time (milliseconds)")
    .option(
      "--type <n>",
      "Purchase type: 0=in-app only (default), 1=in-app + subscriptions",
      parseInt,
    )
    .option("--include-partial-refunds", "Include quantity-based partial refunds")
    .addOption(
      new Option("--max-results <n>", "Maximum results per page").argParser(parseInt).hideHelp(),
    )
    .option("--limit <n>", "Maximum total results", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await listVoidedPurchases(client, packageName, {
        startTime: options.startTime,
        endTime: options.endTime,
        type: options.type,
        includeQuantityBasedPartialRefund: options.includePartialRefunds,
        maxResults: options.maxResults,
        limit: options.limit,
        nextPage: options.nextPage,
      });
      if (format !== "json") {
        const purchases = (result as Record<string, unknown>)["voidedPurchases"] as
          | Record<string, unknown>[]
          | undefined;
        if (purchases && purchases.length > 0) {
          const rows = purchases.map((p) => ({
            orderId: p["orderId"] || "-",
            purchaseToken: String(p["purchaseToken"] || "-").slice(0, 16) + "...",
            voidedTime: p["voidedTimeMillis"]
              ? new Date(Number(p["voidedTimeMillis"])).toISOString()
              : "-",
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

      await refundOrder(client, packageName, orderId, {
        fullRefund: options.fullRefund,
        proratedRefund: options.proratedRefund,
      });
      console.log(`Order ${orderId} refunded.`);
    });

  orders
    .command("get <order-id>")
    .description("Get order details")
    .action(async (orderId: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getOrderDetails(client, packageName, orderId);
      if (format !== "json") {
        const row = {
          orderId: result.orderId,
          state: result.state,
          purchaseToken: result.purchaseToken ? result.purchaseToken.slice(0, 16) + "..." : "-",
          createTime: result.createTime || "-",
          total: result.total
            ? `${result.total.units || "0"}.${String(result.total.nanos || 0)
                .padStart(9, "0")
                .slice(0, 2)} ${result.total.currencyCode}`
            : "-",
          lineItems: result.lineItems?.length || 0,
        };
        console.log(formatOutput(row, format));
      } else {
        console.log(formatOutput(result, format));
      }
    });

  orders
    .command("batch-get")
    .description("Get multiple orders at once")
    .requiredOption("--ids <order-ids>", "Comma-separated order IDs (max 1000)")
    .action(async (options: { ids: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const orderIds = options.ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      const result = await batchGetOrders(client, packageName, orderIds);
      if (format !== "json") {
        if (result.length === 0) {
          console.log("No orders found.");
        } else {
          const rows = result.map((o) => ({
            orderId: o.orderId,
            state: o.state,
            createTime: o.createTime || "-",
            lineItems: o.lineItems?.length || 0,
          }));
          console.log(formatOutput(rows, format));
        }
      } else {
        console.log(formatOutput(result, format));
      }
    });

  // --- Product purchases V2 (Jun 2025) ---
  const product = purchases.command("product").description("Product purchase operations");

  product
    .command("get-v2 <token>")
    .description("Get product purchase details (v2 — supports multi-offer OTPs)")
    .action(async (token: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getProductPurchaseV2(client, packageName, token);
      if (format !== "json") {
        const row = {
          orderId: result.orderId || "-",
          state: result.purchaseStateContext?.state || "-",
          regionCode: result.regionCode || "-",
          completionTime: result.purchaseCompletionTime || "-",
          acknowledgement: result.acknowledgementState || "-",
          lineItems: result.productLineItem?.length || 0,
        };
        console.log(formatOutput(row, format));
      } else {
        console.log(formatOutput(result, format));
      }
    });

  // --- Subscription V2 cancel/defer (Sep 2025 / Jan 2026) ---
  // Added to existing `sub` group alongside v1 cancel/defer

  sub
    .command("cancel-v2 <token>")
    .description("Cancel a subscription (v2 -- supports cancellation types)")
    .option(
      "--type <cancellationType>",
      "USER_REQUESTED_STOP_RENEWALS (default) or DEVELOPER_REQUESTED_STOP_PAYMENTS",
    )
    .action(async (token: string, options: { type?: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases subscription cancel-v2",
            action: "cancel",
            target: token.slice(0, 16) + "...",
            details: { cancellationType: options.type },
          },
          format,
          formatOutput,
        );
        return;
      }

      await requireConfirm(
        `Cancel subscription (token: ${token.slice(0, 16)}...)? This cannot be undone.`,
        program,
      );

      const client = await getClient(config);

      await cancelSubscriptionV2(client, packageName, token, options.type);
      console.log("Subscription cancelled.");
    });

  sub
    .command("defer-v2 <token>")
    .description("Defer a subscription renewal (v2 -- supports add-on subscriptions)")
    .requiredOption("--duration <seconds>", "Duration to defer by (e.g. '2592000s' for 30 days)")
    .option("--etag <etag>", "Subscription etag (fetched automatically if omitted)")
    .action(async (token: string, options: { duration: string; etag?: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Defer subscription renewal by ${options.duration}?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "purchases subscription defer-v2",
            action: "defer",
            target: token.slice(0, 16) + "...",
            details: { deferDuration: options.duration },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await deferSubscriptionV2(
        client, packageName, token, options.duration, options.etag,
      );
      for (const item of result.itemExpiryTimeDetails) {
        console.log(`${item.productId}: new expiry ${item.expiryTime}`);
      }
    });
}
