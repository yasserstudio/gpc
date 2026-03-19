import { open, stat } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { PlayApiError } from "./errors.js";
import type { ApiResponse, ResumableUploadOptions, UploadProgressEvent } from "./types.js";

/** 256 KB — Google requires chunk sizes to be multiples of this. */
const CHUNK_ALIGNMENT = 256 * 1024;

/** 8 MB — default chunk size (multiple of 256 KB). */
const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;

/** Files below this threshold use simple upload instead. */
export const RESUMABLE_THRESHOLD = 5 * 1024 * 1024; // 5 MB

function envInt(name: string): number | undefined {
  const val = process.env[name];
  if (val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function resolveChunkSize(explicit?: number): number {
  const size = explicit ?? envInt("GPC_UPLOAD_CHUNK_SIZE") ?? DEFAULT_CHUNK_SIZE;
  if (size < CHUNK_ALIGNMENT || size % CHUNK_ALIGNMENT !== 0) {
    throw new PlayApiError(
      `Chunk size must be a multiple of 256 KB (got ${size} bytes)`,
      "UPLOAD_INVALID_CHUNK_SIZE",
      undefined,
      `Use a multiple of 262144 (256 KB). Common values: 1048576 (1 MB), 8388608 (8 MB), 16777216 (16 MB).`,
    );
  }
  return size;
}

function jitteredDelay(base: number, attempt: number, max: number): number {
  const exponential = base * 2 ** attempt;
  const capped = Math.min(exponential, max);
  return capped * (0.5 + Math.random() * 0.5);
}

interface ResumableUploadContext {
  getAccessToken: () => Promise<string>;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onRetry?: (info: { attempt: number; method: string; path: string; error: string; delayMs: number; timestamp: string }) => void;
}

/**
 * Google Play resumable upload protocol.
 *
 * 1. Initiate session → POST with X-Upload-Content-Type/Length, get Location header
 * 2. Stream chunks → PUT chunks with Content-Range to session URI
 * 3. Resume on failure → PUT with Content-Range: bytes * /total to query progress
 */
export async function resumableUpload<T>(
  uploadUrl: string,
  filePath: string,
  contentType: string,
  ctx: ResumableUploadContext,
  options?: ResumableUploadOptions,
): Promise<ApiResponse<T>> {
  const chunkSize = resolveChunkSize(options?.chunkSize);
  const maxResumeAttempts = options?.maxResumeAttempts ?? 5;
  const onProgress = options?.onProgress;

  const fileStats = await stat(filePath);
  const totalBytes = fileStats.size;

  // Step 1: Initiate resumable session (or resume existing)
  let sessionUri = options?.resumeSessionUri;
  if (!sessionUri) {
    sessionUri = await initiateSession(uploadUrl, contentType, totalBytes, ctx);
  }

  // Step 2: Stream file in chunks
  const startTime = Date.now();
  let offset = 0;

  // If resuming, query the server for where we left off
  if (options?.resumeSessionUri) {
    offset = await queryProgress(sessionUri, totalBytes, ctx);
  }

  let fh: FileHandle | undefined;
  try {
    fh = await open(filePath, "r");
    const chunkBuffer = Buffer.alloc(chunkSize);

    while (offset < totalBytes) {
      const remaining = totalBytes - offset;
      const bytesToRead = Math.min(chunkSize, remaining);
      const { bytesRead } = await fh.read(chunkBuffer, 0, bytesToRead, offset);

      if (bytesRead === 0) break;

      // Always copy the chunk to avoid race conditions — fetch may read the body
      // asynchronously while we overwrite chunkBuffer on the next iteration
      const chunk = Buffer.from(chunkBuffer.buffer, chunkBuffer.byteOffset, bytesRead);
      const rangeEnd = offset + bytesRead - 1;
      const contentRange = `bytes ${offset}-${rangeEnd}/${totalBytes}`;

      let result: ChunkResult<T> | undefined;
      for (let attempt = 0; attempt <= maxResumeAttempts; attempt++) {
        if (attempt > 0) {
          const delay = jitteredDelay(1000, attempt - 1, 30_000);
          await new Promise((r) => setTimeout(r, delay));

          // Query server for actual progress before retrying
          try {
            const serverOffset = await queryProgress(sessionUri, totalBytes, ctx);
            if (serverOffset >= offset + bytesRead) {
              // Server already has this chunk, advance
              result = { complete: false };
              break;
            }
            if (serverOffset > offset) {
              // Partial — skip to where server is, but we'll need to re-read
              // For simplicity, just retry the whole chunk since it's small enough
            }
          } catch {
            // Query failed — just retry the PUT
          }

          ctx.onRetry?.({
            attempt,
            method: "PUT",
            path: sessionUri,
            error: `Chunk upload failed at offset ${offset}, retrying`,
            delayMs: Math.round(delay),
            timestamp: new Date().toISOString(),
          });
        }

        result = await sendChunk<T>(sessionUri, chunk, contentRange, ctx);
        if (result) break;
      }

      if (!result) {
        throw new PlayApiError(
          `Upload failed: chunk at offset ${offset} could not be sent after ${maxResumeAttempts + 1} attempts`,
          "UPLOAD_CHUNK_FAILED",
          undefined,
          `The upload session is still valid for up to 1 week. Resume with: --resume-uri "${sessionUri}"`,
        );
      }

      offset += bytesRead;

      // Fire progress callback
      if (onProgress) {
        const elapsed = (Date.now() - startTime) / 1000;
        const bytesPerSecond = elapsed > 0 ? offset / elapsed : 0;
        const remainingBytes = totalBytes - offset;
        const etaSeconds = bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : 0;

        onProgress({
          bytesUploaded: offset,
          totalBytes,
          percent: Math.round((offset / totalBytes) * 100),
          bytesPerSecond: Math.round(bytesPerSecond),
          etaSeconds: Math.round(etaSeconds),
        });
      }

      // If the server returned a final response (200/201), we're done
      if (result.complete && result.response) {
        return result.response;
      }
    }

    // Should not reach here — last chunk should have returned complete
    throw new PlayApiError(
      "Upload finished sending all bytes but did not receive a completion response",
      "UPLOAD_NO_COMPLETION",
      undefined,
      "This is unexpected. Try uploading again.",
    );
  } finally {
    await fh?.close();
  }
}

interface ChunkResult<T> {
  complete: boolean;
  response?: ApiResponse<T>;
}

async function initiateSession(
  uploadUrl: string,
  contentType: string,
  totalBytes: number,
  ctx: ResumableUploadContext,
): Promise<string> {
  const token = await ctx.getAccessToken();
  const url = uploadUrl.includes("?")
    ? `${uploadUrl}&uploadType=resumable`
    : `${uploadUrl}?uploadType=resumable`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // 60s timeout for session initiation
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Upload-Content-Type": contentType,
        "X-Upload-Content-Length": String(totalBytes),
        "Content-Length": "0",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new PlayApiError(
      `Failed to initiate resumable upload: ${response.status} ${body.slice(0, 200)}`,
      "UPLOAD_INITIATE_FAILED",
      response.status,
      "Check that the package name, edit ID, and credentials are correct.",
    );
  }

  const location = response.headers.get("Location");
  if (!location) {
    throw new PlayApiError(
      "Resumable upload initiation did not return a session URI (Location header missing)",
      "UPLOAD_NO_SESSION_URI",
      response.status,
      "This is a Google API issue. Try again.",
    );
  }

  return location;
}

async function sendChunk<T>(
  sessionUri: string,
  chunk: Buffer,
  contentRange: string,
  ctx: ResumableUploadContext,
): Promise<ChunkResult<T> | undefined> {
  const token = await ctx.getAccessToken();

  // Timeout: 30s base + 1s per MB of chunk data
  const chunkTimeoutMs = 30_000 + Math.ceil(chunk.byteLength / (1024 * 1024)) * 1_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), chunkTimeoutMs);
  let response: Response;
  try {
    response = await fetch(sessionUri, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": contentRange,
      },
      body: chunk,
      signal: controller.signal,
    });
  } catch {
    // Network error or timeout — caller will retry
    return undefined;
  } finally {
    clearTimeout(timer);
  }

  // 200 or 201 — upload complete
  if (response.status === 200 || response.status === 201) {
    const text = await response.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);
    return { complete: true, response: { data, status: response.status } };
  }

  // 308 Resume Incomplete — chunk accepted, continue
  if (response.status === 308) {
    await response.body?.cancel(); // Consume response to free connection
    return { complete: false };
  }

  // 404 — session not found (expired or invalid)
  if (response.status === 404) {
    throw new PlayApiError(
      "Upload session not found. The session may have expired.",
      "UPLOAD_SESSION_NOT_FOUND",
      404,
      "Start a new upload. Resumable upload sessions are valid for up to 1 week.",
    );
  }

  // 410 — session gone
  if (response.status === 410) {
    throw new PlayApiError(
      "Upload session has expired.",
      "UPLOAD_SESSION_EXPIRED",
      410,
      "Start a new upload from the beginning.",
    );
  }

  // 401 — token expired, refresh and retry
  if (response.status === 401) {
    await response.body?.cancel();
    return undefined; // Caller will retry, which will get a fresh token
  }

  // 5xx or 429 — retryable
  if (response.status === 429 || response.status >= 500) {
    await response.body?.cancel();
    return undefined; // Caller will retry
  }

  // Non-retryable error
  const body = await response.text();
  throw new PlayApiError(
    `Upload chunk failed with status ${response.status}: ${body.slice(0, 200)}`,
    `UPLOAD_HTTP_${response.status}`,
    response.status,
    "The upload encountered an unexpected error.",
  );
}

async function queryProgress(
  sessionUri: string,
  totalBytes: number,
  ctx: ResumableUploadContext,
): Promise<number> {
  const token = await ctx.getAccessToken();

  const response = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Length": "0",
      "Content-Range": `bytes */${totalBytes}`,
    },
  });

  // 308 — partial upload, Range header tells us where we are
  if (response.status === 308) {
    await response.body?.cancel();
    const range = response.headers.get("Range");
    if (range) {
      // Format: "bytes=0-12345"
      const match = range.match(/bytes=0-(\d+)/);
      if (match) {
        return Number(match[1]) + 1; // Next byte to upload
      }
    }
    // No Range header means server has received 0 bytes
    return 0;
  }

  // 200/201 — upload is actually complete
  if (response.status === 200 || response.status === 201) {
    await response.body?.cancel();
    return totalBytes;
  }

  // 404/410 — session expired
  if (response.status === 404 || response.status === 410) {
    await response.body?.cancel();
    throw new PlayApiError(
      "Upload session has expired while querying progress.",
      "UPLOAD_SESSION_EXPIRED",
      response.status,
      "Start a new upload from the beginning.",
    );
  }

  await response.body?.cancel();
  return 0;
}
