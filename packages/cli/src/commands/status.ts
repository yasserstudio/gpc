import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import type { ResolvedConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient, createReportingClient } from "@gpc-cli/api";
import {
  getAppStatus,
  formatStatusTable,
  formatStatusSummary,
  formatStatusDiff,
  computeStatusDiff,
  loadStatusCache,
  saveStatusCache,
  statusHasBreach,
  runWatchLoop,
  trackBreachState,
  sendNotification,
  relativeTime,
  formatOutput,
  createSpinner,
  assertRateThreshold,
  GpcError,
} from "@gpc-cli/core";
import type { AppStatus } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { green, red, dim, gray } from "../colors.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_SECTIONS = new Set(["releases", "vitals", "reviews"]);
const VALID_FORMATS = new Set(["table", "summary"]);
const MAX_ALL_APPS = 5;

const THRESHOLD_KEYS: Record<string, string> = {
  crashes: "crashRate",
  crash: "crashRate",
  anr: "anrRate",
  "slow-starts": "slowStartRate",
  "slow-start": "slowStartRate",
  "slow-render": "slowRenderingRate",
  "slow-rendering": "slowRenderingRate",
};

// ---------------------------------------------------------------------------
// Validation error helper
// ---------------------------------------------------------------------------

function usageError(message: string, suggestion?: string): never {
  throw Object.assign(new Error(message), {
    code: "STATUS_USAGE_ERROR",
    exitCode: 2,
    suggestion,
  });
}

// ---------------------------------------------------------------------------
// Pure, testable helpers
// ---------------------------------------------------------------------------

export function parseSections(raw: string): string[] {
  const sections = raw.split(",").map((s) => s.trim().toLowerCase());
  for (const s of sections) {
    if (!VALID_SECTIONS.has(s)) {
      usageError(`Unknown section "${s}"`, "Valid sections: releases, vitals, reviews");
    }
  }
  return sections;
}

export function parseThresholdOverrides(raw: string): VitalRateThresholds {
  const result: Record<string, number> = {};
  for (const pair of raw.split(",")) {
    const [key, val] = pair.split("=").map((s) => s.trim());
    if (!key || !val) continue;
    const mapped = THRESHOLD_KEYS[key.toLowerCase()];
    if (!mapped) {
      usageError(`Unknown threshold "${key}"`, "Valid: crashes, anr, slow-starts, slow-render");
    }
    // Percent here, unlike config fractions. 100% or more can never breach,
    // which would leave the gate silently open.
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0 || n >= 100) {
      throw new GpcError(
        `Invalid --threshold ${key}=${val}: expected a percent from 0 to under 100.`,
        "THRESHOLD_INVALID",
        2,
        `--threshold takes percent: ${key}=2 means 2%.`,
      );
    }
    result[mapped] = n / 100;
  }
  return result;
}

export function resolveWatchInterval(watch: string | boolean | undefined): number | null {
  if (watch === undefined) return null;
  if (watch === true || watch === "") return 30;
  const n = parseInt(String(watch), 10);
  return isNaN(n) ? 30 : n;
}

export interface VitalRateThresholds {
  crashRate?: number;
  anrRate?: number;
  slowStartRate?: number;
  slowRenderingRate?: number;
}

/**
 * Merges config `vitals.thresholds` (fractions) with already-parsed `--threshold`
 * overrides. An override wins over config, as in `gpc vitals`, so only config
 * values that are actually used are validated; an unusable one throws
 * THRESHOLD_INVALID rather than silently dropping the gate.
 */
export function resolveVitalThresholds(
  config: ResolvedConfig,
  overrides: VitalRateThresholds = {},
): VitalRateThresholds | undefined {
  const raw = config as unknown as Record<string, unknown>;
  const vitals = raw["vitals"] as Record<string, unknown> | undefined;
  const t = (vitals && typeof vitals === "object" ? vitals["thresholds"] : undefined) as
    Record<string, unknown> | undefined;
  const configured = t && typeof t === "object" ? t : {};
  if (!t && Object.keys(overrides).length === 0) return undefined;

  const rate = (key: keyof VitalRateThresholds): number | undefined => {
    if (overrides[key] !== undefined) return overrides[key];
    const v = configured[key];
    if (v === undefined || v === null) return undefined;
    // Number("") and Number(false) are 0, which would breach on any crash.
    const n = typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN;
    assertRateThreshold(`vitals.thresholds.${key}`, n);
    return n;
  };
  return {
    crashRate: rate("crashRate"),
    anrRate: rate("anrRate"),
    slowStartRate: rate("slowStartRate"),
    slowRenderingRate: rate("slowRenderingRate"),
  };
}

function resolvePackages(program: Command, config: ResolvedConfig, allApps?: boolean): string[] {
  const rootApp = (program.opts()["app"] || config.app) as string | undefined;
  if (!allApps) return rootApp ? [rootApp] : [];

  const seen = new Set<string>();
  const result: string[] = [];
  if (rootApp) {
    seen.add(rootApp);
    result.push(rootApp);
  }
  for (const profile of Object.values(config.profiles ?? {})) {
    if (profile.app && !seen.has(profile.app)) {
      seen.add(profile.app);
      result.push(profile.app);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function colorizeTrackStatus(s: string): string {
  switch (s) {
    case "inProgress":
    case "completed":
      return green(s);
    case "halted":
      return red(s);
    case "draft":
      return dim(s);
    default:
      return gray(s);
  }
}

function applyStatusColors(status: AppStatus): AppStatus {
  if (!status.releases || status.releases.length === 0) return status;
  return {
    ...status,
    releases: status.releases.map((r) => ({
      ...r,
      status: colorizeTrackStatus(r.status),
    })),
  };
}

function makeRenderer(
  format: string,
  displayFormat: string,
  includeDiff?: { prevStatus: AppStatus | null; sinceLast?: boolean },
): (status: AppStatus) => string {
  return (status: AppStatus): string => {
    if (format === "json") {
      const sectionSet = new Set(status.sections);
      const filtered: Record<string, unknown> = {
        packageName: status.packageName,
        fetchedAt: status.fetchedAt,
        cached: status.cached,
        sections: status.sections,
      };
      if (sectionSet.has("releases")) filtered["releases"] = status.releases;
      if (sectionSet.has("vitals")) filtered["vitals"] = status.vitals;
      if (sectionSet.has("reviews")) filtered["reviews"] = status.reviews;

      // Embed diff in JSON output when --since-last is used
      if (includeDiff?.sinceLast && includeDiff.prevStatus) {
        filtered["diff"] = computeStatusDiff(includeDiff.prevStatus, status);
        filtered["diffSince"] = includeDiff.prevStatus.fetchedAt;
      }

      return formatOutput(filtered, "json");
    }
    const colorized = applyStatusColors(status);
    if (displayFormat === "summary") return formatStatusSummary(colorized);
    return formatStatusTable(colorized);
  };
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Unified app health snapshot: releases, vitals, and reviews")
    .option("--days <n>", "Vitals window in days", (v) => parseInt(v, 10), 7)
    .option("--review-days <n>", "Reviews window in days", (v) => parseInt(v, 10), 30)
    .option("--full", "Add a topic/sentiment/keyword breakdown to the reviews section")
    .option("--cached", "Use last fetched data, skip API calls")
    .option("--refresh", "Force live fetch, ignore cache TTL")
    .option("--ttl <seconds>", "Cache TTL in seconds", (v) => parseInt(v, 10), 3600)
    .option("--format <fmt>", "Display style: table (default) or summary", "table")
    .option(
      "--sections <list>",
      "Comma-separated sections: releases,vitals,reviews",
      "releases,vitals,reviews",
    )
    .option("--watch [seconds]", "Poll every N seconds (min 10, default 30)")
    .option("--since-last", "Show diff from last cached status")
    .option("--all-apps", `Run status for all configured app profiles (max ${MAX_ALL_APPS})`)
    .option("--desktop-notify", "Send desktop notification on threshold breach or clear")
    .option(
      "--threshold <overrides>",
      "Override vitals thresholds in percent (crashes=1.5 means 1.5%); config thresholds are fractions",
    )
    .action(
      async (opts: {
        days: number;
        reviewDays: number;
        full?: boolean;
        cached?: boolean;
        refresh?: boolean;
        ttl: number;
        format: string;
        sections: string;
        watch?: string | boolean;
        sinceLast?: boolean;
        allApps?: boolean;
        threshold?: string;
        desktopNotify?: boolean;
      }) => {
        if (!VALID_FORMATS.has(opts.format)) {
          usageError(`Unknown format "${opts.format}"`, "Valid: table, summary");
        }

        const sections = parseSections(opts.sections);

        if (!Number.isFinite(opts.days) || opts.days < 1) {
          usageError(`--days must be a positive integer (got: ${opts.days})`);
        }

        if (!Number.isFinite(opts.reviewDays) || opts.reviewDays < 1) {
          usageError(`--review-days must be a positive integer (got: ${opts.reviewDays})`);
        }

        const config = await loadConfig();
        const format = getOutputFormat(program, config);
        const vitalThresholds = resolveVitalThresholds(
          config,
          opts.threshold ? parseThresholdOverrides(opts.threshold) : {},
        );
        const watchInterval = resolveWatchInterval(opts.watch);
        const packages = resolvePackages(program, config, opts.allApps);

        if (packages.length === 0) {
          usageError("No package name", "Use --app <package> or gpc config set app <package>");
        }
        if (opts.allApps && packages.length > MAX_ALL_APPS) {
          usageError(
            `--all-apps found ${packages.length} apps (max ${MAX_ALL_APPS})`,
            "Use --app to target a specific app",
          );
        }

        const authConfig = config.auth;

        const makeClients = async () => {
          const auth = await resolveAuth({
            serviceAccountPath: authConfig?.serviceAccount,
          });
          return {
            client: createApiClient({ auth }),
            reporting: createReportingClient({ auth }),
          };
        };

        let anyBreach = false;

        for (const packageName of packages) {
          if (packages.length > 1) {
            console.log(`\n=== ${packageName} ===`);
          }

          try {
            const breach = await runStatusForPackage({
              packageName,
              opts,
              sections,
              format,
              vitalThresholds,
              watchInterval,
              makeClients,
            });
            if (breach) anyBreach = true;
          } catch (error) {
            if (packages.length === 1) throw error;
            // For --all-apps, print error and continue to next app
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        if (anyBreach) process.exitCode = 6;
      },
    );
}

// ---------------------------------------------------------------------------
// Per-package status runner
// ---------------------------------------------------------------------------

interface RunCtx {
  packageName: string;
  opts: {
    days: number;
    reviewDays: number;
    full?: boolean;
    cached?: boolean;
    refresh?: boolean;
    ttl: number;
    format: string;
    sinceLast?: boolean;
    desktopNotify?: boolean;
  };
  sections: string[];
  format: string;
  vitalThresholds: VitalRateThresholds | undefined;
  watchInterval: number | null;
  makeClients: () => Promise<{
    client: ReturnType<typeof createApiClient>;
    reporting: ReturnType<typeof createReportingClient>;
  }>;
}

/** Override sections on a cached AppStatus with the user-requested sections for display. */
function applyDisplaySections(status: AppStatus, requestedSections: string[]): AppStatus {
  const requested = new Set(requestedSections);
  const filtered = status.sections.filter((s) => requested.has(s));
  if (filtered.length === status.sections.length) return status;
  return { ...status, sections: filtered };
}

/**
 * Whether a cached status can serve the current `--full` request without a live
 * fetch. False only when `--full` was asked for on the reviews section but the
 * cache has no analysis (it must be recomputed live — raw review text is not
 * cached). Exported for testing.
 */
export function cacheSatisfiesFull(
  cached: AppStatus,
  wantFull: boolean,
  requestedSections: string[],
): boolean {
  if (!wantFull || !requestedSections.includes("reviews")) return true;
  return cached.reviews.analysis !== undefined;
}

/**
 * Drop stale `--full` insights from a cached status when the current run did not
 * request them, so a plain `gpc status` after a `--full` run does not show
 * insights the user did not ask for. Exported for testing.
 */
export function stripStaleAnalysis(status: AppStatus, wantFull: boolean): AppStatus {
  if (wantFull || status.reviews.analysis === undefined) return status;
  const reviews = { ...status.reviews };
  delete reviews.analysis;
  return { ...status, reviews };
}

/** Returns true if a breach was detected. */
async function runStatusForPackage(ctx: RunCtx): Promise<boolean> {
  const { packageName, opts, sections, vitalThresholds, watchInterval } = ctx;

  const fetchLive = async (): Promise<AppStatus> => {
    const { client, reporting } = await ctx.makeClients();
    return getAppStatus(client, reporting, packageName, {
      days: opts.days,
      reviewDays: opts.reviewDays,
      sections,
      full: opts.full,
      vitalThresholds: vitalThresholds ?? undefined,
    });
  };

  const save = (status: AppStatus) => saveStatusCache(packageName, status, opts.ttl);

  // Capture prev status early (for --since-last)
  const prevStatus = opts.sinceLast ? await loadStatusCache(packageName, Infinity) : null;

  // Build the renderer — for JSON mode with --since-last, diff is embedded
  const render = makeRenderer(ctx.format, opts.format, {
    prevStatus,
    sinceLast: opts.sinceLast,
  });

  if (watchInterval !== null && opts.sinceLast) {
    process.stderr.write(
      "Warning: --since-last is not supported with --watch and will be ignored.\n",
    );
  }

  // --watch: hand off entirely to runWatchLoop
  if (watchInterval !== null) {
    await runWatchLoop({
      intervalSeconds: watchInterval,
      render,
      fetch: fetchLive,
      save,
      onStatus: (s) => handleNotify(packageName, s, opts.desktopNotify),
    });
    return false;
  }

  // --cached: serve from cache only (never fetches — cannot recompute --full)
  if (opts.cached) {
    const cached = await loadStatusCache(packageName, opts.ttl);
    if (!cached) {
      throw Object.assign(new Error("No cached status found"), {
        code: "STATUS_NO_CACHE",
        exitCode: 2,
        suggestion: "Run without --cached to fetch live data",
      });
    }
    if (!cacheSatisfiesFull(cached, !!opts.full, sections) && ctx.format !== "json") {
      process.stderr.write(
        "Tip: cached status has no --full insights. Run without --cached to compute them.\n",
      );
    }
    const display = applyDisplaySections(stripStaleAnalysis(cached, !!opts.full), sections);
    printWithDiff(display, prevStatus, opts.sinceLast, render, ctx.format);
    await handleNotify(packageName, cached, opts.desktopNotify);
    return statusHasBreach(cached);
  }

  // Try cache (unless --refresh). Skip the cache when --full needs an analysis
  // the cache lacks, so --full never silently no-ops against a stale entry.
  if (!opts.refresh) {
    const cached = await loadStatusCache(packageName, opts.ttl);
    if (cached && cacheSatisfiesFull(cached, !!opts.full, sections)) {
      const display = applyDisplaySections(stripStaleAnalysis(cached, !!opts.full), sections);
      if (ctx.format !== "json" && display.sections.length < cached.sections.length) {
        process.stderr.write(
          `Tip: cache contains all sections. Add --refresh to fetch only the requested sections and reduce API calls.\n`,
        );
      }
      printWithDiff(display, prevStatus, opts.sinceLast, render, ctx.format);
      await handleNotify(packageName, cached, opts.desktopNotify);
      return statusHasBreach(cached);
    }
  }

  // Live fetch (with spinner in TTY mode)
  const spinner = createSpinner("Fetching app status...");
  if (ctx.format !== "json") spinner.start();
  let status: AppStatus;
  try {
    status = await fetchLive();
  } catch (err) {
    spinner.fail("Failed to fetch app status");
    throw err;
  }
  spinner.stop("Done");
  await save(status);

  printWithDiff(status, prevStatus, opts.sinceLast, render, ctx.format);
  await handleNotify(packageName, status, opts.desktopNotify);
  return statusHasBreach(status);
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function printWithDiff(
  status: AppStatus,
  prevStatus: AppStatus | null,
  sinceLast: boolean | undefined,
  render: (s: AppStatus) => string,
  format: string,
): void {
  console.log(render(status));

  // In JSON mode, diff is embedded by makeRenderer — no extra text output
  if (format === "json") return;

  if (sinceLast && prevStatus) {
    const since = relativeTime(prevStatus.fetchedAt);
    console.log("");
    console.log(formatStatusDiff(computeStatusDiff(prevStatus, status), since));
  } else if (sinceLast && !prevStatus) {
    console.log("\n(No prior cached status to diff against)");
  }

  // Verification deadline awareness (auto-expires Sep 2026)
  if (Date.now() < new Date("2026-09-01").getTime()) {
    console.log("");
    console.log(dim("Verification: enforcement begins Sep 2026 (BR, ID, SG, TH) · gpc verify"));
  }
}

async function handleNotify(
  packageName: string,
  status: AppStatus,
  notify: boolean | undefined,
): Promise<void> {
  if (!notify) return;
  const breaching = statusHasBreach(status);
  const changed = await trackBreachState(packageName, breaching);
  if (changed) {
    const title = breaching ? "GPC Alert" : "GPC Status";
    const body = breaching
      ? `${packageName}: vitals threshold breached`
      : `${packageName}: vitals back to normal`;
    sendNotification(title, body);
  }
}
