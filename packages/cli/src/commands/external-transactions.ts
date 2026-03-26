import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

import {
  createExternalTransaction,
  getExternalTransaction,
  refundExternalTransaction,
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
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(readFileSync(options.file, "utf-8"));
      } catch (err) {
        const error = new Error(`Could not read transaction data from ${options.file}: ${err instanceof Error ? err.message : String(err)}`);
        Object.assign(error, { code: "INVALID_INPUT", exitCode: 2, suggestion: "Check the file path and ensure it contains valid JSON." });
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

      const result = await createExternalTransaction(client, packageName, data);
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
    .option("--full", "Full refund")
    .option("--partial-amount <micros>", "Partial refund pre-tax amount in micros (e.g., 1990000)")
    .option("--currency <code>", "Currency code for partial refund (e.g. USD)")
    .action(async (id: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      const refundData: Record<string, unknown> = {};
      if (options.full) {
        refundData["fullRefund"] = {};
      } else if (options.partialAmount) {
        refundData["partialRefund"] = {
          refundPreTaxAmount: {
            priceMicros: options.partialAmount,
            currency: options.currency,
          },
        };
      } else {
        refundData["fullRefund"] = {};
      }

      await requireConfirm(`Refund external transaction "${id}"?`, program);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "external-transactions refund",
            action: "refund external transaction",
            target: id,
            details: refundData,
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
