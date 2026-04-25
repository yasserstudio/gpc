import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient, createReportingClient } from "@gpc-cli/api";
import { runWatch, VALID_WATCH_METRICS, DEFAULT_WATCH_THRESHOLDS } from "@gpc-cli/core";
import type { WatchMetric, WatchAction, WatchEvent, WatchSummary } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { green, red, yellow, dim } from "../colors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMetrics(raw: string): WatchMetric[] {
  const metrics = raw.split(",").map((s) => s.trim()) as WatchMetric[];
  for (const m of metrics) {
    if (!VALID_WATCH_METRICS.has(m)) {
      throw Object.assign(
        new Error(`Unknown metric "${m}". Valid: ${[...VALID_WATCH_METRICS].join(", ")}`),
        { code: "WATCH_USAGE_ERROR", exitCode: 2 },
      );
    }
  }
  return metrics;
}

function parseActions(raw: string): WatchAction[] {
  const valid = new Set<WatchAction>(["notify", "halt", "webhook"]);
  const actions = raw.split(",").map((s) => s.trim()) as WatchAction[];
  for (const a of actions) {
    if (!valid.has(a)) {
      throw Object.assign(new Error(`Unknown action "${a}". Valid: notify, halt, webhook`), {
        code: "WATCH_USAGE_ERROR",
        exitCode: 2,
      });
    }
  }
  return actions;
}

function pct(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function rolloutPct(fraction: number | null): string {
  if (fraction === null) return "100%";
  return `${(fraction * 100).toFixed(0)}%`;
}

function formatHumanEvent(event: WatchEvent): string {
  const ts = new Date(event.timestamp).toLocaleTimeString();
  const lines: string[] = [];

  lines.push(`[${ts}] Round ${event.round}`);

  if (event.rollout) {
    const r = event.rollout;
    lines.push(`  Rollout: v${r.versionCode} at ${rolloutPct(r.userFraction)} (${r.status})`);
  } else {
    lines.push(`  Rollout: no active release`);
  }

  for (const [metric, reading] of Object.entries(event.vitals)) {
    if (!reading) continue;
    const val = pct(reading.value);
    const thresh = reading.threshold !== undefined ? pct(reading.threshold) : "—";
    const label = reading.breached ? red("BREACH") : green("OK");
    lines.push(`  ${metric}: ${val} (threshold: ${thresh}) ${label}`);
  }

  if (event.halted) {
    lines.push(red(`  ! Rollout halted due to threshold breach.`));
  } else if (event.breaches.length > 0) {
    lines.push(yellow(`  ! ${event.breaches.join(", ")} breached threshold.`));
  }

  return lines.join("\n");
}

function formatHumanSummary(summary: WatchSummary): string {
  const duration = formatDuration(summary.durationMs);
  const parts = [
    `\nSummary: ${summary.rounds} round${summary.rounds !== 1 ? "s" : ""} over ${duration}.`,
  ];
  if (summary.breachCount > 0) {
    parts.push(`${summary.breachCount} breach${summary.breachCount !== 1 ? "es" : ""}.`);
  } else {
    parts.push("No breaches.");
  }
  if (summary.halted) {
    parts.push("Rollout halted.");
  } else if (summary.finalRollout === null) {
    parts.push("Rollout at 100%.");
  } else {
    parts.push(`Rollout at ${rolloutPct(summary.finalRollout)}.`);
  }
  return parts.join(" ");
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerWatchCommand(program: Command): void {
  program
    .command("watch")
    .description("Monitor a rollout with real-time vitals and threshold alerts")
    .option("--track <name>", "Track to watch", "production")
    .option("--metrics <csv>", "Comma-separated metrics to monitor", "crashes,anr")
    .option("--interval <seconds>", "Poll interval in seconds (min 60)", "900")
    .option("--rounds <n>", "Stop after N rounds (default: run until Ctrl+C)")
    .option("--crash-threshold <pct>", "Crash rate threshold (e.g. 0.02 for 2%)")
    .option("--anr-threshold <pct>", "ANR rate threshold (e.g. 0.01 for 1%)")
    .option("--lmk-threshold <pct>", "LMK rate threshold")
    .option("--slow-start-threshold <pct>", "Slow start rate threshold")
    .option("--slow-render-threshold <pct>", "Slow rendering rate threshold")
    .option("--error-count-threshold <n>", "Error report count threshold")
    .option(
      "--on-breach <actions>",
      "Actions on breach: notify, halt, webhook (comma-separated)",
      "notify",
    )
    .option("--webhook-url <url>", "Webhook URL for breach notifications")
    .action(async (opts, cmd) => {
      const config = await loadConfig();
      const format = getOutputFormat(cmd.parent ?? program, config);
      const jsonMode = format === "json";

      const rootOpts = (cmd.parent ?? program).opts();
      const packageName = (rootOpts["app"] || config.app) as string | undefined;

      if (!packageName) {
        throw Object.assign(new Error("No package name"), {
          code: "WATCH_USAGE_ERROR",
          exitCode: 2,
          suggestion: "Use --app <package> or run: gpc config set app <package>",
        });
      }

      const metrics = parseMetrics(opts["metrics"] as string);
      const actions = parseActions(opts["onBreach"] as string);
      const intervalSeconds = parseInt(opts["interval"] as string, 10);

      if (isNaN(intervalSeconds) || intervalSeconds < 60) {
        throw Object.assign(new Error("--interval must be at least 60 seconds"), {
          code: "WATCH_USAGE_ERROR",
          exitCode: 2,
        });
      }

      const rounds = opts["rounds"] ? parseInt(opts["rounds"] as string, 10) : null;
      if (rounds !== null && (isNaN(rounds) || rounds < 1)) {
        throw Object.assign(new Error("--rounds must be a positive integer"), {
          code: "WATCH_USAGE_ERROR",
          exitCode: 2,
        });
      }

      // Resolve thresholds: CLI flags > config > defaults
      const configThresholds = (config as unknown as Record<string, unknown>)["vitals"] as
        | { thresholds?: Record<string, number> }
        | undefined;

      const thresholds: Partial<Record<WatchMetric, number>> = {
        ...DEFAULT_WATCH_THRESHOLDS,
      };
      if (configThresholds?.thresholds) {
        const ct = configThresholds.thresholds;
        if (ct["crashRate"] !== undefined) thresholds.crashes = ct["crashRate"];
        if (ct["anrRate"] !== undefined) thresholds.anr = ct["anrRate"];
        if (ct["lmkRate"] !== undefined) thresholds.lmk = ct["lmkRate"];
        if (ct["slowStartRate"] !== undefined) thresholds.slowStarts = ct["slowStartRate"];
        if (ct["slowRenderingRate"] !== undefined) thresholds.slowRender = ct["slowRenderingRate"];
      }
      if (opts["crashThreshold"]) thresholds.crashes = parseFloat(opts["crashThreshold"]);
      if (opts["anrThreshold"]) thresholds.anr = parseFloat(opts["anrThreshold"]);
      if (opts["lmkThreshold"]) thresholds.lmk = parseFloat(opts["lmkThreshold"]);
      if (opts["slowStartThreshold"])
        thresholds.slowStarts = parseFloat(opts["slowStartThreshold"]);
      if (opts["slowRenderThreshold"])
        thresholds.slowRender = parseFloat(opts["slowRenderThreshold"]);
      if (opts["errorCountThreshold"])
        thresholds.errorCount = parseFloat(opts["errorCountThreshold"]);

      const webhookUrl =
        (opts["webhookUrl"] as string | undefined) ??
        (
          (config as unknown as Record<string, unknown>)["webhooks"] as
            | Record<string, string>
            | undefined
        )?.["watch"];

      if (actions.includes("webhook") && !webhookUrl) {
        throw Object.assign(new Error("--webhook-url is required when using --on-breach webhook"), {
          code: "WATCH_USAGE_ERROR",
          exitCode: 2,
          suggestion: "Provide --webhook-url <url> or set webhooks.watch in .gpcrc.json",
        });
      }

      const auth = await resolveAuth({
        serviceAccountPath: config.auth?.serviceAccount,
      });
      const client = createApiClient({ auth });
      const reporting = createReportingClient({ auth });

      if (!jsonMode) {
        console.log(`gpc watch ${dim("—")} ${packageName} (${opts["track"]} track)`);
        console.log(
          dim("Vitals data is typically 24-48h behind. Rollout status is near real-time.\n"),
        );
      }

      const summary = await runWatch(
        client,
        reporting,
        {
          packageName,
          track: opts["track"] as string,
          intervalSeconds,
          metrics,
          thresholds,
          maxRounds: rounds,
          actions,
          webhookUrl,
        },
        {
          onEvent(event: WatchEvent) {
            if (jsonMode) {
              console.log(JSON.stringify(event));
            } else {
              console.log(formatHumanEvent(event));
              console.log("");
            }
          },
          async onBreach(_event: WatchEvent) {
            // breach actions handled inside runWatch via handleBreach
          },
          onComplete(s: WatchSummary) {
            if (jsonMode) {
              console.log(JSON.stringify({ type: "summary", ...s }));
            } else {
              console.log(formatHumanSummary(s));
            }
          },
        },
      );

      process.exitCode = summary.breachCount > 0 ? 6 : 0;
    });
}
