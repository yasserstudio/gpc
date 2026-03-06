import { readFile } from "node:fs/promises";
import { ApiError } from "./errors.js";
import type { ApiClientOptions, ApiResponse } from "./types.js";

const BASE_URL =
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

const UPLOAD_BASE_URL =
  "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications";

export interface HttpClient {
  get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiResponse<T>>;
  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>>;
  delete<T>(path: string): Promise<ApiResponse<T>>;
  upload<T>(path: string, filePath: string, contentType: string): Promise<ApiResponse<T>>;
}

function envInt(name: string): number | undefined {
  const val = process.env[name];
  if (val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function resolveOption(
  explicit: number | undefined,
  envName: string,
  fallback: number,
): number {
  return explicit ?? envInt(envName) ?? fallback;
}

function mapStatusToError(
  status: number,
  body: string,
): { code: string; suggestion?: string } {
  switch (status) {
    case 401:
      return {
        code: "API_UNAUTHORIZED",
        suggestion: "Check that your access token is valid and not expired.",
      };
    case 403:
      return {
        code: "API_FORBIDDEN",
        suggestion:
          "Ensure the service account has the required permissions for this operation.",
      };
    case 404:
      return {
        code: "API_NOT_FOUND",
        suggestion: "Verify the package name and resource IDs are correct.",
      };
    case 409:
      return {
        code: "API_EDIT_CONFLICT",
        suggestion:
          "Another edit may be in progress. Delete the existing edit and retry.",
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

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    let url = `${BASE_URL}${path}`;
    if (params) {
      const search = new URLSearchParams(params);
      url += `?${search.toString()}`;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = jitteredDelay(baseDelay, attempt - 1, maxDelay);
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const token = await options.auth.getAccessToken();

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const init: RequestInit = {
          method,
          headers,
          signal: controller.signal,
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
          `${method} ${path} failed with status ${response.status}: ${errorBody}`,
          code,
          response.status,
          suggestion,
        );

        if (isRetryable(response.status) && attempt < maxRetries) {
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
  ): Promise<ApiResponse<T>> {
    const url = `${UPLOAD_BASE_URL}${path}`;
    const fileBuffer = await readFile(filePath);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = jitteredDelay(baseDelay, attempt - 1, maxDelay);
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const token = await options.auth.getAccessToken();

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType,
        };

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: fileBuffer,
          signal: controller.signal,
        });

        if (response.ok) {
          const text = await response.text();
          const data = text ? (JSON.parse(text) as T) : ({} as T);
          return { data, status: response.status };
        }

        const errorBody = await response.text();
        const { code, suggestion } = mapStatusToError(response.status, errorBody);

        const err = new ApiError(
          `POST upload ${path} failed with status ${response.status}: ${errorBody}`,
          code,
          response.status,
          suggestion,
        );

        if (isRetryable(response.status) && attempt < maxRetries) {
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
  };
}
