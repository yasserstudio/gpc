import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { getConfigDir } from "@gpc-cli/config";
import {
  initAudit,
  listAuditEvents,
  searchAuditEvents,
  clearAuditLog,
  formatOutput,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { requireConfirm } from "../prompt.js";

export function registerAuditCommands(program: Command): void {
  const audit = program.command("audit").description("Query and manage audit logs");

  audit
    .command("list")
    .description("List recent audit events")
    .option("--limit <n>", "Maximum events to show", parseInt, 50)
    .option("--since <date>", "Show events since date (ISO 8601)")
    .option("--command <name>", "Filter by command name")
    .action(async (options) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      initAudit(getConfigDir());

      try {
        const events = await listAuditEvents({
          limit: options.limit,
          since: options.since,
          command: options.command,
        });
        if (events.length === 0 && format !== "json") {
          console.log("No audit events found.");
          return;
        }
        if (format !== "json") {
          const rows = events.map((e) => ({
            timestamp: e.timestamp,
            command: e.command,
            app: e.app || "-",
            success: e.success !== undefined ? String(e.success) : "-",
            durationMs: e.durationMs ?? "-",
          }));
          console.log(formatOutput(rows, format));
        } else {
          console.log(formatOutput(events, format));
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  audit
    .command("search <query>")
    .description("Search audit events by keyword")
    .action(async (query: string) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      initAudit(getConfigDir());

      try {
        const events = await searchAuditEvents(query);
        if (events.length === 0 && format !== "json") {
          console.log(`No audit events matching "${query}".`);
          return;
        }
        if (format !== "json") {
          const rows = events.map((e) => ({
            timestamp: e.timestamp,
            command: e.command,
            app: e.app || "-",
            success: e.success !== undefined ? String(e.success) : "-",
          }));
          console.log(formatOutput(rows, format));
        } else {
          console.log(formatOutput(events, format));
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  audit
    .command("clear")
    .description("Clear audit log entries")
    .option("--before <date>", "Clear entries before date (ISO 8601)")
    .option("--dry-run", "Preview what would be cleared")
    .action(async (options) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);
      initAudit(getConfigDir());

      if (!options.dryRun && !options.before) {
        await requireConfirm("Clear all audit log entries?", program);
      }

      try {
        const result = await clearAuditLog({
          before: options.before,
          dryRun: options.dryRun,
        });
        if (options.dryRun) {
          console.log(`[dry-run] Would delete ${result.deleted} entries, ${result.remaining} would remain.`);
        } else {
          console.log(`Deleted ${result.deleted} entries. ${result.remaining} remaining.`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
