import { readFile } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";
import { ApiError } from "./errors.js";
import type { ApiClientOptions, ApiResponse } from "./types.js";

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
    // not JSON
  }
  // Truncate raw body to prevent leaking large payloads
  return body.length > 200 ? body.slice(0, 200) + "..." : body;
}

/** Validate upload file path to prevent path traversal. */
function validateFilePath(filePath: string): string {
  const resolved = resolve(filePath);
  if (!isAbsolute(resolved)) {
    throw new ApiError(
      "Invalid file path",
      "API_INVALID_PATH",
      undefined,
      "File path must resolve to an absolute path.",
    );
  }
  // Block obvious traversal patterns in the original input
  if (filePath.includes("\0")) {
    throw new ApiError("Invalid file path: null bytes not allowed", "API_INVALID_PATH");
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

function mapStatusToError(status: number, _body: string): { code: string; suggestion?: string } {
  switch (status) {
    case 401:
      return {
        code: "API_UNAUTHORIZED",
        suggestion: "Check that your access token is valid and not expired.",
      };
    case 403:
      return {
        code: "API_FORBIDDEN",
        suggestion: "Ensure the service account has the required permissions for this operation.",
      };
    case 404:
      return {
        code: "API_NOT_FOUND",
        suggestion: "Verify the package name and resource IDs are correct.",
      };
    case 409:
      return {
        code: "API_EDIT_CONFLICT",
        suggestion: "Another edit may be in progress. Delete the existing edit and retry.",
      };
    case 429:
      return {
        code: "API_RATE_LIMITED",
        suggestion: "Too many requests. The client will retry automatically.",
      };
    default:
      if (status >= 500) {
        return {
          code: "API_SERVER_ERROR",
          suggestion: "Google Play API server error. The client will retry automatically.",
        };
      }
      return { code: `API_HTTP_${status}` };
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function jitteredDelay(base: number, attempt: number, max: number): number {
  const exponential = base * 2 ** attempt;
  const capped = Math.min(exponential, max);
  return capped * (0.5 + Math.random() * 0.5);
}

export function createHttpClient(options: ApiClientOptions): HttpClient {
  const maxRetries = resolveOption(options.maxRetries, "GPC_MAX_RETRIES", 3);
  const timeout = resolveOption(options.timeout, "GPC_TIMEOUT", 30_000);
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
        const { code, suggestion } = mapStatusToError(response.status, errorBody);

        const err = new ApiError(
          `${method} ${path} failed with status ${response.status}: ${sanitizeErrorBody(errorBody)}`,
          code,
          response.status,
          suggestion,
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
        if (error instanceof ApiError) {
          throw error;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          const timeoutErr = new ApiError(
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

        const networkErr = new ApiError(
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
    throw lastError ?? new ApiError("Request failed", "API_NETWORK_ERROR");
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

    // Fetch token once before retries
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
        const { code, suggestion } = mapStatusToError(response.status, errorBody);

        const err = new ApiError(
          `POST upload ${path} failed with status ${response.status}: ${sanitizeErrorBody(errorBody)}`,
          code,
          response.status,
          suggestion,
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
        if (error instanceof ApiError) {
          throw error;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          const timeoutErr = new ApiError(
            `POST upload ${path} timed out after ${timeout}ms`,
            "API_TIMEOUT",
            undefined,
            "The request exceeded the configured timeout. Consider increasing the timeout value.",
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

        const networkErr = new ApiError(
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

    throw lastError ?? new ApiError("Upload request failed", "API_NETWORK_ERROR");
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
          const { code, suggestion } = mapStatusToError(response.status, errorBody);
          throw new ApiError(
            `GET ${path} failed with status ${response.status}: ${sanitizeErrorBody(errorBody)}`,
            code,
            response.status,
            suggestion,
          );
        }

        return await response.arrayBuffer();
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
