import { mkdir, readFile, writeFile } from "node:fs/promises";
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

export interface GetAppStatusOptions {
  days?: number;
  vitalThresholds?: {
    crashRate?: number;
    anrRate?: number;
    slowStartRate?: number;
    slowRenderingRate?: number;
  };
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
    return { ...entry.data, cached: true };
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
    const entry: CacheEntry = {
      fetchedAt: data.fetchedAt,
      ttl: ttlSeconds,
      data,
    };
    await writeFile(cacheFilePath(packageName), JSON.stringify(entry, null, 2), { encoding: "utf-8", mode: 0o600 });
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
): Promise<number | undefined> {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const baseMs = Date.now() - 2 * DAY_MS;
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

function toVitalMetric(
  value: number | undefined,
  threshold: number,
): StatusVitalMetric {
  if (value === undefined) {
    return { value: undefined, threshold, status: "unknown" };
  }
  if (value > threshold) return { value, threshold, status: "breach" };
  if (value > threshold * (1 - WARN_MARGIN)) return { value, threshold, status: "warn" };
  return { value, threshold, status: "ok" };
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
    current.length > 0
      ? Math.round((positiveCount / current.length) * 100)
      : undefined;

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
  const thresholds = {
    crashRate: options.vitalThresholds?.crashRate ?? DEFAULT_THRESHOLDS.crashRate,
    anrRate: options.vitalThresholds?.anrRate ?? DEFAULT_THRESHOLDS.anrRate,
    slowStartRate: options.vitalThresholds?.slowStartRate ?? DEFAULT_THRESHOLDS.slowStartRate,
    slowRenderingRate:
      options.vitalThresholds?.slowRenderingRate ?? DEFAULT_THRESHOLDS.slowRenderingRate,
  };

  // Fire all 6 calls in parallel; use allSettled so partial failures show "unknown"
  const [releasesResult, crashesResult, anrResult, slowStartResult, slowRenderResult, reviewsResult] =
    await Promise.allSettled([
      getReleasesStatus(client, packageName),
      queryVitalForStatus(reporting, packageName, "crashRateMetricSet", days),
      queryVitalForStatus(reporting, packageName, "anrRateMetricSet", days),
      queryVitalForStatus(reporting, packageName, "slowStartRateMetricSet", days),
      queryVitalForStatus(reporting, packageName, "slowRenderingRateMetricSet", days),
      listReviews(client, packageName, { maxResults: 500 }),
    ]);

  // Releases
  const rawReleases =
    releasesResult.status === "fulfilled" ? releasesResult.value : [];
  const releases: StatusRelease[] = rawReleases.map((r) => ({
    track: r.track,
    versionCode: r.versionCodes[r.versionCodes.length - 1] ?? "—",
    status: r.status,
    userFraction: r.userFraction ?? null,
  }));

  // Vitals
  const crashValue =
    crashesResult.status === "fulfilled" ? crashesResult.value : undefined;
  const anrValue =
    anrResult.status === "fulfilled" ? anrResult.value : undefined;
  const slowStartValue =
    slowStartResult.status === "fulfilled" ? slowStartResult.value : undefined;
  const slowRenderValue =
    slowRenderResult.status === "fulfilled" ? slowRenderResult.value : undefined;

  // Reviews
  const rawReviews =
    reviewsResult.status === "fulfilled" ? reviewsResult.value : [];
  const reviews = computeReviewSentiment(rawReviews, 30);

  const fetchedAt = new Date().toISOString();

  return {
    packageName,
    fetchedAt,
    cached: false,
    releases,
    vitals: {
      windowDays: days,
      crashes: toVitalMetric(crashValue, thresholds.crashRate),
      anr: toVitalMetric(anrValue, thresholds.anrRate),
      slowStarts: toVitalMetric(slowStartValue, thresholds.slowStartRate),
      slowRender: toVitalMetric(slowRenderValue, thresholds.slowRenderingRate),
    },
    reviews,
  };
}

// ---------------------------------------------------------------------------
// Table formatter
// ---------------------------------------------------------------------------

function vitalIndicator(metric: StatusVitalMetric): string {
  if (metric.status === "unknown") return "?";
  if (metric.status === "breach") return "✗";
  if (metric.status === "warn") return "⚠";
  return "✓";
}

function formatVitalValue(metric: StatusVitalMetric): string {
  if (metric.value === undefined) return "n/a";
  return `${(metric.value * 100).toFixed(2)}%`;
}

function formatFraction(fraction: number | null): string {
  if (fraction === null) return "—";
  return `${Math.round(fraction * 100)}%`;
}

function formatRating(rating: number | undefined): string {
  if (rating === undefined) return "n/a";
  return `★ ${rating.toFixed(1)}`;
}

function formatTrend(current: number | undefined, previous: number | undefined): string {
  if (current === undefined || previous === undefined) return "";
  if (current > previous) return `  ↑ from ${previous.toFixed(1)}`;
  if (current < previous) return `  ↓ from ${previous.toFixed(1)}`;
  return "";
}

export function formatStatusTable(status: AppStatus): string {
  const lines: string[] = [];
  const cachedLabel = status.cached
    ? `  (cached ${new Date(status.fetchedAt).toLocaleTimeString()})`
    : `  (fetched ${new Date(status.fetchedAt).toLocaleTimeString()})`;

  lines.push(`App: ${status.packageName}${cachedLabel}`);
  lines.push("");

  // Releases
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

  // Vitals
  lines.push("");
  lines.push(`VITALS  (last ${status.vitals.windowDays} days)`);
  const { crashes, anr, slowStarts, slowRender } = status.vitals;
  lines.push(
    `  crashes     ${formatVitalValue(crashes).padEnd(8)}  ${vitalIndicator(crashes)}    ` +
    `anr         ${formatVitalValue(anr).padEnd(8)}  ${vitalIndicator(anr)}`,
  );
  lines.push(
    `  slow starts ${formatVitalValue(slowStarts).padEnd(8)}  ${vitalIndicator(slowStarts)}    ` +
    `slow render ${formatVitalValue(slowRender).padEnd(8)}  ${vitalIndicator(slowRender)}`,
  );

  // Reviews
  lines.push("");
  lines.push(`REVIEWS  (last ${status.reviews.windowDays} days)`);
  const { averageRating, previousAverageRating, totalNew, positivePercent } = status.reviews;
  const trend = formatTrend(averageRating, previousAverageRating);
  const positiveStr = positivePercent !== undefined ? `  ${positivePercent}% positive` : "";
  lines.push(
    `  ${formatRating(averageRating)}   ${totalNew} new${positiveStr}${trend}`,
  );

  return lines.join("\n");
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
