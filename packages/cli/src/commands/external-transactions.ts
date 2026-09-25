import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

import type { ExternalTransaction, ExternalTransactionRefund } from "@gpc-cli/api";
import {
  createExternalTransaction,
  getExternalTransaction,
  refundExternalTransaction,
  buildExternalTransactionRefund,
  formatMoney,
  formatOutput,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";
import { readFileSync } from "node:fs";

export function registerExternalTransactionsCommands(program: Command): void {
  const extTxn = program
    .command("external-transactions")
    .alias("ext-txn")
    .description("Manage external transactions (alternative billing)");

  extTxn
    .command("create")
    .description("Create a new external transaction")
    .requiredOption("--file <path>", "Path to JSON file with transaction data")
    .requiredOption("--transaction-id <id>", "External transaction ID")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(readFileSync(options.file, "utf-8"));
      } catch (err) {
        const error = new Error(
          `Could not read transaction data from ${options.file}: ${err instanceof Error ? err.message : String(err)}`,
        );
        Object.assign(error, {
          code: "INVALID_INPUT",
          exitCode: 2,
          suggestion: "Check the file path and ensure it contains valid JSON.",
        });
        throw error;
      }

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "external-transactions create",
            action: "create external transaction",
            target: packageName,
            details: data,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await createExternalTransaction(
        client,
        packageName,
        data as ExternalTransaction,
        options.transactionId,
      );
      console.log(formatOutput(result, format));
    });

  extTxn
    .command("get <id>")
    .description("Get an external transaction by ID")
    .action(async (id: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await getExternalTransaction(client, packageName, id);
      console.log(formatOutput(result, format));
    });

  extTxn
    .command("refund <id>")
    .description("Refund an external transaction")
    .option("--full", "Refund the whole transaction")
    .option("--partial-amount <micros>", "Partial refund pre-tax amount in micros (e.g., 1990000)")
    .option("--currency <code>", "Currency code for a partial refund (e.g. USD)")
    .option("--refund-id <id>", "Unique ID for a partial refund (required with --partial-amount)")
    .option("--refund-time <iso>", "When the refund happened, ISO 8601 (default: now)")
    .action(async (id: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      const refundData = buildExternalTransactionRefund(options);

      await requireConfirm(describeRefund(id, refundData), program);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "external-transactions refund",
            action: "refund external transaction",
            target: id,
            details: { ...refundData },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await refundExternalTransaction(client, packageName, id, refundData);
      console.log(formatOutput(result, format));
    });
}

/** Confirmation text that states the refund type and amount, since a refund cannot be undone. */
function describeRefund(id: string, refund: ExternalTransactionRefund): string {
  const partial = refund.partialRefund;
  const amount = partial?.refundPreTaxAmount;
  if (!partial || !amount?.priceMicros) {
    return `Refund external transaction "${id}" in full? This cannot be undone.`;
  }
  const micros = BigInt(amount.priceMicros);
  const money = formatMoney(
    String(micros / 1_000_000n),
    Number(micros % 1_000_000n) * 1000,
    amount.currency,
  );
  return `Refund ${amount.currency} ${money} (pre-tax) of external transaction "${id}" as partial refund "${partial.refundId}"? This cannot be undone.`;
}
