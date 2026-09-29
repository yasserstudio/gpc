import { GpcError } from "../errors.js";
import {
  reportAccessDeniedError,
  reportAuthRejectedError,
  reportBucketNotFoundError,
} from "./errors.js";

/**
 * Minimal Google Cloud Storage JSON API reader for the Play bulk-reports bucket
 * (pubsite_prod_<developerId>). Deliberately dependency-free: the token already carries the
 * devstorage.read_only scope (see @gpc-cli/auth), so plain fetch against the JSON API is all
 * that is needed — no @google-cloud/storage.
 *
 * Access model (verified live 2026-07-24/2026-08-01): once the service account is granted
 * "View app information and download bulk reports (read-only)" in Play Console, it gets
 * objects LIST + GET on the whole bucket, so discovery-first (list a prefix, filter, then
 * download) is the design. Without the grant every call returns 403.
 */

export interface ReportsAuth {
  getAccessToken(): Promise<string>;
}

export interface ReportObject {
  /** Full object name, e.g. stats/installs/installs_com.example.app_202606_overview.csv */
  name: string;
  /** Object size in bytes (as reported by GCS; compressed size for gzip-encoded objects). */
  size: number;
  updated?: string;
}

export interface ListReportObjectsResult {
  objects: ReportObject[];
  nextPageToken?: string;
}

const GCS_API_BASE = "https://storage.googleapis.com/storage/v1/b";
const LIST_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
// Ceiling on a downloaded report object. Real Play bulk reports are tens of MB at most
// (monthly financial ZIPs are the largest), so this is generous; it exists so a wrong
// bucket/object or a hostile response cannot buffer unbounded bytes into memory. Matches
// the inflate ceiling in decode.ts.
const MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;

interface GcsObjectItem {
  name?: string;
  size?: string;
  updated?: string;
}

interface GcsListResponse {
  items?: GcsObjectItem[];
  nextPageToken?: string;
}

function networkError(bucket: string, cause: unknown): GpcError {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new GpcError(
    `Network error reading the Play reports bucket "${bucket}": ${detail}`,
    "NETWORK_ERROR",
    5,
    "Check your internet connection and retry. Google Cloud Storage may also be briefly unavailable.",
  );
}

function tooLargeError(objectName: string, maxBytes: number): GpcError {
  return new GpcError(
    `Report object "${objectName}" is larger than the ${maxBytes}-byte download limit.`,
    "REPORT_DOWNLOAD_FAILED",
    4,
    "Play bulk reports are far smaller than this; confirm the bucket and object name, then " +
      "download the file from Play Console -> Download reports if you really need it.",
  );
}

function maxRetries(): number {
  const parsed = Number(process.env["GPC_MAX_RETRIES"]);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 10 ? parsed : 3;
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function gcsFetch(
  auth: ReportsAuth,
  bucket: string,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const retries = maxRetries();
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 8000)));
    }
    const token = await auth.getAccessToken();
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastError = err;
      continue; // network-level failure: retry
    }
    if (RETRYABLE_STATUSES.has(res.status) && attempt < retries) {
      continue;
    }
    if (res.status === 401) {
      throw reportAuthRejectedError(bucket);
    }
    if (res.status === 403) {
      throw reportAccessDeniedError(bucket);
    }
    return res;
  }
  throw networkError(bucket, lastError ?? new Error("retries exhausted"));
}

/**
 * List objects under a prefix. 404 here means the bucket itself is wrong (a missing prefix
 * is a 200 with no items), so it maps to REPORT_BUCKET_NOT_FOUND.
 */
export async function listReportObjects(
  auth: ReportsAuth,
  bucket: string,
  options: { prefix: string; maxResults?: number; pageToken?: string },
): Promise<ListReportObjectsResult> {
  const params = new URLSearchParams({ prefix: options.prefix });
  if (options.maxResults) params.set("maxResults", String(options.maxResults));
  if (options.pageToken) params.set("pageToken", options.pageToken);
  const url = `${GCS_API_BASE}/${encodeURIComponent(bucket)}/o?${params.toString()}`;

  const res = await gcsFetch(auth, bucket, url, LIST_TIMEOUT_MS);
  if (res.status === 404) {
    throw reportBucketNotFoundError(bucket);
  }
  if (!res.ok) {
    throw new GpcError(
      `Google Cloud Storage returned HTTP ${res.status} listing the reports bucket "${bucket}".`,
      "REPORT_LIST_FAILED",
      4,
      "Retry in a moment. If the error persists, verify the bucket name and the service account's report access.",
    );
  }

  let body: GcsListResponse;
  try {
    // A captive portal or proxy can return 200 with non-JSON; surface that as a network
    // problem rather than an unhandled SyntaxError.
    body = (await res.json()) as GcsListResponse;
  } catch (err) {
    throw networkError(bucket, err);
  }
  const objects: ReportObject[] = (body.items ?? [])
    .filter((item): item is GcsObjectItem & { name: string } => typeof item.name === "string")
    .map((item) => ({
      name: item.name,
      size: Number(item.size ?? 0),
      updated: item.updated,
    }));
  return { objects, nextPageToken: body.nextPageToken };
}

/**
 * Download a single report object's bytes (alt=media). GCS transparently gunzips
 * content-encoding:gzip objects on this path in Node's fetch, but callers must still run the
 * bytes through the decode layer, which re-checks the gzip magic as a backstop.
 */
export async function downloadReportObject(
  auth: ReportsAuth,
  bucket: string,
  objectName: string,
  options: { maxBytes?: number } = {},
): Promise<Buffer> {
  const maxBytes = options.maxBytes ?? MAX_DOWNLOAD_BYTES;
  const url = `${GCS_API_BASE}/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}?alt=media`;
  const res = await gcsFetch(auth, bucket, url, DOWNLOAD_TIMEOUT_MS);
  if (res.status === 404) {
    throw new GpcError(
      `Report object "${objectName}" was not found in bucket "${bucket}".`,
      "REPORT_OBJECT_NOT_FOUND",
      4,
      "List available reports first: gpc reports list <report-type> --month <YYYY-MM>",
    );
  }
  if (!res.ok) {
    throw new GpcError(
      `Google Cloud Storage returned HTTP ${res.status} downloading "${objectName}".`,
      "REPORT_DOWNLOAD_FAILED",
      4,
      "Retry in a moment. If the error persists, list the reports to confirm the object still exists.",
    );
  }
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw tooLargeError(objectName, maxBytes);
  }
  // Streamed with a running total rather than arrayBuffer(): Content-Length is optional
  // (and advisory), so the cap has to hold while the bytes arrive.
  const body = res.body;
  if (!body) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  let read = 0;
  try {
    for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
      read += chunk.length;
      // Throwing out of the for-await calls the iterator's return(), which cancels the
      // body stream, so the rest of the response is never buffered.
      if (read > maxBytes) throw tooLargeError(objectName, maxBytes);
      chunks.push(Buffer.from(chunk));
    }
  } catch (err) {
    if (err instanceof GpcError) throw err;
    throw networkError(bucket, err);
  }
  return Buffer.concat(chunks);
}
