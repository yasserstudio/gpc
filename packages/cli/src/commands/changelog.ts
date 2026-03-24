import type { Command } from "commander";
import { fetchChangelog, formatChangelogEntry } from "@gpc-cli/core";
import { formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

export function registerChangelogCommand(program: Command): void {
  program
    .command("changelog")
    .description("Show release history")
    .option("-n, --limit <count>", "Number of releases to show", "5")
    .option("--version <tag>", "Show a specific version (e.g., v0.9.43)")
    .option("--all", "Show all releases")
    .action(async (opts: { limit: string; version?: string; all?: boolean }) => {
      const format = getOutputFormat(program);

      try {
        const entries = await fetchChangelog({
          limit: opts.all ? 100 : Number(opts.limit),
          version: opts.version,
        });

        if (entries.length === 0) {
          console.log("No releases found.");
          return;
        }

        if (format === "json") {
          console.log(formatOutput(entries, "json"));
          return;
        }

        // Single version — show full details
        if (opts.version || entries.length === 1) {
          console.log(formatChangelogEntry(entries[0]!));
          return;
        }

        // Multiple versions — table summary
        const header = "VERSION      DATE         TITLE";
        const separator = "─".repeat(header.length);
        console.log(header);
        console.log(separator);
        for (const entry of entries) {
          const version = entry.version.padEnd(12);
          const date = entry.date.padEnd(12);
          console.log(`${version} ${date} ${entry.title}`);
        }
        console.log("");
        console.log(
          `Showing ${entries.length} releases. Use --version <tag> for details, or --all for full history.`,
        );
      } catch (error) {
        console.error(
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    });
}
