import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import {
  listTesters,
  addTesters,
  removeTesters,
  importTestersFromCsv,
  formatOutput,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { isInteractive, requireOption, requireConfirm } from "../prompt.js";
import { buildCommitOptions } from "../commit-options.js";

export function registerTestersCommands(program: Command): void {
  const testers = program.command("testers").description("Manage testers and tester groups");

  testers
    .command("list")
    .description("List testers for a track")
    .option("--track <track>", "Track name (e.g., internal, alpha, beta)")
    .option("--sort <field>", "Sort by field (prefix with - for descending, e.g., email or -email)")
    .option("--limit <n>", "Maximum results to return")
    .option("--next-page <token>", "Pagination token for next page")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const interactive = isInteractive(program);

      options.track = await requireOption(
        "track",
        options.track,
        {
          message: "Track:",
          choices: ["internal", "alpha", "beta"],
        },
        interactive,
      );

      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await listTesters(client, packageName, options.track);
      if (options.sort && result.googleGroups) {
        const descending = options.sort.startsWith("-");
        result.googleGroups = [...result.googleGroups].sort((a: string, b: string) =>
          descending ? b.localeCompare(a) : a.localeCompare(b),
        );
      }
      if (format !== "json") {
        const groups = (result.googleGroups || []) as string[];
        const rows = groups.map((g: string) => ({ googleGroup: g }));
        if (rows.length > 0) {
          console.log(formatOutput(rows, format));
        } else {
          console.log("No testers found.");
        }
      } else {
        console.log(formatOutput(result, format));
      }
    });

  testers
    .command("add <emails...>")
    .description("Add testers (Google Group emails) to a track")
    .option("--track <track>", "Track name (e.g., internal, alpha, beta)")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (emails: string[], options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);

      options.track = await requireOption(
        "track",
        options.track,
        {
          message: "Track:",
          choices: ["internal", "alpha", "beta"],
        },
        interactive,
      );

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "testers add",
            action: "add testers to",
            target: options.track,
            details: { emails },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await addTesters(
        client,
        packageName,
        options.track,
        emails,
        buildCommitOptions(options),
      );
      console.log(formatOutput(result, format));
    });

  testers
    .command("remove <emails...>")
    .description("Remove testers (Google Group emails) from a track")
    .option("--track <track>", "Track name (e.g., internal, alpha, beta)")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (emails: string[], options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);

      options.track = await requireOption(
        "track",
        options.track,
        {
          message: "Track:",
          choices: ["internal", "alpha", "beta"],
        },
        interactive,
      );

      await requireConfirm(`Remove ${emails.length} tester(s) from ${options.track}?`, program);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "testers remove",
            action: "remove testers from",
            target: options.track,
            details: { emails },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await removeTesters(
        client,
        packageName,
        options.track,
        emails,
        buildCommitOptions(options),
      );
      console.log(formatOutput(result, format));
    });

  testers
    .command("import")
    .description("Import testers from a CSV file")
    .option("--track <track>", "Track name (e.g., internal, alpha, beta)")
    .option("--file <path>", "CSV file with email addresses")
    .option("--changes-not-sent-for-review", "Commit changes without sending for review")
    .option("--error-if-in-review", "Fail if changes are already in review")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);

      options.track = await requireOption(
        "track",
        options.track,
        {
          message: "Track:",
          choices: ["internal", "alpha", "beta"],
        },
        interactive,
      );

      options.file = await requireOption(
        "file",
        options.file,
        {
          message: "CSV file path:",
        },
        interactive,
      );

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "testers import",
            action: "import testers to",
            target: options.track,
            details: { file: options.file },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      const result = await importTestersFromCsv(
        client,
        packageName,
        options.track,
        options.file,
        buildCommitOptions(options),
      );
      console.log(formatOutput({ added: result.added, testers: result.testers }, format));
    });
}
