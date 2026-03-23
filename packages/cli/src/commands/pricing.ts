import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";

import { convertRegionPrices, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";



export function registerPricingCommands(program: Command): void {
  const pricing = program.command("pricing").description("Pricing and regional price conversion");

  pricing
    .command("convert")
    .description("Convert a price to all regional prices")
    .option("--from <currency>", "Source currency code (e.g. USD)")
    .option("--amount <number>", "Price amount (e.g. 4.99)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const { isInteractive, requireOption } = await import("../prompt.js");
      const interactive = isInteractive(program);

      options.from = await requireOption(
        "from",
        options.from,
        {
          message: "Source currency code (e.g. USD):",
          default: "USD",
        },
        interactive,
      );

      options.amount = await requireOption(
        "amount",
        options.amount,
        {
          message: "Price amount (e.g. 4.99):",
        },
        interactive,
      );
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      try {
        const result = await convertRegionPrices(client, packageName, options.from, options.amount);
        if (format !== "json") {
          const prices = (result as unknown as Record<string, unknown>)["convertedRegionPrices"] as
            | Record<string, Record<string, unknown>>
            | undefined;
          if (prices) {
            const rows = Object.entries(prices).map(([region, data]) => {
              const money = data["price"] as Record<string, unknown> | undefined;
              const units = money?.["units"] || "0";
              const nanos = String(money?.["nanos"] || 0)
                .padStart(9, "0")
                .slice(0, 2);
              return {
                region,
                price: money
                  ? `${units}.${nanos}`
                  : data["priceMicros"]
                    ? String(Number(data["priceMicros"]) / 1_000_000)
                    : "-",
                currencyCode: (money?.["currencyCode"] || data["currencyCode"] || "-") as string,
              };
            });
            console.log(formatOutput(rows, format));
          } else {
            console.log(formatOutput(result, format));
          }
        } else {
          console.log(formatOutput(result, format));
        }
      } catch (error) {
        const { PlayApiError } = await import("@gpc-cli/api");
        if (
          error instanceof PlayApiError &&
          (error.code === "API_HTTP_400" || error.code === "API_EDIT_EXPIRED")
        ) {
          console.error(
            "Error: Price conversion is not available for this app. " +
              "Ensure the app has monetization configured in Google Play Console (at least one paid product or subscription).",
          );
        } else {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
        process.exit(4);
      }
    });
}
