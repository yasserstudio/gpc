import type { PlayApiClient, ReportingApiClient, VitalsMetricSet } from "@gpc-cli/api";
import { getReleasesStatus } from "./releases.js";
import { checkThreshold } from "./vitals.js";
import { trackBreachState, sendNotification } from "./status.js";
import { GpcError } from "../errors.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WatchMetric = "crashes" | "anr" | "lmk" | "slowStarts" | "slowRender" | "errorCount";

export type WatchAction = "notify" | "halt" | "webhook";

export interface WatchConfig {
  packageName: string;
  track: string;
  intervalSeconds: number;
  metrics: WatchMetric[];
  thresholds: Partial<Record<WatchMetric, number>>;
  maxRounds: number | null;
  actions: WatchAction[];
  webhookUrl?: string;
}

export interface WatchRollout {
  track: string;
  versionCode: string;
  userFraction: number | null;
  status: string;
}

export interface WatchVitalReading {
  value: number | undefined;
  threshold: number | undefined;
  breached: boolean;
}

export interface WatchEvent {
  round: number;
  timestamp: string;
  rollout: WatchRollout | null;
  vitals: Partial<Record<WatchMetric, WatchVitalReading>>;
  breaches: string[];
  halted: boolean;
}

export interface WatchSummary {
  rounds: number;
  durationMs: number;
  finalRollout: number | null;
  breachCount: number;
  halted: boolean;
  events: WatchEvent[];
}

export interface WatchCallbacks {
  onEvent: (event: WatchEvent) => void;
  onBreach: (event: WatchEvent) => Promise<void>;
  onComplete: (summary: WatchSummary) => void;
}

// ---------------------------------------------------------------------------
// Metric mapping
// ---------------------------------------------------------------------------

const METRIC_TO_SET: Record<WatchMetric, VitalsMetricSet> = {
  crashes: "crashRateMetricSet",
  anr: "anrRateMetricSet",
  lmk: "lmkRateMetricSet",
  slowStarts: "slowStartRateMetricSet",
  slowRender: "slowRenderingRateMetricSet",
  errorCount: "errorCountMetricSet",
};

const METRIC_KEY: Record<WatchMetric, string> = {
  crashes: "crashRate",
  anr: "anrRate",
  lmk: "userPerceivedLmkRate",
  slowStarts: "slowStartRate",
  slowRender: "slowRenderingRate",
  errorCount: "errorReportCount",
};

export const VALID_WATCH_METRICS = new Set<WatchMetric>([
  "crashes",
  "anr",
  "lmk",
  "slowStarts",
  "slowRender",
  "errorCount",
]);

export const DEFAULT_WATCH_THRESHOLDS: Partial<Record<WatchMetric, number>> = {
  crashes: 0.02,
  anr: 0.01,
  lmk: 0.03,
  slowStarts: 0.05,
  slowRender: 0.1,
};

// ---------------------------------------------------------------------------
// Vitals query (1-day window for freshest data)
// ---------------------------------------------------------------------------

async function queryWatchMetric(
  reporting: ReportingApiClient,
  packageName: string,
  metric: WatchMetric,
): Promise<number | undefined> {
  const metricSet = METRIC_TO_SET[metric];
  const metricKey = METRIC_KEY[metric];

  const DAY_MS = 24 * 60 * 60 * 1000;
  const end = new Date(Date.now() - 2 * DAY_MS);
  const start = new Date(end.getTime() - 7 * DAY_MS);

  const toDate = (d: Date) => ({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });

  try {
    const result = await reporting.queryMetricSet(packageName, metricSet, {
      metrics: [metricKey, "distinctUsers"],
      timelineSpec: {
        aggregationPeriod: "DAILY",
        startTime: toDate(start),
        endTime: toDate(end),
      },
    });

    if (!result.rows || result.rows.length === 0) return undefined;
    const values = result.rows
      .map((row) => {
        const val = row.metrics[metricKey]?.decimalValue?.value;
        return val !== undefined ? Number(val) : NaN;
      })
      .filter((v) => !isNaN(v));
    if (values.length === 0) return undefined;
    return values.reduce((a, b) => a + b, 0) / values.length;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Rollout fetch
// ---------------------------------------------------------------------------

async function fetchRollout(
  client: PlayApiClient,
  packageName: string,
  track: string,
): Promise<WatchRollout | null> {
  try {
    const releases = await getReleasesStatus(client, packageName, track);
    const active = releases.find(
      (r) => r.status === "inProgress" || r.status === "halted" || r.status === "completed",
    );
    if (!active) return null;
    return {
      track,
      versionCode: active.versionCodes[active.versionCodes.length - 1] ?? "—",
      userFraction: active.userFraction ?? null,
      status: active.status,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export async function dispatchWebhook(url: string, event: WatchEvent): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": `gpc-cli/${process.env["__GPC_VERSION"] ?? "dev"}`,
    },
    body: JSON.stringify({ type: "breach", ...event }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }
}

// ---------------------------------------------------------------------------
// Default breach handler
// ---------------------------------------------------------------------------

export async function handleBreach(
  event: WatchEvent,
  config: WatchConfig,
  client: PlayApiClient,
): Promise<boolean> {
  let halted = false;

  for (const action of config.actions) {
    switch (action) {
      case "notify": {
        const metrics = event.breaches.join(", ");
        sendNotification(
          "GPC Watch: Threshold Breach",
          `${config.packageName}: ${metrics} breached on ${config.track}`,
        );
        break;
      }
      case "halt": {
        try {
          const { updateRollout } = await import("./releases.js");
          await updateRollout(client, config.packageName, config.track, "halt");
          halted = true;
        } catch {
          // halt failure is non-fatal to the watch loop
        }
        break;
      }
      case "webhook": {
        if (config.webhookUrl) {
          try {
            await dispatchWebhook(config.webhookUrl, event);
          } catch {
            // webhook failure is non-fatal
          }
        }
        break;
      }
    }
  }

  return halted;
}

// ---------------------------------------------------------------------------
// Core watch loop
// ---------------------------------------------------------------------------

export async function runWatch(
  client: PlayApiClient,
  reporting: ReportingApiClient,
  config: WatchConfig,
  callbacks: WatchCallbacks,
): Promise<WatchSummary> {
  if (config.intervalSeconds < 60) {
    throw new GpcError(
      "Watch interval must be at least 60 seconds",
      "WATCH_USAGE_ERROR",
      2,
      "Use --interval 60 or higher. Google vitals data is delayed 24-48h, so frequent polling wastes API quota.",
    );
  }

  let running = true;
  const events: WatchEvent[] = [];
  let breachCount = 0;
  let halted = false;
  const startTime = Date.now();

  const cleanup = () => {
    running = false;
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    let round = 0;

    while (running) {
      round++;

      const rollout = await fetchRollout(client, config.packageName, config.track);

      const vitals: Partial<Record<WatchMetric, WatchVitalReading>> = {};
      for (const metric of config.metrics) {
        const value = await queryWatchMetric(reporting, config.packageName, metric);
        const threshold = config.thresholds[metric];
        const result =
          threshold !== undefined ? checkThreshold(value, threshold) : { breached: false };
        vitals[metric] = {
          value,
          threshold,
          breached: result.breached,
        };
      }

      const breaches = Object.entries(vitals)
        .filter(([, v]) => v.breached)
        .map(([k]) => k);

      const event: WatchEvent = {
        round,
        timestamp: new Date().toISOString(),
        rollout,
        vitals,
        breaches,
        halted: false,
      };

      if (breaches.length > 0) {
        breachCount++;
        const stateChanged = await trackBreachState(config.packageName, true);
        if (stateChanged) {
          const didHalt = await handleBreach(event, config, client);
          if (didHalt) {
            event.halted = true;
            halted = true;
          }
          await callbacks.onBreach(event);
        }
        callbacks.onEvent(event);
      } else {
        await trackBreachState(config.packageName, false);
        callbacks.onEvent(event);
      }

      events.push(event);

      // Auto-stop: rollout completed
      if (
        rollout?.status === "completed" ||
        (rollout?.userFraction === null && rollout?.status !== "inProgress")
      ) {
        if (round > 1) {
          running = false;
          continue;
        }
      }

      // Auto-stop: halted by us
      if (halted) {
        running = false;
        continue;
      }

      // Rounds limit
      if (config.maxRounds !== null && round >= config.maxRounds) {
        running = false;
        continue;
      }

      // Sleep in 1s ticks for responsive SIGINT
      for (let i = 0; i < config.intervalSeconds && running; i++) {
        await new Promise<void>((r) => setTimeout(r, 1000));
      }
    }
  } finally {
    process.removeListener("SIGINT", cleanup);
    process.removeListener("SIGTERM", cleanup);
  }

  const summary: WatchSummary = {
    rounds: events.length,
    durationMs: Date.now() - startTime,
    finalRollout: events[events.length - 1]?.rollout?.userFraction ?? null,
    breachCount,
    halted,
    events,
  };

  callbacks.onComplete(summary);
  return summary;
}
