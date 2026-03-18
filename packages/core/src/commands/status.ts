import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import type { PlayApiClient } from "@gpc-cli/api";
import type { ReportingApiClient } from "@gpc-cli/api";
import { getCacheDir } from "@gpc-cli/config";
import { getReleasesStatus } from "./releases.js";
import { listReviews } from "./reviews.js";
import type { VitalsMetricSet, MetricSetQuery } from "@gpc-cli/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusVitalMetric {
  value: number | undefined;
  threshold: number;
  status: "ok" | "warn" | "breach" | "unknown";
  previousValue?: number | undefined;
  trend?: "up" | "down" | "flat" | null;
}

export interface StatusRelease {
  track: string;
  versionCode: string;
  status: string;
  userFraction: number | null;
}

export interface StatusReviews {
  windowDays: number;
  averageRating: number | undefined;
  previousAverageRating: number | undefined;
  totalNew: number;
  positivePercent: number | undefined;
}

export interface AppStatus {
  packageName: string;
  fetchedAt: string;
  cached: boolean;
  sections: string[]; // active sections: "releases" | "vitals" | "reviews"
  releases: StatusRelease[];
  vitals: {
    windowDays: number;
    crashes: StatusVitalMetric;
    anr: StatusVitalMetric;
    slowStarts: StatusVitalMetric;
    slowRender: StatusVitalMetric;
  };
  reviews: StatusReviews;
}

export interface StatusDiff {
  versionCode: { from: string | null; to: string | null };
  crashRate: { from: number | null; to: number | null; delta: number | null };
  anrRate: { from: number | null; to: number | null; delta: number | null };
  reviewCount: { from: number | null; to: number | null };
  averageRating: { from: number | null; to: number | null; delta: number | null };
}

export interface GetAppStatusOptions {
  days?: number;
  sections?: string[]; // "releases" | "vitals" | "reviews"
  vitalThresholds?: {
    crashRate?: number;
    anrRate?: number;
    slowStartRate?: number;
    slowRenderingRate?: number;
  };
}

export interface WatchOptions {
  intervalSeconds: number;
  render: (status: AppStatus) => string;
  fetch: () => Promise<AppStatus>;
  save: (status: AppStatus) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const DEFAULT_TTL_SECONDS = 3600;

interface CacheEntry {
  fetchedAt: string;
  ttl: number;
  data: AppStatus;
}

function cacheFilePath(packageName: string): string {
  return join(getCacheDir(), `status-${packageName}.json`);
}

export async function loadStatusCache(
  packageName: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<AppStatus | null> {
  try {
    const raw = await readFile(cacheFilePath(packageName), "utf-8");
    const entry = JSON.parse(raw) as CacheEntry;
    const age = (Date.now() - new Date(entry.fetchedAt).getTime()) / 1000;
    if (age > (entry.ttl ?? ttlSeconds)) return null;
    const data = entry.data;
    return {
      ...data,
      sections: data.sections ?? ["releases", "vitals", "reviews"],
      cached: true,
    };
  } catch {
    return null;
  }
}

export async function saveStatusCache(
  packageName: string,
  data: AppStatus,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  try {
    const dir = getCacheDir();
    await mkdir(dir, { recursive: true });
    const entry: CacheEntry = { fetchedAt: data.fetchedAt, ttl: ttlSeconds, data };
    await writeFile(cacheFilePath(packageName), JSON.stringify(entry, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
  } catch {
    // Cache write failures must never break the command
  }
}

// ---------------------------------------------------------------------------
// Vitals helpers
// ---------------------------------------------------------------------------

const METRIC_SET_METRICS: Partial<Record<VitalsMetricSet, string[]>> = {
  crashRateMetricSet: ["crashRate", "userPerceivedCrashRate", "distinctUsers"],
  anrRateMetricSet: ["anrRate", "userPerceivedAnrRate", "distinctUsers"],
  slowStartRateMetricSet: ["slowStartRate", "distinctUsers"],
  slowRenderingRateMetricSet: ["slowRenderingRate", "distinctUsers"],
};

const DEFAULT_THRESHOLDS = {
  crashRate: 0.02,
  anrRate: 0.01,
  slowStartRate: 0.05,
  slowRenderingRate: 0.1,
};

const WARN_MARGIN = 0.2; // within 20% of threshold → warn

function toApiDate(d: Date): { year: number; month: number; day: number } {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

async function queryVitalForStatus(
  reporting: ReportingApiClient,
  packageName: string,
  metricSet: VitalsMetricSet,
  days: number,
  offsetDays = 0,
): Promise<number | undefined> {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const baseMs = Date.now() - 2 * DAY_MS - offsetDays * DAY_MS;
  const end = new Date(baseMs);
  const start = new Date(baseMs - days * DAY_MS);
  const metrics = METRIC_SET_METRICS[metricSet] ?? ["distinctUsers"];

  const query: MetricSetQuery = {
    metrics,
    timelineSpec: {
      aggregationPeriod: "DAILY",
      startTime: toApiDate(start),
      endTime: toApiDate(end),
    },
  };

  const result = await reporting.queryMetricSet(packageName, metricSet, query);
  if (!result.rows || result.rows.length === 0) return undefined;

  const values = result.rows
    .map((row) => {
      const firstKey = Object.keys(row.metrics)[0];
      return firstKey ? Number(row.metrics[firstKey]?.decimalValue?.value) : NaN;
    })
    .filter((v) => !isNaN(v));

  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

interface VitalWithTrend {
  current: number | undefined;
  previous: number | undefined;
  trend: "up" | "down" | "flat" | null;
}

async function queryVitalWithTrend(
  reporting: ReportingApiClient,
  packageName: string,
  metricSet: VitalsMetricSet,
  days: number,
): Promise<VitalWithTrend> {
  const [current, previous] = await Promise.all([
    queryVitalForStatus(reporting, packageName, metricSet, days, 0),
    queryVitalForStatus(reporting, packageName, metricSet, days, days),
  ]);

  let trend: "up" | "down" | "flat" | null = null;
  if (current !== undefined && previous !== undefined) {
    if (current > previous) trend = "up";
    else if (current < previous) trend = "down";
    else trend = "flat";
  }

  return { current, previous, trend };
}

const SKIPPED_VITAL: VitalWithTrend = { current: undefined, previous: undefined, trend: null };

function toVitalMetric(
  value: number | undefined,
  threshold: number,
  previousValue?: number | undefined,
  trend?: "up" | "down" | "flat" | null,
): StatusVitalMetric {
  const base: StatusVitalMetric =
    previousValue !== undefined
      ? { value, threshold, status: "unknown", previousValue, trend: trend ?? null }
      : { value, threshold, status: "unknown" };

  if (value === undefined) return { ...base, status: "unknown" };
  if (value > threshold) return { ...base, status: "breach" };
  if (value > threshold * (1 - WARN_MARGIN)) return { ...base, status: "warn" };
  return { ...base, status: "ok" };
}

// ---------------------------------------------------------------------------
// Reviews helpers
// ---------------------------------------------------------------------------

function computeReviewSentiment(
  reviews: Awaited<ReturnType<typeof listReviews>>,
  windowDays: number,
): StatusReviews {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const windowMs = windowDays * DAY_MS;
  const prevWindowStart = now - 2 * windowMs;
  const curWindowStart = now - windowMs;

  const current = reviews.filter((r) => {
    const uc = r.comments?.[0]?.userComment;
    if (!uc) return false;
    const ts = Number(uc.lastModified.seconds) * 1000;
    return ts >= curWindowStart;
  });

  const previous = reviews.filter((r) => {
    const uc = r.comments?.[0]?.userComment;
    if (!uc) return false;
    const ts = Number(uc.lastModified.seconds) * 1000;
    return ts >= prevWindowStart && ts < curWindowStart;
  });

  const avgRating = (items: typeof reviews): number | undefined => {
    const ratings = items
      .map((r) => r.comments?.[0]?.userComment?.starRating)
      .filter((v): v is number => v !== undefined && v > 0);
    if (ratings.length === 0) return undefined;
    return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  };

  const positiveCount = current.filter(
    (r) => (r.comments?.[0]?.userComment?.starRating ?? 0) >= 4,
  ).length;

  const positivePercent =
    current.length > 0 ? Math.round((positiveCount / current.length) * 100) : undefined;

  return {
    windowDays,
    averageRating: avgRating(current),
    previousAverageRating: avgRating(previous),
    totalNew: current.length,
    positivePercent,
  };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function getAppStatus(
  client: PlayApiClient,
  reporting: ReportingApiClient,
  packageName: string,
  options: GetAppStatusOptions = {},
): Promise<AppStatus> {
  const days = options.days ?? 7;
  const sections = new Set(options.sections ?? ["releases", "vitals", "reviews"]);
  const thresholds = {
    crashRate: options.vitalThresholds?.crashRate ?? DEFAULT_THRESHOLDS.crashRate,
    anrRate: options.vitalThresholds?.anrRate ?? DEFAULT_THRESHOLDS.anrRate,
    slowStartRate: options.vitalThresholds?.slowStartRate ?? DEFAULT_THRESHOLDS.slowStartRate,
    slowRenderingRate:
      options.vitalThresholds?.slowRenderingRate ?? DEFAULT_THRESHOLDS.slowRenderingRate,
  };

  const [
    releasesResult,
    crashesResult,
    anrResult,
    slowStartResult,
    slowRenderResult,
    reviewsResult,
  ] = await Promise.allSettled([
    sections.has("releases") ? getReleasesStatus(client, packageName) : Promise.resolve([]),
    sections.has("vitals")
      ? queryVitalWithTrend(reporting, packageName, "crashRateMetricSet", days)
      : Promise.resolve(SKIPPED_VITAL),
    sections.has("vitals")
      ? queryVitalWithTrend(reporting, packageName, "anrRateMetricSet", days)
      : Promise.resolve(SKIPPED_VITAL),
    sections.has("vitals")
      ? queryVitalWithTrend(reporting, packageName, "slowStartRateMetricSet", days)
      : Promise.resolve(SKIPPED_VITAL),
    sections.has("vitals")
      ? queryVitalWithTrend(reporting, packageName, "slowRenderingRateMetricSet", days)
      : Promise.resolve(SKIPPED_VITAL),
    sections.has("reviews")
      ? listReviews(client, packageName, { maxResults: 500 })
      : Promise.resolve([]),
  ]);

  const rawReleases = releasesResult.status === "fulfilled" ? releasesResult.value : [];
  const releases: StatusRelease[] = rawReleases.map((r) => ({
    track: r.track,
    versionCode: r.versionCodes[r.versionCodes.length - 1] ?? "—",
    status: r.status,
    userFraction: r.userFraction ?? null,
  }));

  const crashes = crashesResult.status === "fulfilled" ? crashesResult.value : SKIPPED_VITAL;
  const anr = anrResult.status === "fulfilled" ? anrResult.value : SKIPPED_VITAL;
  const slowStart = slowStartResult.status === "fulfilled" ? slowStartResult.value : SKIPPED_VITAL;
  const slowRender =
    slowRenderResult.status === "fulfilled" ? slowRenderResult.value : SKIPPED_VITAL;

  const rawReviews = reviewsResult.status === "fulfilled" ? reviewsResult.value : [];
  const reviews = computeReviewSentiment(rawReviews, 30);

  return {
    packageName,
    fetchedAt: new Date().toISOString(),
    cached: false,
    sections: [...sections],
    releases,
    vitals: {
      windowDays: days,
      crashes: toVitalMetric(
        crashes.current,
        thresholds.crashRate,
        crashes.previous,
        crashes.trend,
      ),
      anr: toVitalMetric(anr.current, thresholds.anrRate, anr.previous, anr.trend),
      slowStarts: toVitalMetric(
        slowStart.current,
        thresholds.slowStartRate,
        slowStart.previous,
        slowStart.trend,
      ),
      slowRender: toVitalMetric(
        slowRender.current,
        thresholds.slowRenderingRate,
        slowRender.previous,
        slowRender.trend,
      ),
    },
    reviews,
  };
}

// ---------------------------------------------------------------------------
// Table formatter
// ---------------------------------------------------------------------------

function vitalIndicator(metric: StatusVitalMetric): string {
  if (metric.status === "unknown") return "—";
  if (metric.status === "breach") return "✗";
  if (metric.status === "warn") return "⚠";
  return "✓";
}

// For all vital metrics (crash rate, ANR, slow starts, slow render) lower is better:
// trend "up" (increasing) is bad → ↑, trend "down" (decreasing) is good → ↓
function vitalTrendArrow(metric: StatusVitalMetric): string {
  if (!metric.trend || metric.trend === "flat") return "";
  return metric.trend === "up" ? " ↑" : " ↓";
}

function formatVitalValue(metric: StatusVitalMetric): string {
  if (metric.value === undefined) return "—";
  return `${(metric.value * 100).toFixed(2)}%`;
}

function formatFraction(fraction: number | null): string {
  if (fraction === null) return "—";
  return `${Math.round(fraction * 100)}%`;
}

function formatRating(rating: number | undefined): string {
  if (rating === undefined) return "—";
  return `★ ${rating.toFixed(1)}`;
}

function formatTrend(current: number | undefined, previous: number | undefined): string {
  if (current === undefined || previous === undefined) return "";
  if (current > previous) return `  ↑ from ${previous.toFixed(1)}`;
  if (current < previous) return `  ↓ from ${previous.toFixed(1)}`;
  return "";
}

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function allVitalsUnknown(vitals: AppStatus["vitals"]): boolean {
  return (
    vitals.crashes.status === "unknown" &&
    vitals.anr.status === "unknown" &&
    vitals.slowStarts.status === "unknown" &&
    vitals.slowRender.status === "unknown"
  );
}

export function formatStatusTable(status: AppStatus): string {
  const lines: string[] = [];
  const sectionSet = new Set(status.sections);
  const cachedLabel = status.cached
    ? `  (cached ${relativeTime(status.fetchedAt)})`
    : `  (fetched ${relativeTime(status.fetchedAt)})`;

  lines.push(`App: ${status.packageName}${cachedLabel}`);

  // Releases
  if (sectionSet.has("releases")) {
    lines.push("");
    lines.push("RELEASES");
    if (status.releases.length === 0) {
      lines.push("  No releases found.");
    } else {
      const trackW = Math.max(10, ...status.releases.map((r) => r.track.length));
      const versionW = Math.max(7, ...status.releases.map((r) => r.versionCode.length));
      const statusW = Math.max(8, ...status.releases.map((r) => r.status.length));
      for (const r of status.releases) {
        lines.push(
          `  ${r.track.padEnd(trackW)}  ${r.versionCode.padEnd(versionW)}  ${r.status.padEnd(statusW)}  ${formatFraction(r.userFraction)}`,
        );
      }
    }
  }

  // Vitals
  if (sectionSet.has("vitals")) {
    lines.push("");
    lines.push(`VITALS  (last ${status.vitals.windowDays} days)`);
    if (allVitalsUnknown(status.vitals)) {
      lines.push("  No vitals data available for this period.");
    } else {
      const { crashes, anr, slowStarts, slowRender } = status.vitals;
      const crashVal = `${formatVitalValue(crashes)}${vitalTrendArrow(crashes)}`;
      const anrVal = `${formatVitalValue(anr)}${vitalTrendArrow(anr)}`;
      const slowStartVal = `${formatVitalValue(slowStarts)}${vitalTrendArrow(slowStarts)}`;
      const slowRenderVal = `${formatVitalValue(slowRender)}${vitalTrendArrow(slowRender)}`;
      lines.push(
        `  crashes     ${crashVal.padEnd(10)}  ${vitalIndicator(crashes)}    ` +
          `anr         ${anrVal.padEnd(10)}  ${vitalIndicator(anr)}`,
      );
      lines.push(
        `  slow starts ${slowStartVal.padEnd(10)}  ${vitalIndicator(slowStarts)}    ` +
          `slow render ${slowRenderVal.padEnd(10)}  ${vitalIndicator(slowRender)}`,
      );
    }
  }

  // Reviews
  if (sectionSet.has("reviews")) {
    lines.push("");
    lines.push(`REVIEWS  (last ${status.reviews.windowDays} days)`);
    const { averageRating, previousAverageRating, totalNew, positivePercent } = status.reviews;
    if (totalNew === 0 && averageRating === undefined) {
      lines.push("  No reviews in this period.");
    } else {
      const trend = formatTrend(averageRating, previousAverageRating);
      const positiveStr = positivePercent !== undefined ? `  ${positivePercent}% positive` : "";
      lines.push(`  ${formatRating(averageRating)}   ${totalNew} new${positiveStr}${trend}`);
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Summary formatter (one-liner for --format summary)
// ---------------------------------------------------------------------------

export function formatStatusSummary(status: AppStatus): string {
  const parts: string[] = [status.packageName];

  // Latest non-draft release
  const latestRelease = status.releases.find((r) => r.status !== "draft") ?? status.releases[0];
  if (latestRelease) {
    parts.push(`v${latestRelease.versionCode} ${latestRelease.track}`);
  }

  // Vitals (crashes + ANR only for brevity)
  const { crashes, anr } = status.vitals;
  const allVitalsUnknown = crashes.status === "unknown" && anr.status === "unknown";
  if (allVitalsUnknown) {
    parts.push("no vitals");
  } else {
    if (crashes.status !== "unknown") {
      const arrow = crashes.trend === "up" ? " ↑" : crashes.trend === "down" ? " ↓" : "";
      parts.push(`crashes ${formatVitalValue(crashes)}${arrow} ${vitalIndicator(crashes)}`);
    }
    if (anr.status !== "unknown") {
      const arrow = anr.trend === "up" ? " ↑" : anr.trend === "down" ? " ↓" : "";
      parts.push(`ANR ${formatVitalValue(anr)}${arrow} ${vitalIndicator(anr)}`);
    }
  }

  // Reviews
  const { averageRating, totalNew } = status.reviews;
  if (averageRating !== undefined) {
    parts.push(`avg ${averageRating.toFixed(1)}★`);
    if (totalNew > 0) parts.push(`${totalNew} reviews`);
  } else {
    parts.push("no reviews");
  }

  return parts.join(" · ") + (statusHasBreach(status) ? " [ALERT]" : "");
}

// ---------------------------------------------------------------------------
// Diff (--since-last)
// ---------------------------------------------------------------------------

export function computeStatusDiff(prev: AppStatus, curr: AppStatus): StatusDiff {
  const prevVersion = prev.releases[0]?.versionCode ?? null;
  const currVersion = curr.releases[0]?.versionCode ?? null;
  const prevCrash = prev.vitals.crashes.value ?? null;
  const currCrash = curr.vitals.crashes.value ?? null;
  const prevAnr = prev.vitals.anr.value ?? null;
  const currAnr = curr.vitals.anr.value ?? null;
  const prevRating = prev.reviews.averageRating ?? null;
  const currRating = curr.reviews.averageRating ?? null;

  return {
    versionCode: { from: prevVersion, to: currVersion },
    crashRate: {
      from: prevCrash,
      to: currCrash,
      delta: currCrash !== null && prevCrash !== null ? currCrash - prevCrash : null,
    },
    anrRate: {
      from: prevAnr,
      to: currAnr,
      delta: currAnr !== null && prevAnr !== null ? currAnr - prevAnr : null,
    },
    reviewCount: { from: prev.reviews.totalNew, to: curr.reviews.totalNew },
    averageRating: {
      from: prevRating,
      to: currRating,
      delta:
        currRating !== null && prevRating !== null
          ? Math.round((currRating - prevRating) * 10) / 10
          : null,
    },
  };
}

export function formatStatusDiff(diff: StatusDiff, since: string): string {
  const lines: string[] = [`Changes since ${since}:`];

  if (diff.versionCode.from !== diff.versionCode.to) {
    lines.push(`  Version:    ${diff.versionCode.from ?? "—"} → ${diff.versionCode.to ?? "—"}`);
  }

  const fmtRate = (v: number | null): string => (v !== null ? `${(v * 100).toFixed(2)}%` : "—");

  const fmtDelta = (d: number | null, lowerIsBetter = true): string => {
    if (d === null || Math.abs(d) < 0.0001) return "no change";
    const sign = d > 0 ? "+" : "";
    const good = lowerIsBetter ? d < 0 : d > 0;
    return `${sign}${(d * 100).toFixed(2)}% ${good ? "✓" : "✗"}`;
  };

  lines.push(
    `  Crash rate: ${fmtRate(diff.crashRate.from)} → ${fmtRate(diff.crashRate.to)} (${fmtDelta(diff.crashRate.delta)})`,
  );
  lines.push(
    `  ANR rate:   ${fmtRate(diff.anrRate.from)} → ${fmtRate(diff.anrRate.to)} (${fmtDelta(diff.anrRate.delta)})`,
  );

  const ratingDelta = diff.averageRating.delta;
  const prevR = diff.averageRating.from !== null ? `${diff.averageRating.from.toFixed(1)}★` : "—";
  const currR = diff.averageRating.to !== null ? `${diff.averageRating.to.toFixed(1)}★` : "—";
  const ratingStr =
    ratingDelta === null || Math.abs(ratingDelta) < 0.05
      ? "no change"
      : `${ratingDelta > 0 ? "+" : ""}${ratingDelta.toFixed(1)} ${ratingDelta > 0 ? "✓" : "✗"}`;
  lines.push(`  Reviews:    ${prevR} → ${currR} (${ratingStr})`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Watch loop (--watch N)
// ---------------------------------------------------------------------------

export async function runWatchLoop(opts: WatchOptions): Promise<void> {
  if (opts.intervalSeconds < 10) {
    throw new Error("--watch interval must be at least 10 seconds");
  }

  let running = true;

  const cleanup = () => {
    running = false;
    process.stdout.write("\n");
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  while (running) {
    process.stdout.write("\x1b[2J\x1b[H"); // clear terminal

    try {
      const status = await opts.fetch();
      await opts.save(status);
      console.log(opts.render(status));
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }

    console.log(`\n[gpc status] Refreshing in ${opts.intervalSeconds}s… (Ctrl+C to stop)`);

    // Sleep in 1s ticks so SIGINT is responsive
    for (let i = 0; i < opts.intervalSeconds && running; i++) {
      await new Promise<void>((r) => setTimeout(r, 1000));
    }
  }
}

// ---------------------------------------------------------------------------
// Notifications (--notify)
// ---------------------------------------------------------------------------

function breachStateFilePath(packageName: string): string {
  return join(getCacheDir(), `breach-state-${packageName}.json`);
}

/** Returns true if breach state changed (breach started or cleared). */
export async function trackBreachState(
  packageName: string,
  isBreaching: boolean,
): Promise<boolean> {
  const filePath = breachStateFilePath(packageName);
  let prevBreaching = false;

  try {
    const raw = await readFile(filePath, "utf-8");
    prevBreaching = (JSON.parse(raw) as { breaching: boolean }).breaching;
  } catch {
    // No prior state — first run
  }

  if (prevBreaching !== isBreaching) {
    try {
      await mkdir(getCacheDir(), { recursive: true });
      await writeFile(
        filePath,
        JSON.stringify({ breaching: isBreaching, since: new Date().toISOString() }, null, 2),
        { encoding: "utf-8", mode: 0o600 },
      );
    } catch {
      // State write failure is non-fatal
    }
    return true;
  }
  return false;
}

export function sendNotification(title: string, body: string): void {
  if (process.env["CI"]) return; // Skip in CI environments

  try {
    const p = process.platform;
    if (p === "darwin") {
      // execFile avoids shell parsing; AppleScript string uses JSON.stringify for safe quoting
      execFile("osascript", [
        "-e",
        `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`,
      ]);
    } else if (p === "linux") {
      // Pass title and body as separate argv elements — no shell, no escaping needed
      execFile("notify-send", [title, body]);
    } else if (p === "win32") {
      // Escape single quotes for PowerShell literal strings; execFile skips shell parsing
      // so no double-quote injection risk from the outer command string
      const psEscape = (s: string) =>
        s
          .replace(/'/g, "''") // PS single-quote escape
          .replace(/[\r\n]/g, " "); // strip newlines that would break the -Command string
      execFile("powershell", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${psEscape(body)}', '${psEscape(title)}')`,
      ]);
    }
  } catch {
    // Notification failures are non-fatal
  }
}

// ---------------------------------------------------------------------------
// Status indicator for exit code (mirrors gpc vitals behaviour)
// ---------------------------------------------------------------------------

export function statusHasBreach(status: AppStatus): boolean {
  return (
    status.vitals.crashes.status === "breach" ||
    status.vitals.anr.status === "breach" ||
    status.vitals.slowStarts.status === "breach" ||
    status.vitals.slowRender.status === "breach"
  );
}
