import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient } from "@gpc-cli/api";
import { convertRegionPrices, detectOutputFormat, formatOutput } from "@gpc-cli/core";

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
      const format = detectOutputFormat();

      try {
        const result = await convertRegionPrices(client, packageName, options.from, options.amount);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
