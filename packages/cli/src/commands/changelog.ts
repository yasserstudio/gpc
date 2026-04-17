import type { Command } from "commander";
import {
  fetchChangelog,
  formatChangelogEntry,
  formatOutput,
  generateChangelog,
  RENDERERS,
  renderPlayStore,
  resolveLocales,
  GpcError,
  type OutputMode,
  type PlayStoreFormat,
} from "@gpc-cli/core";
import { loadConfig } from "@gpc-cli/config";
import { getOutputFormat } from "../format.js";
import { yellow, dim } from "../colors.js";
import { resolvePackageName, getClient } from "../resolve.js";

const VALID_OUTPUT_MODES: OutputMode[] = ["md", "json", "prompt"];
const VALID_TARGETS = ["github", "play-store"] as const;
type ChangelogTarget = (typeof VALID_TARGETS)[number];
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
    .option("--target <mode>", "Output target: github or play-store", "github")
    .option("--locales <csv|auto>", "Comma-separated BCP 47 locales, or 'auto' (play-store target only)")
    .option("--strict", "Exit non-zero if linter warnings or locale overflows are emitted")
    .action(
      async (opts: {
        from?: string;
        to?: string;
        format: string;
        repo?: string;
        target: string;
        locales?: string;
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
        if (!VALID_TARGETS.includes(opts.target as ChangelogTarget)) {
          process.stderr.write(
            `Invalid --target "${opts.target}". Valid: ${VALID_TARGETS.join(", ")}\n`,
          );
          process.exitCode = 2;
          return;
        }
        const target = opts.target as ChangelogTarget;
        if (opts.repo && !REPO_RE.test(opts.repo)) {
          process.stderr.write(
            `Invalid --repo "${opts.repo}". Expected "owner/name" (e.g., yasserstudio/gpc).\n`,
          );
          process.exitCode = 2;
          return;
        }
        if (target === "github" && opts.locales) {
          process.stderr.write(
            `--locales only applies to --target play-store (current target: github)\n`,
          );
          process.exitCode = 2;
          return;
        }
        if (target === "play-store" && !opts.locales) {
          process.stderr.write(
            "--target play-store requires --locales <csv|auto>\n" +
              "  Example: --locales en-US,fr-FR,de-DE\n" +
              "  Example: --locales auto   (reads current Play Store listing — requires --app)\n",
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

        if (target === "github") {
          const output = RENDERERS[mode](generated);
          console.log(output);
          if (opts.strict && generated.warnings.length > 0) {
            process.exitCode = 1;
          }
          return;
        }

        // target === "play-store"
        let locales: string[];
        try {
          if (opts.locales === "auto") {
            const config = await loadConfig();
            const packageName = resolvePackageName(program.opts()["app"], config);
            const client = await getClient(config);
            locales = await resolveLocales("auto", { client, packageName });
          } else {
            locales = await resolveLocales(opts.locales!);
          }
        } catch (error) {
          if (error instanceof GpcError) {
            process.stderr.write(`${error.message}\n`);
            if (error.suggestion) process.stderr.write(`${dim(error.suggestion)}\n`);
            process.exitCode = error.exitCode;
            return;
          }
          throw error;
        }

        const { output, bundle } = renderPlayStore(generated, {
          locales,
          format: mode as PlayStoreFormat,
        });
        console.log(output);

        for (const lang of bundle.overflows) {
          process.stderr.write(
            `${yellow("warn:")} ${lang} exceeds ${bundle.limit} chars (truncated)\n`,
          );
        }

        const hasOverflow = bundle.overflows.length > 0;
        const hasWarnings = generated.warnings.length > 0;
        if (opts.strict && (hasWarnings || hasOverflow)) {
          process.exitCode = 1;
        }
      },
    );
}
