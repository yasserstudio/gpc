import type { Command } from "commander";
import {
  fetchChangelog,
  formatChangelogEntry,
  formatOutput,
  generateChangelog,
  RENDERERS,
  type OutputMode,
} from "@gpc-cli/core";
import { loadConfig } from "@gpc-cli/config";
import { getOutputFormat } from "../format.js";
import { yellow, dim } from "../colors.js";

const VALID_OUTPUT_MODES: OutputMode[] = ["md", "json", "prompt"];
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function registerChangelogCommand(program: Command): void {
  const changelog = program
    .command("changelog")
    .description("Show release history")
    .option("-n, --limit <count>", "Number of releases to show", parseInt, 5)
    .option("--tag <tag>", "Show a specific release (e.g., v0.9.43)")
    .option("--all", "Show all releases")
    .action(async (opts: { limit: number; tag?: string; all?: boolean }) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);

      const entries = await fetchChangelog({
        limit: opts.all ? 100 : opts.limit,
        version: opts.tag,
      });

      if (entries.length === 0) {
        console.log("No releases found.");
        return;
      }

      if (format === "json") {
        console.log(formatOutput(entries, "json"));
        return;
      }

      if (opts.tag || entries.length === 1) {
        console.log(formatChangelogEntry(entries[0]!));
        return;
      }

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
        `Showing ${entries.length} releases. Use --tag <tag> for details, or --all for full history.`,
      );
    });

  changelog
    .command("generate")
    .description("Generate release notes from local git commits")
    .option("--from <ref>", "Starting ref (default: latest v* tag)")
    .option("--to <ref>", "Ending ref (default: HEAD)")
    .option("--format <mode>", "Renderer: md, json, or prompt", "md")
    .option("--repo <owner/name>", "Override auto-detected repo (e.g., yasserstudio/gpc)")
    .option("--strict", "Exit non-zero if linter warnings are emitted")
    .action(
      async (opts: {
        from?: string;
        to?: string;
        format: string;
        repo?: string;
        strict?: boolean;
      }) => {
        const mode = opts.format as OutputMode;
        if (!VALID_OUTPUT_MODES.includes(mode)) {
          process.stderr.write(
            `Invalid --format "${opts.format}". Valid: ${VALID_OUTPUT_MODES.join(", ")}\n`,
          );
          process.exitCode = 2;
          return;
        }
        if (opts.repo && !REPO_RE.test(opts.repo)) {
          process.stderr.write(
            `Invalid --repo "${opts.repo}". Expected "owner/name" (e.g., yasserstudio/gpc).\n`,
          );
          process.exitCode = 2;
          return;
        }

        const generated = await generateChangelog({
          from: opts.from,
          to: opts.to,
          repo: opts.repo,
        });

        for (const w of generated.warnings) {
          process.stderr.write(`${yellow("warn:")} ${w}\n`);
        }
        if (generated.warnings.length > 0) {
          process.stderr.write(
            `${dim(`(${generated.warnings.length} warning${generated.warnings.length === 1 ? "" : "s"} — review before publishing)`)}\n`,
          );
        }

        const output = RENDERERS[mode](generated);
        console.log(output);

        if (opts.strict && generated.warnings.length > 0) {
          process.exitCode = 1;
        }
      },
    );
}
