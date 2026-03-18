import type { Command } from "commander";
import { getQuotaUsage, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

export function registerQuotaCommand(program: Command): void {
  const quota = program
    .command("quota")
    .description("View Google Play API quota usage tracked from local audit log");

  quota
    .command("status")
    .description("Show daily and per-minute API call counts")
    .action(async () => {
      const format = getOutputFormat(program, {});

      try {
        const usage = await getQuotaUsage();

        if (format === "json") {
          console.log(formatOutput(usage, format));
          return;
        }

        const dailyPct = ((usage.dailyCallsUsed / usage.dailyCallsLimit) * 100).toFixed(1);
        const minPct = ((usage.minuteCallsUsed / usage.minuteCallsLimit) * 100).toFixed(1);

        console.log(`\nAPI Quota Usage`);
        console.log(`${"─".repeat(45)}`);
        console.log(
          `Daily:   ${usage.dailyCallsUsed.toLocaleString()} / ${usage.dailyCallsLimit.toLocaleString()} (${dailyPct}%)`,
        );
        console.log(`         Remaining: ${usage.dailyCallsRemaining.toLocaleString()}`);
        console.log(`Minute:  ${usage.minuteCallsUsed} / ${usage.minuteCallsLimit} (${minPct}%)`);
        console.log(`         Remaining: ${usage.minuteCallsRemaining}`);

        if (usage.topCommands.length > 0) {
          console.log(`\nTop commands today:`);
          for (const { command, count } of usage.topCommands) {
            console.log(`  ${command.padEnd(30)} ${count}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  quota
    .command("usage")
    .description("Alias for quota status")
    .action(async () => {
      const format = getOutputFormat(program, {});

      try {
        const usage = await getQuotaUsage();
        console.log(formatOutput(usage, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
