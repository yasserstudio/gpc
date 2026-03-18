import { appendFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { GpcConfig } from "@gpc-cli/config";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient, createReportingClient } from "@gpc-cli/api";
import type { RetryLogEntry, ExternallyHostedApk } from "@gpc-cli/api";
import {
  uploadRelease,
  getReleasesStatus,
  promoteRelease,
  updateRollout,
  readReleaseNotesFromDir,
  generateNotesFromGit,
  writeAuditLog,
  createAuditEntry,
  uploadExternallyHosted,
  diffReleases,
  getVitalsCrashes,
  checkThreshold,
} from "@gpc-cli/core";
import { formatOutput, sortResults, createSpinner } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { isInteractive, promptSelect, promptInput, requireOption, requireConfirm } from "../prompt.js";

function resolvePackageName(packageArg: string | undefined, config: GpcConfig): string {
  const name = packageArg || config.app;
  if (!name) {
    console.error("Error: No package name. Use --app <package> or gpc config set app <package>");
    process.exit(2);
  }
  return name;
}

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
    .option("--since <ref>", "Git ref to start from (tag, SHA) — used with --notes-from-git")
    .option("--retry-log <path>", "Write retry log entries to file (JSONL)")
    .option("--timeout <ms>", "Upload timeout in milliseconds (auto-scales with file size by default)", parseInt)
    .action(async (file: string, options) => {
      try {
        await stat(file);
      } catch {
        console.error(`Error: File not found: ${file}`);
        process.exit(2);
      }

      const ext = extname(file).toLowerCase();
      if (ext !== ".aab" && ext !== ".apk") {
        console.error(`Error: Expected .aab or .apk file, got "${ext || "(no extension)"}"`);
        process.exit(2);
      }

      const noteSources = [options.notes, options.notesDir, options.notesFromGit].filter(Boolean);
      if (noteSources.length > 1) {
        console.error("Error: Cannot combine --notes, --notes-dir, and --notes-from-git. Use only one.");
        process.exit(2);
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
          console.error(`Error: --rollout must be a number between 1 and 100 (got: ${options.rollout})`);
          process.exit(2);
        }
      }

      const { size: fileSize } = await stat(file);
      const jsonMode = format === "json";
      const client = await getClient(config, options.retryLog, options.timeout);

      // The API layer buffers the full file before sending, so byte-level streaming progress
      // isn't available. Use a time-based animation instead.
      const showProgress = !jsonMode && process.stderr.isTTY && !program.opts()["quiet"];
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      let progressInterval: ReturnType<typeof setInterval> | undefined;
      if (showProgress) {
        let frame = 0;
        const startTime = Date.now();
        progressInterval = setInterval(() => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          process.stderr.write(`\r  ${FRAMES[frame % FRAMES.length]} Uploading ${basename(file)}  ${sizeMB} MB  (${elapsed}s)  `);
          frame++;
        }, 120);
      }
      const onProgress = undefined;

      if (isDryRun(program)) {
        try {
          const result = await uploadRelease(client, packageName, file, {
            track: options.track,
            userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
            dryRun: true,
          });
          console.log(formatOutput(result, format));
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(4);
        }
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
        if (options.notesFromGit) {
          const gitNotes = await generateNotesFromGit({ since: options.since });
          releaseNotes = [{ language: gitNotes.language, text: gitNotes.text }];
        } else if (options.notesDir) {
          releaseNotes = await readReleaseNotesFromDir(options.notesDir);
        } else if (options.notes) {
          releaseNotes = [{ language: "en-US", text: options.notes }];
        }

        const result = await uploadRelease(client, packageName, file, {
          track: options.track,
          userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
          releaseNotes,
          releaseName: options.name,
          mappingFile: options.mapping,
          onProgress,
        });
        if (progressInterval) { clearInterval(progressInterval); process.stderr.write(`\r  ✓ Uploaded ${basename(file)}  ${sizeMB} MB\n`); }
        spinner.stop("Upload complete");
        console.log(formatOutput(result, format));
        auditEntry.success = true;
      } catch (error) {
        if (progressInterval) { clearInterval(progressInterval); process.stderr.write("\n"); }
        spinner.fail("Upload failed");
        auditEntry.success = false;
        auditEntry.error = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
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

      try {
        const TRACK_ORDER = ["production", "beta", "alpha", "internal"];
        const rawStatuses = await getReleasesStatus(client, packageName, options.track);
        const statuses = options.track
          ? (Array.isArray(rawStatuses) ? rawStatuses.filter((s: any) => s.track === options.track) : rawStatuses)
          : rawStatuses;
        const sorted = Array.isArray(statuses)
          ? options.sort
            ? sortResults(statuses, options.sort)
            : [...statuses].sort((a, b) => {
                const ai = TRACK_ORDER.indexOf(String((a as Record<string, unknown>)["track"] ?? ""));
                const bi = TRACK_ORDER.indexOf(String((b as Record<string, unknown>)["track"] ?? ""));
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
              })
          : statuses;
        if (format !== "json" && Array.isArray(sorted)) {
          const rows = sorted.map((s: Record<string, unknown>) => ({
            track: s["track"] || "-",
            status: s["status"] || "-",
            name: s["name"] || "-",
            versionCodes: Array.isArray(s["versionCodes"]) ? (s["versionCodes"] as unknown[]).join(", ") : "-",
            userFraction: s["userFraction"] !== undefined
              ? `${Math.round(Number(s["userFraction"]) * 100)}%`
              : "—",
          }));
          console.log(formatOutput(rows, format));
        } else {
          console.log(formatOutput(sorted, format));
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
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
    .action(async (options) => {
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
        console.error(`Error: --from and --to must be different tracks (both are "${options.from}")`);
        process.exit(2);
      }

      if (options.rollout !== undefined) {
        const rollout = Number(options.rollout);
        if (!Number.isFinite(rollout) || rollout < 1 || rollout > 100) {
          console.error(`Error: --rollout must be a number between 1 and 100 (got: ${options.rollout})`);
          process.exit(2);
        }
      }

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "releases promote",
            action: "promote",
            target: `${options.from} → ${options.to}`,
            details: { rollout: options.rollout },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getClient(config);

      try {
        const result = await promoteRelease(client, packageName, options.from, options.to, {
          userFraction: options.rollout ? Number(options.rollout) / 100 : undefined,
          releaseNotes: options.notes ? [{ language: "en-US", text: options.notes }] : undefined,
        });
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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
          console.error(`Error: --to must be a number between 1 and 100 (got: ${options.to})`);
          process.exit(2);
        }
      }

      // Require confirmation for destructive rollout halt
      if (action === "halt") {
        await requireConfirm(`Halt rollout on track "${options.track}" for ${packageName}?`, program);
      }

      if (isDryRun(program)) {
        if (action === "increase" && options.vitalsGate) {
          console.error("Warning: --vitals-gate is ignored in --dry-run mode. Gate will run on live execution.");
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

      try {
        const result = await updateRollout(
          client,
          packageName,
          options.track,
          action,
          options.to ? Number(options.to) / 100 : undefined,
        );

        // Vitals gate: check crash rate after rollout increase
        if (action === "increase" && options.vitalsGate) {
          const threshold = (config as any).vitals?.thresholds?.crashRate;
          if (!threshold) {
            console.error("Warning: --vitals-gate requires vitals.thresholds.crashRate in config. Skipping gate.");
          } else {
            try {
              const { auth: authConfig } = config;
              const vitalsAuth = await resolveAuth({ serviceAccountPath: authConfig?.serviceAccount });
              const reportingClient = createReportingClient({ auth: vitalsAuth });
              const vitalsResult = await getVitalsCrashes(reportingClient, packageName, { days: 1 });
              const latest = (vitalsResult as any).data?.[0]?.crashRate;
              const check = checkThreshold(latest, threshold);
              if (check.breached) {
                await updateRollout(client, packageName, options.track, "halt");
                console.error(`Vitals gate: crash rate ${String(latest)}% > threshold ${String(threshold)}%. Rollout halted.`);
                process.exit(6);
              }
            } catch (vitalsErr) {
              console.error(`Warning: Vitals gate check failed: ${vitalsErr instanceof Error ? vitalsErr.message : String(vitalsErr)}`);
            }
          }
        }

        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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
        console.error(
          "Error: gpc releases notes set is not implemented as a standalone command.\n" +
          "Use --notes, --notes-dir, or --notes-from-git with:\n" +
          "  gpc releases upload\n" +
          "  gpc publish"
        );
        process.exit(1);
      }

      if (action === "get") {
        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const client = await getClient(config);
        const format = getOutputFormat(program, config);
        const track = options.track ?? "internal";
        const statuses = await getReleasesStatus(client, packageName, track);
        const notes = Array.isArray(statuses)
          ? statuses.flatMap((s: any) => s.releaseNotes ?? [])
          : (statuses as any).releaseNotes ?? [];
        if (notes.length === 0) {
          console.log("No release notes found.");
          return;
        }
        console.log(formatOutput(notes, format));
        return;
      }

      console.error("Usage: gpc releases notes <get|set> --track <track>");
      process.exit(2);
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

      try {
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
          apkConfig as ExternallyHostedApk,
        );
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
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

      try {
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
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
