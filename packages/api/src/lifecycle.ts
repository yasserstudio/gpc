import type { ApiLifecycleHooks, ApiRequestEvent, ApiResponseEvent } from "./types.js";

const SENSITIVE_PATH_SEGMENTS = /\/(tokens|purchaseToken)\/([^/?#:]*)/gi;

let defaultLifecycleHooks: ApiLifecycleHooks | undefined;

/** Configure process-wide lifecycle hooks for clients created without explicit hooks. */
export function setDefaultApiLifecycleHooks(hooks?: ApiLifecycleHooks): void {
  defaultLifecycleHooks = hooks;
}

export function getDefaultApiLifecycleHooks(): ApiLifecycleHooks | undefined {
  return defaultLifecycleHooks;
}

/** Send a standalone GPC API request through the configured lifecycle observers. */
export function fetchWithApiLifecycle(
  input: string | URL,
  init: RequestInit,
  eventPath: string,
): Promise<Response> {
  return fetchWithLifecycle(input, init, getDefaultApiLifecycleHooks(), eventPath);
}

/** Remove query strings and redact purchase tokens before exposing a path to hooks. */
export function redactRequestPath(pathOrUrl: string): string {
  let path = pathOrUrl.split("?", 1)[0] ?? pathOrUrl;
  try {
    path = new URL(pathOrUrl).pathname;
  } catch {
    // Relative API path — use it as-is.
  }
  return path.replace(SENSITIVE_PATH_SEGMENTS, (_match, segment: string) => {
    return `/${segment}/***REDACTED***`;
  });
}

async function runBeforeRequest(
  hooks: ApiLifecycleHooks | undefined,
  event: ApiRequestEvent,
): Promise<void> {
  try {
    await hooks?.beforeRequest?.(event);
  } catch {
    // Observability hooks must never block API requests.
  }
}

async function runAfterResponse(
  hooks: ApiLifecycleHooks | undefined,
  event: ApiRequestEvent,
  response: ApiResponseEvent,
): Promise<void> {
  try {
    await hooks?.afterResponse?.(event, response);
  } catch {
    // Observability hooks must never change API results.
  }
}

/** Fetch wrapper used by every transport path so hooks describe actual network attempts. */
export async function fetchWithLifecycle(
  input: string | URL,
  init: RequestInit,
  hooks: ApiLifecycleHooks | undefined,
  eventPath: string,
): Promise<Response> {
  const event: ApiRequestEvent = {
    method: init.method ?? "GET",
    path: redactRequestPath(eventPath),
    startedAt: new Date(),
  };
  await runBeforeRequest(hooks, event);

  try {
    const response = await fetch(input, init);
    await runAfterResponse(hooks, event, {
      status: response.status,
      durationMs: Date.now() - event.startedAt.getTime(),
      ok: response.ok,
    });
    return response;
  } catch (error) {
    await runAfterResponse(hooks, event, {
      status: 0,
      durationMs: Date.now() - event.startedAt.getTime(),
      ok: false,
    });
    throw error;
  }
}
