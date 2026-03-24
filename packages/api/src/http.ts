import { readFile, stat } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import { PlayApiError } from "./errors.js";
import { resumableUpload, RESUMABLE_THRESHOLD } from "./resumable-upload.js";
import type { ApiClientOptions, ApiResponse, ResumableUploadOptions } from "./types.js";

/** Strip HTML tags and collapse whitespace from a string. */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract a short, safe error summary from API response body (no tokens/secrets). */
function sanitizeErrorBody(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; status?: string; code?: number };
    };
    if (parsed?.error?.message) {
      return `${parsed.error.code ?? "?"} ${parsed.error.status ?? ""}: ${parsed.error.message}`.trim();
    }
  } catch {
    // not JSON — may be HTML error page
  }
  // Strip HTML tags before truncating
  const cleaned = body.startsWith("<") ? stripHtml(body) : body;
  return cleaned.length > 200 ? cleaned.slice(0, 200) + "..." : cleaned;
}

/** Validate upload file path to prevent path traversal. */
function validateFilePath(filePath: string): string {
  const resolved = resolve(filePath);
  if (!isAbsolute(resolved)) {
    throw new PlayApiError(
      "Invalid file path",
      "API_INVALID_PATH",
      undefined,
      "File path must resolve to an absolute path.",
    );
  }
  // Block obvious traversal patterns in the original input
  if (filePath.includes("\0")) {
    throw new PlayApiError(
      "Invalid file path: null bytes not allowed",
      "API_INVALID_PATH",
      undefined,
      "Provide a valid file path without null bytes.",
    );
  }
  return resolved;
}

const BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

const UPLOAD_BASE_URL =
  "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications";

const INTERNAL_SHARING_UPLOAD_BASE_URL =
  "https://androidpublisher.googleapis.com/upload/internalappsharing/v3/applications";

export interface HttpClient {
  get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiResponse<T>>;
  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>>;
  delete<T>(path: string): Promise<ApiResponse<T>>;
  upload<T>(path: string, filePath: string, contentType: string): Promise<ApiResponse<T>>;
  uploadResumable<T>(
    path: string,
    filePath: string,
    contentType: string,
    options?: ResumableUploadOptions,
  ): Promise<ApiResponse<T>>;
  uploadInternal<T>(path: string, filePath: string, contentType: string): Promise<ApiResponse<T>>;
  download(path: string): Promise<ArrayBuffer>;
}

function envInt(name: string): number | undefined {
  const val = process.env[name];
  if (val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function resolveOption(explicit: number | undefined, envName: string, fallback: number): number {
  return explicit ?? envInt(envName) ?? fallback;
}

interface ErrorMapping {
  code: string;
  message: string;
  suggestion: string;
}

/**
 * Pattern-match Google Play API error responses to return specific,
 * actionable error messages. Returns undefined if no pattern matches.
 */
function enhanceApiError(status: number, body: string): ErrorMapping | undefined {
  let errorMsg = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; status?: string } };
    errorMsg = parsed?.error?.message?.toLowerCase() ?? "";
  } catch {
    errorMsg = body.toLowerCase();
  }

  // — Duplicate version code (400/403)
  if ((status === 400 || status === 403) && errorMsg.includes("version code") && errorMsg.includes("already been used")) {
    const match = errorMsg.match(/version code (\d+)/);
    const vc = match?.[1] ?? "?";
    return {
      code: "API_DUPLICATE_VERSION_CODE",
      message: `Version code ${vc} has already been uploaded to this app.`,
      suggestion: [
        `Increment versionCode in your build.gradle (or build.gradle.kts) and rebuild.`,
        `Check the current version with: gpc releases status --track production`,
      ].join("\n"),
    };
  }

  // — Version code too low (400/403)
  if (
    (status === 400 || status === 403) &&
    errorMsg.includes("version code") &&
    (errorMsg.includes("lower") || errorMsg.includes("not allowed") || errorMsg.includes("not greater"))
  ) {
    return {
      code: "API_VERSION_CODE_TOO_LOW",
      message: "Version code is lower than the current version on the target track.",
      suggestion: [
        "Google Play requires version codes to increase with each upload.",
        "Check the current version with: gpc releases status --track <track>",
        "Then set a higher versionCode in your build.gradle and rebuild.",
      ].join("\n"),
    };
  }

  // — Package name mismatch (400/403)
  if (
    (status === 400 || status === 403) &&
    (errorMsg.includes("package name") || errorMsg.includes("applicationid")) &&
    errorMsg.includes("does not match")
  ) {
    return {
      code: "API_PACKAGE_NAME_MISMATCH",
      message: "The package name in the uploaded bundle does not match the target app.",
      suggestion: [
        "Verify your applicationId in build.gradle matches the app you're uploading to.",
        "Check the configured package with: gpc config show",
        "Or specify explicitly with: --app com.example.yourapp",
      ].join("\n"),
    };
  }

  // — App not found (404)
  if (
    status === 404 &&
    (errorMsg.includes("applicationnotfound") ||
      errorMsg.includes("no application was found") ||
      errorMsg.includes("application not found"))
  ) {
    return {
      code: "API_APP_NOT_FOUND",
      message: "This app was not found in your Google Play developer account.",
      suggestion: [
        "Verify the package name is correct.",
        "Ensure the app has been created in the Google Play Console.",
        "List available apps with: gpc apps list",
      ].join("\n"),
    };
  }

  // — Insufficient permissions (403)
  if (
    status === 403 &&
    (errorMsg.includes("permission") ||
      errorMsg.includes("insufficient") ||
      errorMsg.includes("caller does not have"))
  ) {
    return {
      code: "API_INSUFFICIENT_PERMISSIONS",
      message: "The service account does not have permission for this operation.",
      suggestion: [
        "In Google Play Console → Users and permissions → find your service account email.",
        "Grant the required permissions (e.g., 'Release to production' for uploads).",
        "Run gpc doctor to verify your credentials and permissions.",
      ].join("\n"),
    };
  }

  // — Edit conflict (409)
  if (status === 409) {
    return {
      code: "API_EDIT_CONFLICT",
      message: "An edit conflict occurred — another edit session is open for this app.",
      suggestion: [
        "This usually means another process has an open edit (CI pipeline, Play Console, or another gpc instance).",
        "Wait a few minutes and retry — GPC will auto-retry once.",
        "Or discard the stale edit in the Google Play Console.",
      ].join("\n"),
    };
  }

  // — Bundle too large (400/413)
  if (
    status === 413 ||
    ((status === 400 || status === 403) &&
      (errorMsg.includes("too large") || (errorMsg.includes("exceeds") && errorMsg.includes("size"))))
  ) {
    return {
      code: "API_BUNDLE_TOO_LARGE",
      message: "The uploaded file exceeds Google Play's size limit.",
      suggestion: [
        "AAB files must be under 2 GB, APK files under 1 GB.",
        "Use Android App Bundles (AAB) instead of APK for smaller file sizes.",
        "Run gpc preflight <file> to check bundle size before uploading.",
      ].join("\n"),
    };
  }

  // — Invalid bundle/APK (400)
  if (
    status === 400 &&
    (errorMsg.includes("invalid bundle") ||
      errorMsg.includes("invalid apk") ||
      errorMsg.includes("unable to parse") ||
      errorMsg.includes("malformed apk") ||
      errorMsg.includes("malformed bundle"))
  ) {
    return {
      code: "API_INVALID_BUNDLE",
      message: "Google Play rejected the uploaded file as invalid or malformed.",
      suggestion: [
        "Ensure the file is a properly signed AAB or APK.",
        "Common causes: corrupted file, unsigned bundle, wrong file format.",
        "Run gpc preflight <file> for offline validation.",
        "Rebuild with: ./gradlew bundleRelease",
      ].join("\n"),
    };
  }

  // — Track not found (404)
  if (status === 404 && errorMsg.includes("track") && (errorMsg.includes("not found") || errorMsg.includes("does not exist"))) {
    return {
      code: "API_TRACK_NOT_FOUND",
      message: "The specified track does not exist for this app.",
      suggestion: [
        "Built-in tracks: internal, alpha, beta, production.",
        "List custom tracks with: gpc tracks list",
        "Create a custom track with: gpc tracks create <name>",
      ].join("\n"),
    };
  }

  // — Release notes too long (400)
  if (status === 400 && errorMsg.includes("release notes") && (errorMsg.includes("too long") || errorMsg.includes("character limit"))) {
    return {
      code: "API_RELEASE_NOTES_TOO_LONG",
      message: "Release notes exceed the 500-character limit.",
      suggestion: [
        "Shorten the release notes to 500 characters or fewer per language.",
        "Preview current notes with: gpc releases notes get --track <track>",
      ].join("\n"),
    };
  }

  // — Rollout already completed (400)
  if (status === 400 && (errorMsg.includes("cannot change rollout") || (errorMsg.includes("release") && errorMsg.includes("already completed")))) {
    return {
      code: "API_ROLLOUT_ALREADY_COMPLETED",
      message: "The release is already at full rollout (100%) and cannot be changed.",
      suggestion: [
        "A completed release cannot have its rollout percentage modified.",
        "To deploy a new version: gpc releases upload --track <track>",
      ].join("\n"),
    };
  }

  // — Edit expired (400 FAILED_PRECONDITION)
  if (status === 400 && errorMsg.includes("edit") && (errorMsg.includes("expired") || errorMsg.includes("failed_precondition"))) {
    return {
      code: "API_EDIT_EXPIRED",
      message: "The edit session has expired.",
      suggestion: [
        "Edit sessions last about 1 hour.",
        "Retry the operation — GPC will open a fresh edit automatically.",
      ].join("\n"),
    };
  }

  return undefined;
}

function mapStatusToError(status: number, body: string): { code: string; message?: string; suggestion?: string } {
  // Try specific pattern matching first
  const enhanced = enhanceApiError(status, body);
  if (enhanced) return enhanced;

  // Fall back to generic status-based mapping
  switch (status) {
    case 400:
      return { code: "API_HTTP_400", suggestion: "Check request parameters and try again." };
    case 401:
      return {
        code: "API_UNAUTHORIZED",
        suggestion: "Check that your access token is valid and not expired. Run: gpc doctor",
      };
    case 403:
      return {
        code: "API_FORBIDDEN",
        suggestion: "Ensure the service account has the required permissions. Run: gpc doctor",
      };
    case 404:
      return {
        code: "API_NOT_FOUND",
        suggestion: "Verify the package name and resource IDs are correct. Run: gpc apps list",
      };
    case 413:
      return {
        code: "API_BUNDLE_TOO_LARGE",
        suggestion: "The uploaded file is too large. AAB limit: 2 GB, APK limit: 1 GB.",
      };
    case 429:
      return {
        code: "API_RATE_LIMITED",
        suggestion: "Too many requests. GPC will retry automatically.",
      };
    default:
      if (status >= 500) {
        return {
          code: "API_SERVER_ERROR",
          suggestion: "Google Play API server error. GPC will retry automatically.",
        };
      }
      return { code: `API_HTTP_${status}` };
  }
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function jitteredDelay(base: number, attempt: number, max: number): number {
  const exponential = base * 2 ** attempt;
  const capped = Math.min(exponential, max);
  return capped * (0.5 + Math.random() * 0.5);
}

export function createHttpClient(options: ApiClientOptions): HttpClient {
  const maxRetries = resolveOption(options.maxRetries, "GPC_MAX_RETRIES", 5);
  const timeout = resolveOption(options.timeout, "GPC_TIMEOUT", 30_000);
  const uploadTimeoutExplicit = options.uploadTimeout ?? envInt("GPC_UPLOAD_TIMEOUT");
  const baseDelay = resolveOption(options.baseDelay, "GPC_BASE_DELAY", 1_000);
  const maxDelay = resolveOption(options.maxDelay, "GPC_MAX_DELAY", 60_000);
  const onRetry = options.onRetry;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    let url = `${options.baseUrl ?? BASE_URL}${path}`;
    if (params) {
      const search = new URLSearchParams(params);
      url += `?${search.toString()}`;
    }

    // Fetch token once before retries — the auth layer handles its own caching and mutex
    let token = await options.auth.getAccessToken();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = jitteredDelay(baseDelay, attempt - 1, maxDelay);
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
        };

        const init: RequestInit = {
          method,
          headers,
          signal: controller.signal,
          keepalive: true,
        };

        if (body !== undefined) {
          init.body = JSON.stringify(body);
        }

        const response = await fetch(url, init);

        if (response.ok) {
          const text = await response.text();
          const data = text ? (JSON.parse(text) as T) : ({} as T);
          return { data, status: response.status };
        }

        const errorBody = await response.text();
        const mapped = mapStatusToError(response.status, errorBody);

        const err = new PlayApiError(
          mapped.message ?? `${method} ${path} failed with status ${response.status}: ${sanitizeErrorBody(errorBody)}`,
          mapped.code,
          response.status,
          mapped.suggestion,
        );

        if (isRetryable(response.status) && attempt < maxRetries) {
          lastError = err;
          const delay = jitteredDelay(baseDelay, attempt, maxDelay);
          onRetry?.({
            attempt: attempt + 1,
            method,
            path,
            status: response.status,
            error: err.message,
            delayMs: Math.round(delay),
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        // On 401, refresh token once before giving up
        if (response.status === 401 && attempt < maxRetries) {
          token = await options.auth.getAccessToken();
          lastError = err;
          continue;
        }

        throw err;
      } catch (error) {
        if (error instanceof PlayApiError) {
          throw error;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          const timeoutErr = new PlayApiError(
            `${method} ${path} timed out after ${timeout}ms`,
            "API_TIMEOUT",
            undefined,
            "The request exceeded the configured timeout. Consider increasing the timeout value.",
          );
          if (attempt < maxRetries) {
            lastError = timeoutErr;
            onRetry?.({
              attempt: attempt + 1,
              method,
              path,
              error: timeoutErr.message,
              delayMs: Math.round(jitteredDelay(baseDelay, attempt, maxDelay)),
              timestamp: new Date().toISOString(),
            });
            continue;
          }
          throw timeoutErr;
        }

        const networkErr = new PlayApiError(
          `${method} ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
          "API_NETWORK_ERROR",
          undefined,
          "A network error occurred. Check your internet connection.",
        );
        if (attempt < maxRetries) {
          lastError = networkErr;
          onRetry?.({
            attempt: attempt + 1,
            method,
            path,
            error: networkErr.message,
            delayMs: Math.round(jitteredDelay(baseDelay, attempt, maxDelay)),
            timestamp: new Date().toISOString(),
          });
          continue;
        }
        throw networkErr;
      } finally {
        clearTimeout(timer);
      }
    }

    // Should not reach here, but just in case
    throw (
      lastError ??
      new PlayApiError(
        "Request failed",
        "API_NETWORK_ERROR",
        undefined,
        "Check your network connection and try again. Use --verbose for details.",
      )
    );
  }

  /** Calculate upload timeout: explicit value, or auto-scale from file size (1 MB/s minimum throughput + 30s overhead). */
  function computeUploadTimeout(fileSizeBytes: number): number {
    if (uploadTimeoutExplicit !== undefined) return uploadTimeoutExplicit;
    // Base: 30s overhead + 1s per MB (assumes ~1 MB/s minimum upload speed)
    const sizeMb = fileSizeBytes / (1024 * 1024);
    return Math.max(timeout, 30_000 + Math.ceil(sizeMb) * 1_000);
  }

  async function uploadRequest<T>(
    path: string,
    filePath: string,
    contentType: string,
    baseUrl: string = UPLOAD_BASE_URL,
  ): Promise<ApiResponse<T>> {
    const url = `${baseUrl}${path}`;
    const safeFilePath = validateFilePath(filePath);
    const fileBuffer = await readFile(safeFilePath);
    const effectiveTimeout = computeUploadTimeout(fileBuffer.byteLength);

    // Fetch token once before retries
    let token = await options.auth.getAccessToken();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = jitteredDelay(baseDelay, attempt - 1, maxDelay);
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), effectiveTimeout);

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType,
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
        };

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: fileBuffer,
          signal: controller.signal,
          keepalive: true,
        });

        if (response.ok) {
          const text = await response.text();
          const data = text ? (JSON.parse(text) as T) : ({} as T);
          return { data, status: response.status };
        }

        const errorBody = await response.text();
        const mapped = mapStatusToError(response.status, errorBody);

        const err = new PlayApiError(
          mapped.message ?? `Upload failed with status ${response.status}: ${sanitizeErrorBody(errorBody)}`,
          mapped.code,
          response.status,
          mapped.suggestion,
        );

        if (isRetryable(response.status) && attempt < maxRetries) {
          lastError = err;
          const delay = jitteredDelay(baseDelay, attempt, maxDelay);
          onRetry?.({
            attempt: attempt + 1,
            method: "POST",
            path: `upload ${path}`,
            status: response.status,
            error: err.message,
            delayMs: Math.round(delay),
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        // On 401, refresh token once before giving up
        if (response.status === 401 && attempt < maxRetries) {
          token = await options.auth.getAccessToken();
          lastError = err;
          continue;
        }

        throw err;
      } catch (error) {
        if (error instanceof PlayApiError) {
          throw error;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          const sizeMb = Math.round(fileBuffer.byteLength / (1024 * 1024));
          const timeoutErr = new PlayApiError(
            `POST upload ${path} timed out after ${effectiveTimeout}ms (file: ${sizeMb} MB)`,
            "API_TIMEOUT",
            undefined,
            `Upload timed out. Set GPC_UPLOAD_TIMEOUT=${effectiveTimeout * 2} (ms) or use --timeout to increase.`,
          );
          if (attempt < maxRetries) {
            lastError = timeoutErr;
            onRetry?.({
              attempt: attempt + 1,
              method: "POST",
              path: `upload ${path}`,
              error: timeoutErr.message,
              delayMs: Math.round(jitteredDelay(baseDelay, attempt, maxDelay)),
              timestamp: new Date().toISOString(),
            });
            continue;
          }
          throw timeoutErr;
        }

        const networkErr = new PlayApiError(
          `POST upload ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
          "API_NETWORK_ERROR",
          undefined,
          "A network error occurred. Check your internet connection.",
        );
        if (attempt < maxRetries) {
          lastError = networkErr;
          onRetry?.({
            attempt: attempt + 1,
            method: "POST",
            path: `upload ${path}`,
            error: networkErr.message,
            delayMs: Math.round(jitteredDelay(baseDelay, attempt, maxDelay)),
            timestamp: new Date().toISOString(),
          });
          continue;
        }
        throw networkErr;
      } finally {
        clearTimeout(timer);
      }
    }

    throw (
      lastError ??
      new PlayApiError(
        "Upload request failed",
        "API_NETWORK_ERROR",
        undefined,
        "Check your network connection and try again. Use --verbose for details.",
      )
    );
  }

  return {
    get<T>(path: string, params?: Record<string, string>) {
      return request<T>("GET", path, undefined, params);
    },
    post<T>(path: string, body?: unknown) {
      return request<T>("POST", path, body);
    },
    put<T>(path: string, body?: unknown) {
      return request<T>("PUT", path, body);
    },
    patch<T>(path: string, body?: unknown) {
      return request<T>("PATCH", path, body);
    },
    delete<T>(path: string) {
      return request<T>("DELETE", path);
    },
    upload<T>(path: string, filePath: string, contentType: string) {
      return uploadRequest<T>(path, filePath, contentType);
    },
    async uploadResumable<T>(
      path: string,
      filePath: string,
      contentType: string,
      uploadOptions?: ResumableUploadOptions,
    ) {
      const safeFilePath = validateFilePath(filePath);
      const fileStats = await stat(safeFilePath);

      // For small files, fall back to simple upload (less overhead)
      const threshold = envInt("GPC_UPLOAD_RESUMABLE_THRESHOLD") ?? RESUMABLE_THRESHOLD;
      if (fileStats.size < threshold && !uploadOptions?.resumeSessionUri) {
        // Fire progress callbacks for consistency
        uploadOptions?.onProgress?.({
          bytesUploaded: 0,
          totalBytes: fileStats.size,
          percent: 0,
          bytesPerSecond: 0,
          etaSeconds: 0,
        });
        const result = await uploadRequest<T>(path, safeFilePath, contentType);
        uploadOptions?.onProgress?.({
          bytesUploaded: fileStats.size,
          totalBytes: fileStats.size,
          percent: 100,
          bytesPerSecond: 0,
          etaSeconds: 0,
        });
        return result;
      }

      const uploadUrl = `${UPLOAD_BASE_URL}${path}`;
      return resumableUpload<T>(
        uploadUrl,
        safeFilePath,
        contentType,
        {
          getAccessToken: () => options.auth.getAccessToken(),
          maxRetries,
          baseDelay,
          maxDelay,
          onRetry,
        },
        uploadOptions,
      );
    },
    uploadInternal<T>(path: string, filePath: string, contentType: string) {
      return uploadRequest<T>(path, filePath, contentType, INTERNAL_SHARING_UPLOAD_BASE_URL);
    },
    async download(path: string): Promise<ArrayBuffer> {
      const url = `${options.baseUrl ?? BASE_URL}${path}`;
      const token = await options.auth.getAccessToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Accept-Encoding": "gzip, deflate",
            Connection: "keep-alive",
          },
          signal: controller.signal,
          keepalive: true,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          const mapped = mapStatusToError(response.status, errorBody);
          throw new PlayApiError(
            mapped.message ?? `GET ${path} failed with status ${response.status}: ${sanitizeErrorBody(errorBody)}`,
            mapped.code,
            response.status,
            mapped.suggestion,
          );
        }

        return await response.arrayBuffer();
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
