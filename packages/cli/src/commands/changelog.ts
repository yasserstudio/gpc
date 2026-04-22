import type { Command } from "commander";
import {
  fetchChangelog,
  formatChangelogEntry,
  formatOutput,
  generateChangelog,
  RENDERERS,
  renderPlayStore,
  renderPlayStoreMd,
  renderPlayStorePrompt,
  buildLocaleBundle,
  translateBundle,
  resolveAiConfig,
  createTranslator,
  fetchAggregateCost,
  formatPathLabel,
  PROVIDER_WHITELIST,
  resolveLocales,
  validateBundleForApply,
  bundleToReleaseNotes,
  applyReleaseNotes,
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

interface ApplyContext {
  bundle: Parameters<typeof validateBundleForApply>[0];
  program: Command;
  track: string;
  dryRun: boolean;
  aiBlock?: Record<string, unknown>;
}

async function performApply(ctx: ApplyContext): Promise<boolean> {
  const blocked = validateBundleForApply(ctx.bundle);
  if (blocked.length > 0) {
    process.stderr.write(
      `Cannot --apply: ${blocked.length} locale(s) blocked:\n` +
        blocked.map((b) => `  ${b}`).join("\n") +
        "\n",
    );
    process.exitCode = 1;
    return false;
  }
  const notes = bundleToReleaseNotes(ctx.bundle);
  const config = await loadConfig();
  const packageName = resolvePackageName(ctx.program.opts()["app"], config);
  if (ctx.dryRun) {
    const payload: Record<string, unknown> = {
      dryRun: true,
      action: "apply release notes",
      track: ctx.track,
      packageName,
      localeCount: notes.length,
      releaseNotes: notes,
    };
    if (ctx.aiBlock) payload["ai"] = ctx.aiBlock;
    console.log(JSON.stringify(payload, null, 2));
    return false;
  }
  const client = await getClient(config);
  const result = await applyReleaseNotes(client, packageName, ctx.track, notes);
  process.stderr.write(
    `${dim(`→ Applied ${result.localeCount} locale(s) to draft on ${result.track} (${packageName})`)}\n`,
  );
  return true;
}

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
    .option(
      "--locales <csv|auto>",
      "Comma-separated BCP 47 locales, or 'auto' (play-store target only)",
    )
    .option("--ai", "Translate non-source locales via LLM (play-store target only, BYO key)")
    .option(
      "--provider <name>",
      `AI provider (${PROVIDER_WHITELIST.join("|")}). Defaults to first env key detected`,
    )
    .option("--model <id>", "Override default model for the chosen provider")
    .option("--strict", "Exit non-zero if warnings, overflows, or translation failures occur")
    .option("--apply", "Write notes into the draft release on --track (play-store target only)")
    .option("--track <name>", "Play Store track for --apply (default: production)", "production")
    .action(
      async (opts: {
        from?: string;
        to?: string;
        format: string;
        repo?: string;
        target: string;
        locales?: string;
        strict?: boolean;
        ai?: boolean;
        provider?: string;
        model?: string;
        apply?: boolean;
        track: string;
      }) => {
        const dryRun = !!program.opts()["dryRun"];
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
        // Only block when the AI-adjacent flags are explicitly set. The root
        // program has its own `--dry-run` flag that may already be set
        // globally by the user for unrelated reasons; we silently ignore it
        // on non-AI code paths.
        if (target === "github" && (opts.ai || opts.provider || opts.model)) {
          process.stderr.write("--ai / --provider / --model only apply to --target play-store\n");
          process.exitCode = 2;
          return;
        }
        // --format prompt + --ai is nonsensical outside --dry-run: it would
        // render a "please translate this" prompt from already-translated
        // text. Either inspect the prompt via --dry-run, or pick md/json.
        if (opts.ai && opts.format === "prompt" && !dryRun) {
          process.stderr.write(
            "--ai with --format prompt only makes sense with --dry-run\n" +
              "  (otherwise it would re-wrap translated text in a translation prompt).\n" +
              "  Hint: use --format md or --format json for live translation, or add --dry-run to inspect the prompt.\n",
          );
          process.exitCode = 2;
          return;
        }
        if (opts.apply && target !== "play-store") {
          process.stderr.write("--apply only applies to --target play-store\n");
          process.exitCode = 2;
          return;
        }
        if (opts.apply && mode === "prompt") {
          process.stderr.write(
            "--apply cannot be combined with --format prompt\n" +
              "  Hint: use --format md or --format json.\n",
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

        const playStoreFormat = mode as PlayStoreFormat;

        // Non-AI path: existing v0.9.62 behavior
        if (!opts.ai) {
          const { output, bundle } = renderPlayStore(generated, {
            locales,
            format: playStoreFormat,
          });
          console.log(output);

          for (const lang of bundle.overflows) {
            process.stderr.write(
              `${yellow("warn:")} ${lang} exceeds ${bundle.limit} chars (truncated)\n`,
            );
          }

          if (opts.apply) {
            const ok = await performApply({ bundle, program, track: opts.track, dryRun });
            if (!ok) return;
          }

          const hasOverflow = bundle.overflows.length > 0;
          const hasWarnings = generated.warnings.length > 0;
          if (opts.strict && (hasWarnings || hasOverflow)) {
            process.exitCode = 1;
          }
          return;
        }

        // --ai path: resolve config, translate, render with ai block
        let aiConfig;
        try {
          aiConfig = resolveAiConfig({ provider: opts.provider, model: opts.model });
        } catch (error) {
          if (error instanceof GpcError) {
            process.stderr.write(`${error.message}\n`);
            if (error.suggestion) process.stderr.write(`${dim(error.suggestion)}\n`);
            process.exitCode = error.exitCode;
            return;
          }
          throw error;
        }

        process.stderr.write(`${dim(`→ ${formatPathLabel(aiConfig)}`)}\n`);

        const baseBundle = buildLocaleBundle(generated, {
          locales,
          format: playStoreFormat,
        });

        if (dryRun) {
          const preview = renderPlayStorePrompt(baseBundle, generated);
          console.log(preview);
          process.stderr.write(
            `${dim("(--dry-run: no API call was made; the prompt above is what would be sent per locale)")}\n`,
          );
          return;
        }

        const translator = await createTranslator(aiConfig);
        let translated;
        try {
          translated = await translateBundle(baseBundle, {
            translator,
            strict: opts.strict,
            onError: ({ language, reason }) => {
              process.stderr.write(
                `${yellow("warn:")} ${language} translation failed: ${reason}\n`,
              );
            },
          });
        } catch (error) {
          if (error instanceof GpcError) {
            process.stderr.write(`${error.message}\n`);
            if (error.suggestion) process.stderr.write(`${dim(error.suggestion)}\n`);
            process.exitCode = error.exitCode;
            return;
          }
          throw error;
        }

        const costUsd =
          aiConfig.path === "gateway" ? await fetchAggregateCost(aiConfig.runId) : undefined;

        const aiBlock: Record<string, unknown> = {
          path: aiConfig.path,
          provider: aiConfig.provider,
          model: aiConfig.model,
          tokensIn: translated.tokensIn,
          tokensOut: translated.tokensOut,
        };
        if (aiConfig.path === "gateway") {
          aiBlock["runId"] = aiConfig.runId;
          if (typeof costUsd === "number") aiBlock["costUsd"] = costUsd;
        }

        if (playStoreFormat === "json") {
          const payload = {
            from: translated.from,
            to: translated.to,
            limit: translated.limit,
            sourceLanguage: translated.sourceLanguage,
            ai: aiBlock,
            locales: translated.locales,
            overflows: translated.overflows,
            failures: translated.failures,
          };
          console.log(JSON.stringify(payload, null, 2));
        } else if (playStoreFormat === "prompt") {
          console.log(renderPlayStorePrompt(translated, generated));
        } else {
          console.log(renderPlayStoreMd(translated));
        }

        for (const lang of translated.overflows) {
          process.stderr.write(
            `${yellow("warn:")} ${lang} exceeds ${translated.limit} chars (truncated)\n`,
          );
        }

        if (translated.failures.length > 0) {
          process.stderr.write(
            `${dim(`(${translated.failures.length} locale${translated.failures.length === 1 ? "" : "s"} failed — see placeholders in output)`)}\n`,
          );
        }

        if (typeof costUsd === "number") {
          process.stderr.write(`${dim(`(run cost: $${costUsd.toFixed(4)})`)}\n`);
        }

        if (opts.apply) {
          const ok = await performApply({
            bundle: translated,
            program,
            track: opts.track,
            dryRun,
            aiBlock,
          });
          if (!ok) return;
        }

        const hasOverflow = translated.overflows.length > 0;
        const hasWarnings = generated.warnings.length > 0;
        const hasFailures = translated.failures.length > 0;
        if (opts.strict && (hasWarnings || hasOverflow || hasFailures)) {
          process.exitCode = 1;
        }
      },
    );
}
