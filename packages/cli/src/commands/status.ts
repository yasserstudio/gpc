import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
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
  formatOutput,
} from "@gpc-cli/core";
import type { AppStatus } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

const VALID_SECTIONS = new Set(["releases", "vitals", "reviews"]);
const VALID_FORMATS = new Set(["table", "summary"]);

function parseSections(raw: string): string[] {
  const sections = raw.split(",").map((s) => s.trim().toLowerCase());
  for (const s of sections) {
    if (!VALID_SECTIONS.has(s)) {
      console.error(`Error: Unknown section "${s}". Valid sections: releases, vitals, reviews`);
      process.exit(2);
    }
  }
  return sections;
}

function resolveVitalThresholds(config: Record<string, unknown>) {
  const vitals = config["vitals"] as Record<string, unknown> | undefined;
  const t = vitals?.["thresholds"] as Record<string, unknown> | undefined;
  if (!t) return undefined;
  const toN = (v: unknown): number | undefined => {
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  };
  return {
    crashRate: toN(t["crashRate"]),
    anrRate: toN(t["anrRate"]),
    slowStartRate: toN(t["slowStartRate"]),
    slowRenderingRate: toN(t["slowRenderingRate"]),
  };
}

function resolvePackages(
  program: Command,
  config: { app?: string; profiles?: Record<string, { app?: string }> },
  allApps?: boolean,
): string[] {
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

function resolveWatchInterval(watch: string | boolean | undefined): number | null {
  if (watch === undefined) return null;
  if (watch === true || watch === "") return 30;
  const n = parseInt(String(watch), 10);
  return isNaN(n) ? 30 : n;
}

function makeRenderer(
  format: string,
  displayFormat: string,
): (status: AppStatus) => string {
  return (status: AppStatus): string => {
    if (format === "json") return formatOutput(status, "json");
    if (displayFormat === "summary") return formatStatusSummary(status);
    return formatStatusTable(status);
  };
}

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Unified app health snapshot: releases, vitals, and reviews")
    .option("--days <n>", "Vitals window in days", (v) => parseInt(v, 10), 7)
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
    .option("--all-apps", "Run status for all configured app profiles (max 5)")
    .option("--notify", "Send desktop notification on threshold breach or clear")
    .action(
      async (opts: {
        days: number;
        cached?: boolean;
        refresh?: boolean;
        ttl: number;
        format: string;
        sections: string;
        watch?: string | boolean;
        sinceLast?: boolean;
        allApps?: boolean;
        notify?: boolean;
      }) => {
        if (!VALID_FORMATS.has(opts.format)) {
          console.error(`Error: Unknown format "${opts.format}". Valid: table, summary`);
          process.exit(2);
        }

        const sections = parseSections(opts.sections);
        const config = await loadConfig();
        const format = getOutputFormat(program, config);
        const render = makeRenderer(format, opts.format);
        const vitalThresholds = resolveVitalThresholds(
          config as unknown as Record<string, unknown>,
        );
        const watchInterval = resolveWatchInterval(opts.watch);
        const packages = resolvePackages(program, config, opts.allApps);

        if (packages.length === 0) {
          console.error(
            "Error: No package name. Use --app <package> or gpc config set app <package>",
          );
          process.exit(2);
        }
        if (opts.allApps && packages.length > 5) {
          console.error(
            `Error: --all-apps found ${packages.length} apps (max 5). Use --app to target a specific app.`,
          );
          process.exit(2);
        }

        const authConfig = (config as unknown as Record<string, unknown>)["auth"] as
          | Record<string, string>
          | undefined;

        const makeClients = async () => {
          const auth = await resolveAuth({ serviceAccountPath: authConfig?.["serviceAccount"] });
          return {
            client: createApiClient({ auth }),
            reporting: createReportingClient({ auth }),
          };
        };

        let anyBreach = false;

        for (const packageName of packages) {
          if (packages.length > 1) console.log(`\n=== ${packageName} ===`);

          try {
            const breach = await runStatusForPackage({
              packageName,
              opts,
              sections,
              format,
              vitalThresholds,
              watchInterval,
              render,
              makeClients,
            });
            if (breach) anyBreach = true;
          } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            if (packages.length === 1) process.exit(4);
            // For --all-apps, continue to next app on error
          }
        }

        if (anyBreach) process.exit(6);
      },
    );
}

interface RunCtx {
  packageName: string;
  opts: {
    days: number;
    cached?: boolean;
    refresh?: boolean;
    ttl: number;
    sinceLast?: boolean;
    notify?: boolean;
  };
  sections: string[];
  format: string;
  vitalThresholds:
    | {
        crashRate?: number;
        anrRate?: number;
        slowStartRate?: number;
        slowRenderingRate?: number;
      }
    | undefined;
  watchInterval: number | null;
  render: (status: AppStatus) => string;
  makeClients: () => Promise<{
    client: ReturnType<typeof createApiClient>;
    reporting: ReturnType<typeof createReportingClient>;
  }>;
}

/** Returns true if a breach was detected. */
async function runStatusForPackage(ctx: RunCtx): Promise<boolean> {
  const { packageName, opts, sections, vitalThresholds, watchInterval, render } = ctx;

  const fetchLive = async (): Promise<AppStatus> => {
    const { client, reporting } = await ctx.makeClients();
    return getAppStatus(client, reporting, packageName, {
      days: opts.days,
      sections,
      vitalThresholds: vitalThresholds ?? undefined,
    });
  };

  const save = (status: AppStatus) => saveStatusCache(packageName, status, opts.ttl);

  // --watch: hand off entirely to runWatchLoop
  if (watchInterval !== null) {
    await runWatchLoop({ intervalSeconds: watchInterval, render, fetch: fetchLive, save });
    return false;
  }

  // --cached: serve from cache only
  if (opts.cached) {
    const cached = await loadStatusCache(packageName, opts.ttl);
    if (!cached) {
      console.error("Error: No cached status found. Run without --cached to fetch live data.");
      process.exit(1);
    }
    console.log(render(cached));
    await handleNotify(packageName, cached, opts.notify);
    return statusHasBreach(cached);
  }

  // Capture prev status before fetching (for --since-last)
  const prevStatus = opts.sinceLast ? await loadStatusCache(packageName, Infinity) : null;

  // Try cache (unless --refresh)
  if (!opts.refresh) {
    const cached = await loadStatusCache(packageName, opts.ttl);
    if (cached) {
      printWithDiff(cached, prevStatus, opts.sinceLast, render, ctx.format);
      await handleNotify(packageName, cached, opts.notify);
      return statusHasBreach(cached);
    }
  }

  // Live fetch
  const status = await fetchLive();
  await save(status);

  printWithDiff(status, prevStatus, opts.sinceLast, render, ctx.format);
  await handleNotify(packageName, status, opts.notify);
  return statusHasBreach(status);
}

function printWithDiff(
  status: AppStatus,
  prevStatus: AppStatus | null,
  sinceLast: boolean | undefined,
  render: (s: AppStatus) => string,
  format: string,
): void {
  console.log(render(status));

  if (sinceLast && prevStatus) {
    const since = new Date(prevStatus.fetchedAt).toLocaleString();
    console.log("");
    console.log(formatStatusDiff(computeStatusDiff(prevStatus, status), since));
  } else if (sinceLast && !prevStatus && format !== "json") {
    console.log("\n(No prior cached status to diff against)");
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
