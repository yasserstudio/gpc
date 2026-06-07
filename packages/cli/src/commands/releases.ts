import { appendFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient, createReportingClient } from "@gpc-cli/api";
import type { RetryLogEntry, ExternallyHostedApk, UploadProgressEvent } from "@gpc-cli/api";
import {
  uploadRelease,
  getReleasesStatus,
  promoteRelease,
  assignRelease,
  updateRollout,
  readReleaseNotesFromDir,
  isVersionedNotesDir,
  generateNotesFromGit,
  writeAuditLog,
  createAuditEntry,
  uploadExternallyHosted,
  diffReleases,
  fetchReleaseNotes,
  getVitalsCrashes,
  checkThreshold,
  GpcError,
} from "@gpc-cli/core";
import { formatOutput, sortResults, createSpinner, maybePaginate } from "@gpc-cli/core";
import type { UploadResult, ReleaseStatusResult } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import {
  isInteractive,
  promptSelect,
  promptInput,
  requireOption,
  requireConfirm,
} from "../prompt.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    throw new GpcError(
      "No package name. Use --app <package> or gpc config set app <package>",
      "RELEASES_USAGE_ERROR",
      2,
      "Set a default app: gpc config set app <package>",
    );
  }
  return name;
}

import { buildCommitOptions } from "../commit-options.js";

function createRetryLogger(retryLogPath?: string): ((entry: RetryLogEntry) => void) | undefined {
  if (!retryLogPath) return undefined;
  return (entry: RetryLogEntry) => {
    const line = JSON.stringify(entry) + "\n";
    appendFile(retryLogPath, line).catch(() => {});
  };
}

async function getClient(config: GpcConfig, retryLogPath?: string, uploadTimeout?: number) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth, onRetry: createRetryLogger(retryLogPath), uploadTimeout });
}

export function registerReleasesCommands(program: Command): void {
  const releases = program.command("releases").description("Manage releases and rollouts");

  // Upload
  releases
    .command("upload <file>")
    .description("Upload AAB/APK and assign to a track")
    .option("--track <track>", "Target track", "internal")
    .option("--rollout <percent>", "Staged rollout percentage (1-100)")
    .option("--notes <text>", "Release notes (en-US)")
    .option("--name <name>", "Release name")
    .option("--mapping <file>", "ProGuard/R8 mapping file for deobfuscation")
    .option("--notes-dir <dir>", "Read release notes from directory (<dir>/<lang>.txt)")
    .option("--notes-from-git", "Generate release notes from git commit history")
    .option("--copy-notes-from <track>", "Copy release notes from another track")
    .option("--changelog-ai", "Generate AI-translated release notes from git history")
    .option("--locales <csv|auto>", "Locales for --changelog-ai (comma-separated BCP 47 or 'auto')")
    .option("--provider <name>", "AI provider for --changelog-ai (anthropic|openai|google)")
    .option("--model <id>", "Override AI model for --changelog-ai")
    .option(
      "--since <ref>",
      "Git ref to start from (tag, SHA) — used with --notes-from-git or --changelog-ai",
    )
    .option("--retry-log <path>", "Write retry log entries to file (JSONL)")
    .option(
      "--timeout <ms>",
      "Upload timeout in milliseconds (auto-scales with file size by default)",
      parseInt,
    )
    .option(
      "--status <status>",
      "Release status: completed, inProgress, draft, halted",
      "completed",
    )
    .option("--mapping-type <type>", "Deobfuscation file type: proguard or nativeCode", "proguard")
    .option("--device-tier-config <id>", "Device tier config ID (or LATEST)")
    .option(
      "--changes-not-sent-for-review",
      "Commit changes without sending for review (required for rejected apps)",
    )
    .option(
      "--error-if-in-review",
      "Fail if changes are already in review instead of cancelling them",
    )
    .option(
      "--validate-only",
      "Upload and validate without committing (changes are discarded after validation)",
    )
    .option(
      "--in-app-update-priority <priority>",
      "In-app update priority (0-5, where 5 is highest)",
      (v: string) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 0 || n > 5) {
          throw new GpcError(
            `Invalid in-app update priority: ${v}`,
            "RELEASES_USAGE_ERROR",
            2,
            "Use a value from 0 (default, no priority) to 5 (highest priority).",
          );
        }
        return n;
      },
    )
    .option(
      "--retain-version-codes <codes>",
      "Retain previous version codes alongside the new upload (comma-separated)",
      (v: string) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    )
    .action(async (file: string, options) => {
      try {
        await stat(file);
      } catch {
        throw new GpcError(
          `File not found: ${file}`,
          "RELEASES_USAGE_ERROR",
          2,
          "Check the file path and try again.",
        );
      }

      const ext = extname(file).toLowerCase();
      if (ext !== ".aab" && ext !== ".apk") {
        throw new GpcError(
          `Expected .aab or .apk file, got "${ext || "(no extension)"}"`,
          "RELEASES_USAGE_ERROR",
          2,
          "Provide a .aab or .apk file.",
        );
      }

      const noteSources = [
        options.notes,
        options.notesDir,
        options.notesFromGit,
        options.copyNotesFrom,
        options.changelogAi,
      ].filter(Boolean);
      if (noteSources.length > 1) {
        throw new GpcError(
          "Cannot combine --notes, --notes-dir, --notes-from-git, --copy-notes-from, and --changelog-ai. Use only one.",
          "RELEASES_USAGE_ERROR",
          2,
          "Pick one release notes source.",
        );
      }
      if (options.changelogAi && !options.locales) {
        throw new GpcError(
          "--changelog-ai requires --locales <csv|auto>",
          "RELEASES_USAGE_ERROR",
          2,
          "Example: --changelog-ai --locales en-US,fr-FR or --changelog-ai --locales auto",
        );
      }
      if (options.validateOnly && isDryRun(program)) {
        throw new GpcError(
          "Cannot combine --dry-run and --validate-only.",
          "RELEASES_USAGE_ERROR",
          2,
          "Use --dry-run to preview without any API changes, or --validate-only to upload and validate without committing.",
        );
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      // Interactive mode: prompt for missing options
      if (isInteractive(program)) {
        if (!options.track || options.track === "internal") {
          const tracks = ["internal", "alpha", "beta", "production"];
          options.track = await promptSelect("Select track:", tracks, "internal");
        }

        if (!options.rollout && options.track === "production") {
          const rolloutStr = await promptInput(
            "Staged rollout percentage (1-100, blank for full)",
            "100",
          );
          if (rolloutStr && rolloutStr !== "100") {
            options.rollout = rolloutStr;
          }
        }

        if (!options.notes && !options.notesDir) {
          const notes = await promptInput("Release notes (en-US, blank to skip)");
          if (notes) options.notes = notes;
        }
      }

      if (options.rollout !== undefined) {
        const rollout = Number(options.rollout);
        if (!Number.isFinite(rollout) || rollout < 1 || rollout > 100) {
          throw new GpcError(
            `--rollout must be a number between 1 and 100 (got: ${options.rollout})`,
            "RELEASES_USAGE_ERROR",
            2,
            "Use a percentage between 1 and 100.",
          );
        }
      }

      if (
        options.mappingType &&
        options.mappingType !== "proguard" &&
        options.mappingType !== "nativeCode"
      ) {
        throw new GpcError(
          `--mapping-type must be "proguard" or "nativeCode" (got: "${options.mappingType}")`,
          "RELEASES_USAGE_ERROR",
          2,
          "Use --mapping-type proguard (default) for ProGuard/R8 maps, or --mapping-type nativeCode for native debug symbols.",
        );
      }

      const { size: fileSize } = await stat(file);
      const jsonMode = format === "json";
      const client = await getClient(config, options.retryLog, options.timeout);

      const showProgress = !jsonMode && process.stderr.isTTY && !program.opts()["quiet"];
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);

      function formatBytes(bytes: number): string {
        if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
      }

      const BAR_WIDTH = 20;
      const onUploadProgress = showProgress
        ? (event: UploadProgressEvent) => {
            const filled = Math.round((event.percent / 100) * BAR_WIDTH);
            const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
            const uploaded = formatBytes(event.bytesUploaded);
            const total = formatBytes(event.totalBytes);
            const speed =
              event.bytesPerSecond > 0 ? `${formatBytes(event.bytesPerSecond)}/s` : "...";
            const eta = event.etaSeconds > 0 ? `ETA ${event.etaSeconds}s` : "";
            process.stderr.write(
              `\r  ${bar}  ${event.percent}%  ${uploaded}/${total}  ${speed}  ${eta}\x1b[K`,
            );
          }
        : undefined;

      if (isDryRun(program)) {
        const result = await uploadRelease(client, packageName, file, {
          track: options.track,
          status: options.status,
          userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
          mappingFileType: options.mappingType,
          deviceTierConfigId: options.deviceTierConfig,
          inAppUpdatePriority: options.inAppUpdatePriority,
          retainVersionCodes: options.retainVersionCodes,
          dryRun: true,
        });
        console.log(formatOutput(result, format));
        return;
      }

      const auditEntry = createAuditEntry(
        "releases upload",
        {
          file,
          track: options.track,
          rollout: options.rollout,
        },
        packageName,
      );

      const spinner = createSpinner(`Uploading ${basename(file)} (${sizeMB} MB)...`);
      if (!showProgress) spinner.start();

      try {
        let releaseNotes: { language: string; text: string }[] | undefined;
        let notesDirVersioned: string | undefined;
        if (options.copyNotesFrom) {
          releaseNotes = await fetchReleaseNotes(client, packageName, options.copyNotesFrom);
        } else if (options.notesFromGit) {
          const gitNotes = await generateNotesFromGit({ since: options.since });
          releaseNotes = [{ language: gitNotes.language, text: gitNotes.text }];
        } else if (options.notesDir) {
          if (await isVersionedNotesDir(options.notesDir)) {
            notesDirVersioned = options.notesDir;
          } else {
            releaseNotes = await readReleaseNotesFromDir(options.notesDir);
          }
        } else if (options.changelogAi) {
          const {
            generateChangelog,
            buildLocaleBundle,
            resolveAiConfig,
            createTranslator,
            translateBundle,
            bundleToReleaseNotes,
            resolveLocales,
            formatPathLabel,
          } = await import("@gpc-cli/core");

          const generated = await generateChangelog({ from: options.since });

          let locales: string[];
          if (options.locales === "auto") {
            locales = await resolveLocales("auto", { client, packageName });
          } else {
            locales = await resolveLocales(options.locales);
          }

          const baseBundle = buildLocaleBundle(generated, { locales, format: "md" });

          const aiConfig = resolveAiConfig({
            provider: options.provider,
            model: options.model,
          });
          if (!jsonMode) {
            process.stderr.write(`  → AI: ${formatPathLabel(aiConfig)}\n`);
          }

          const translator = await createTranslator(aiConfig);
          const translated = await translateBundle(baseBundle, {
            translator,
            strict: false,
            onError: ({ language, reason }: { language: string; reason: string }) => {
              if (!jsonMode) {
                process.stderr.write(`  warn: ${language} translation failed: ${reason}\n`);
              }
            },
          });

          releaseNotes = bundleToReleaseNotes(translated);
          if (!jsonMode && releaseNotes.length > 0) {
            process.stderr.write(
              `  → ${releaseNotes.length} locale${releaseNotes.length !== 1 ? "s" : ""} generated\n`,
            );
          }
        } else if (options.notes) {
          releaseNotes = [{ language: "en-US", text: options.notes }];
        }

        const result = await uploadRelease(client, packageName, file, {
          track: options.track,
          status: options.status,
          userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
          releaseNotes,
          releaseName: options.name,
          mappingFile: options.mapping,
          mappingFileType: options.mappingType,
          deviceTierConfigId: options.deviceTierConfig,
          validateOnly: options.validateOnly,
          inAppUpdatePriority: options.inAppUpdatePriority,
          retainVersionCodes: options.retainVersionCodes,
          notesDirVersioned,
          onUploadProgress,
          commitOptions: buildCommitOptions(options),
        });
        if (showProgress) {
          process.stderr.write(`\r  ✓ Uploaded ${basename(file)}  ${sizeMB} MB\x1b[K\n`);
        }
        spinner.stop(
          (result as UploadResult).validateOnly
            ? "Validation passed (not committed)"
            : "Upload complete",
        );
        console.log(formatOutput(result, format));
        auditEntry.success = true;
      } catch (error) {
        if (showProgress) {
          process.stderr.write("\n");
        }
        spinner.fail("Upload failed");
        auditEntry.success = false;
        auditEntry.error = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        auditEntry.durationMs = Date.now() - new Date(auditEntry.timestamp).getTime();
        writeAuditLog(auditEntry).catch(() => {});
      }
    });

  // Status
  releases
    .command("status")
    .description("Show current release status across tracks")
    .option("--track <track>", "Filter by track")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const TRACK_ORDER = ["production", "beta", "alpha", "internal"];
      const rawStatuses = await getReleasesStatus(client, packageName, options.track);
      const statuses = options.track
        ? Array.isArray(rawStatuses)
          ? rawStatuses.filter((s: ReleaseStatusResult) => s.track === options.track)
          : rawStatuses
        : rawStatuses;
      const sorted = Array.isArray(statuses)
        ? options.sort
          ? sortResults(statuses, options.sort)
          : [...statuses].sort((a, b) => {
              const ai = TRACK_ORDER.indexOf(
                String((a as unknown as Record<string, unknown>)["track"] ?? ""),
              );
              const bi = TRACK_ORDER.indexOf(
                String((b as unknown as Record<string, unknown>)["track"] ?? ""),
              );
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            })
        : statuses;
      if (format !== "json" && Array.isArray(sorted)) {
        const rows = sorted.map((s: unknown) => {
          const sr = s as Record<string, unknown>;
          return {
            track: sr["track"] || "-",
            status: sr["status"] || "-",
            name: sr["name"] || "-",
            versionCodes: Array.isArray(sr["versionCodes"])
              ? (sr["versionCodes"] as unknown[]).join(", ")
              : "-",
            userFraction:
              sr["userFraction"] !== undefined
                ? `${Math.round(Number(sr["userFraction"]) * 100)}%`
                : "—",
          };
        });
        await maybePaginate(formatOutput(rows, format));
      } else {
        await maybePaginate(formatOutput(sorted, format));
      }
    });

  // Promote
  releases
    .command("promote")
    .description("Promote a release from one track to another")
    .option("--from <track>", "Source track")
    .option("--to <track>", "Target track")
    .option("--rollout <percent>", "Staged rollout percentage")
    .option("--notes <text>", "Release notes")
    .option("--copy-notes-from <track>", "Copy release notes from another track")
    .option("--status <status>", "Release status: completed, inProgress, draft, halted")
    .option(
      "--changes-not-sent-for-review",
      "Commit changes without sending for review (required for rejected apps)",
    )
    .option(
      "--error-if-in-review",
      "Fail if changes are already in review instead of cancelling them",
    )
    .action(async (options) => {
      if (options.notes && options.copyNotesFrom) {
        throw new GpcError(
          "Cannot combine --notes and --copy-notes-from. Use only one.",
          "RELEASES_USAGE_ERROR",
          2,
          "Pick one release notes source.",
        );
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);
      const tracks = ["internal", "alpha", "beta", "production"];

      options.from = await requireOption(
        "from",
        options.from,
        {
          message: "Source track:",
          choices: tracks,
        },
        interactive,
      );

      options.to = await requireOption(
        "to",
        options.to,
        {
          message: "Target track:",
          choices: tracks.filter((t: string) => t !== options.from),
        },
        interactive,
      );

      if (options.from === options.to) {
        throw new GpcError(
          `--from and --to must be different tracks (both are "${options.from}")`,
          "RELEASES_USAGE_ERROR",
          2,
          "Specify different source and target tracks.",
        );
      }

      if (options.rollout !== undefined) {
        const rollout = Number(options.rollout);
        if (!Number.isFinite(rollout) || rollout < 1 || rollout > 100) {
          throw new GpcError(
            `--rollout must be a number between 1 and 100 (got: ${options.rollout})`,
            "RELEASES_USAGE_ERROR",
            2,
            "Use a percentage between 1 and 100.",
          );
        }
      }

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "releases promote",
            action: "promote",
            target: `${options.from} → ${options.to}`,
            details: {
              rollout: options.rollout,
              ...(options.status && { status: options.status }),
            },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      let releaseNotes: { language: string; text: string }[] | undefined;
      if (options.copyNotesFrom) {
        releaseNotes = await fetchReleaseNotes(client, packageName, options.copyNotesFrom);
      } else if (options.notes) {
        releaseNotes = [{ language: "en-US", text: options.notes }];
      }

      const result = await promoteRelease(client, packageName, options.from, options.to, {
        status: options.status,
        userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
        releaseNotes,
        commitOptions: buildCommitOptions(options),
      });
      console.log(formatOutput(result, format));
    });

  // Assign
  releases
    .command("assign <versionCode>")
    .description("Assign an already-uploaded version code to a track without re-uploading")
    .option("--track <track>", "Target track", "internal")
    .option("--status <status>", "Release status: completed, inProgress, draft, halted")
    .option("--rollout <percent>", "Staged rollout percentage (sets status to inProgress)")
    .option("--notes <text>", "Release notes (en-US)")
    .option("--name <name>", "Release name")
    .option(
      "--in-app-update-priority <priority>",
      "In-app update priority (0-5, where 5 is highest)",
      (v: string) => {
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 0 || n > 5) {
          throw new GpcError(
            `Invalid in-app update priority: ${v}`,
            "RELEASES_USAGE_ERROR",
            2,
            "Use a value from 0 (default, no priority) to 5 (highest priority).",
          );
        }
        return n;
      },
    )
    .option(
      "--retain-version-codes <codes>",
      "Retain previous version codes alongside the new one (comma-separated)",
      (v: string) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    )
    .option(
      "--changes-not-sent-for-review",
      "Commit changes without sending for review (required for rejected apps)",
    )
    .option(
      "--error-if-in-review",
      "Fail if changes are already in review instead of cancelling them",
    )
    .action(async (versionCodeArg: string, options) => {
      const versionCode = Number(versionCodeArg);
      if (!Number.isFinite(versionCode) || versionCode <= 0) {
        throw new GpcError(
          `Invalid version code: ${versionCodeArg}`,
          "RELEASES_USAGE_ERROR",
          2,
          "Provide a positive integer version code (e.g., gpc releases assign 42 --track beta).",
        );
      }

      if (options.rollout !== undefined) {
        const rolloutVal = Number(options.rollout);
        if (!Number.isFinite(rolloutVal) || rolloutVal < 1 || rolloutVal > 100) {
          throw new GpcError(
            `--rollout must be a number between 1 and 100 (got: ${options.rollout})`,
            "RELEASES_USAGE_ERROR",
            2,
            "Use a percentage between 1 and 100.",
          );
        }
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "releases assign",
            action: "assign",
            target: `versionCode ${versionCode} → ${options.track}`,
            details: {
              ...(options.rollout && { rollout: options.rollout }),
              ...(options.status && { status: options.status }),
            },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);
      const result = await assignRelease(client, packageName, versionCode, {
        track: options.track,
        status: options.status,
        userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
        releaseNotes: options.notes ? [{ language: "en-US", text: options.notes }] : undefined,
        releaseName: options.name,
        inAppUpdatePriority: options.inAppUpdatePriority,
        retainVersionCodes: options.retainVersionCodes,
        commitOptions: buildCommitOptions(options),
      });
      console.log(formatOutput(result, format));
    });

  // Rollout subcommands
  const rollout = releases.command("rollout").description("Manage staged rollouts");

  for (const action of ["increase", "halt", "resume", "complete"] as const) {
    const cmd = rollout
      .command(action)
      .description(`${action.charAt(0).toUpperCase() + action.slice(1)} a staged rollout`)
      .option("--track <track>", "Track name");

    if (action === "increase") {
      cmd.option("--to <percent>", "New rollout percentage");
      cmd.option("--vitals-gate", "Halt rollout if crash rate exceeds configured threshold");
    }

    cmd.option(
      "--changes-not-sent-for-review",
      "Commit changes without sending for review (required for rejected apps)",
    );
    cmd.option(
      "--error-if-in-review",
      "Fail if changes are already in review instead of cancelling them",
    );

    cmd.action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const interactive = isInteractive(program);
      const tracks = ["internal", "alpha", "beta", "production"];

      options.track = await requireOption(
        "track",
        options.track,
        {
          message: "Track:",
          choices: tracks,
        },
        interactive,
      );

      if (action === "increase") {
        options.to = await requireOption(
          "to",
          options.to,
          {
            message: "New rollout percentage (1-100):",
          },
          interactive,
        );
      }

      if (action === "increase" && options.to !== undefined) {
        const to = Number(options.to);
        if (!Number.isFinite(to) || to < 1 || to > 100) {
          throw new GpcError(
            `--to must be a number between 1 and 100 (got: ${options.to})`,
            "RELEASES_USAGE_ERROR",
            2,
            "Use a percentage between 1 and 100.",
          );
        }
      }

      // Require confirmation for destructive rollout halt
      if (action === "halt") {
        await requireConfirm(
          `Halt rollout on track "${options.track}" for ${packageName}?`,
          program,
        );
      }

      if (isDryRun(program)) {
        if (action === "increase" && options.vitalsGate) {
          console.error(
            "Warning: --vitals-gate is ignored in --dry-run mode. Gate will run on live execution.",
          );
        }
        printDryRun(
          {
            command: `releases rollout ${action}`,
            action: action,
            target: options.track,
            details: { percentage: options.to !== undefined ? `${options.to}%` : undefined },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      // Vitals gate: check crash rate BEFORE rollout increase
      if (action === "increase" && options.vitalsGate) {
        const threshold = config.vitals?.thresholds?.crashRate;
        if (!threshold) {
          console.error(
            "Warning: --vitals-gate requires vitals.thresholds.crashRate in config. Skipping gate.",
          );
        } else {
          try {
            const { auth: authConfig } = config;
            const vitalsAuth = await resolveAuth({
              serviceAccountPath: authConfig?.serviceAccount,
            });
            const reportingClient = createReportingClient({ auth: vitalsAuth });
            const vitalsResult = await getVitalsCrashes(reportingClient, packageName, {
              days: 1,
            });
            const latestRow = vitalsResult.rows?.[vitalsResult.rows.length - 1];
            const firstMetric = latestRow?.metrics ? Object.keys(latestRow.metrics)[0] : undefined;
            const latest = firstMetric
              ? Number(latestRow?.metrics[firstMetric]?.decimalValue?.value)
              : undefined;
            const check = checkThreshold(latest, threshold / 100);
            if (check.breached) {
              const pct = latest !== undefined ? (latest * 100).toFixed(3) : "unknown";
              console.error(
                `Vitals gate: crash rate ${pct}% > threshold ${String(threshold)}%. Rollout increase blocked.`,
              );
              process.exitCode = 6;
              return;
            }
          } catch (vitalsErr) {
            console.error(
              `Warning: Vitals gate check failed: ${vitalsErr instanceof Error ? vitalsErr.message : String(vitalsErr)}`,
            );
          }
        }
      }

      const result = await updateRollout(
        client,
        packageName,
        options.track,
        action,
        options.to ? Number(options.to) / 100 : undefined,
        buildCommitOptions(options),
      );

      console.log(formatOutput(result, format));
    });
  }

  // Release notes
  releases
    .command("notes")
    .description("Get or set release notes")
    .argument("<action>", "Action: get|set")
    .option("--track <track>", "Track name")
    .option("--lang <language>", "Language code", "en-US")
    .option("--notes <text>", "Release notes text")
    .option("--file <path>", "Read notes from file")
    .action(async (action: string, options) => {
      if (action === "set") {
        throw new GpcError(
          "gpc releases notes set is not implemented as a standalone command.",
          "RELEASES_USAGE_ERROR",
          1,
          "Use --notes, --notes-dir, or --notes-from-git with: gpc releases upload or gpc publish",
        );
      }

      if (action === "get") {
        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const client = await getClient(config);
        const format = getOutputFormat(program, config);
        const track = options.track ?? "internal";

        // Try getReleasesStatus first (has all releases), then fallback to fetchReleaseNotes
        const statuses = await getReleasesStatus(client, packageName, track);
        let notes = Array.isArray(statuses)
          ? statuses.flatMap((s: ReleaseStatusResult) => s.releaseNotes ?? [])
          : ((statuses as unknown as ReleaseStatusResult).releaseNotes ?? []);

        // Fallback: fetchReleaseNotes reads the raw track data which may have notes
        // even when getReleasesStatus doesn't (e.g. completed releases)
        if (notes.length === 0) {
          try {
            notes = await fetchReleaseNotes(client, packageName, track);
          } catch {
            // No release found on track — fall through to empty message
          }
        }

        if (notes.length === 0) {
          console.log(`No release notes found on track "${track}".`);
          return;
        }
        console.log(formatOutput(notes, format));
        return;
      }

      throw new GpcError(
        "Unknown action. Usage: gpc releases notes <get|set> --track <track>",
        "RELEASES_USAGE_ERROR",
        2,
        "Use: gpc releases notes get --track <track>",
      );
    });

  // Upload externally hosted APK
  releases
    .command("upload-external")
    .description("Upload an externally hosted APK configuration")
    .requiredOption("--url <url>", "External URL where the APK is hosted")
    .requiredOption("--file <config>", "Path to JSON config file with APK metadata")
    .action(async (options: { url: string; file: string }) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      const { readFile } = await import("node:fs/promises");
      const raw = await readFile(options.file, "utf-8");
      const apkConfig = JSON.parse(raw) as Record<string, unknown>;

      // Override with CLI-provided URL
      apkConfig["externallyHostedUrl"] = options.url;

      const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
      const client = createApiClient({ auth });
      const result = await uploadExternallyHosted(
        client,
        packageName,
        apkConfig as unknown as ExternallyHostedApk,
      );
      console.log(formatOutput(result, format));
    });

  // Diff
  releases
    .command("diff")
    .description("Compare releases between two tracks")
    .option("--from <track>", "Source track", "internal")
    .option("--to <track>", "Target track", "production")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const result = await diffReleases(client, packageName, options.from, options.to);
      if (result.diffs.length === 0) {
        console.log(`No differences between ${result.fromTrack} and ${result.toTrack}.`);
      } else {
        if (format === "json") {
          console.log(formatOutput(result, format));
        } else {
          console.log(`Differences: ${result.fromTrack} vs ${result.toTrack}\n`);
          console.log(formatOutput(result.diffs, format));
        }
      }
    });

  // Count
  releases
    .command("count")
    .description("Count releases per track")
    .option("--track <track>", "Filter to a specific track")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const statuses = await getReleasesStatus(client, packageName, options.track);

      // Group by track
      const trackCounts = new Map<string, { total: number; statuses: Record<string, number> }>();
      for (const r of statuses) {
        const entry = trackCounts.get(r.track) ?? { total: 0, statuses: {} };
        entry.total++;
        entry.statuses[r.status] = (entry.statuses[r.status] ?? 0) + 1;
        trackCounts.set(r.track, entry);
      }

      if (format === "json") {
        const data = Object.fromEntries(
          [...trackCounts.entries()].map(([track, info]) => [track, info]),
        );
        console.log(formatOutput(data, format));
      } else {
        const rows = [...trackCounts.entries()].map(([track, info]) => ({
          track,
          releases: info.total,
          ...info.statuses,
        }));
        if (rows.length === 0) {
          console.log("No releases found.");
        } else {
          console.log(formatOutput(rows, format));
        }
      }
    });
}
