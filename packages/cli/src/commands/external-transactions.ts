import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import {
  createExternalTransaction,
  getExternalTransaction,
  refundExternalTransaction,
  detectOutputFormat,
  formatOutput,
} from "@gpc-cli/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";
import { readFileSync } from "node:fs";

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
      const format = detectOutputFormat();

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(readFileSync(options.file, "utf-8"));
      } catch (err) {
        console.error(
          `Error: Could not read transaction data from ${options.file}: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
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

      try {
        const result = await createExternalTransaction(client, packageName, data);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  extTxn
    .command("get <id>")
    .description("Get an external transaction by ID")
    .action(async (id: string) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = detectOutputFormat();

      try {
        const result = await getExternalTransaction(client, packageName, id);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  extTxn
    .command("refund <id>")
    .description("Refund an external transaction")
    .option("--full", "Full refund")
    .option(
      "--partial-amount <micros>",
      "Partial refund pre-tax amount in micros (e.g., 1990000)",
    )
    .option("--currency <code>", "Currency code for partial refund (e.g. USD)")
    .action(async (id: string, options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = detectOutputFormat();

      const refundData: Record<string, unknown> = {};
      if (options.full) {
        refundData.fullRefund = {};
      } else if (options.partialAmount) {
        refundData.partialRefund = {
          refundPreTaxAmount: {
            priceMicros: options.partialAmount,
            currency: options.currency,
          },
        };
      } else {
        refundData.fullRefund = {};
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

      try {
        const result = await refundExternalTransaction(client, packageName, id, refundData);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
