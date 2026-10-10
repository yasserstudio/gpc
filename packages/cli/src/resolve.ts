// Named exports only. No default export.

import type { GpcConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient, createReportingClient } from "@gpc-cli/api";

export function resolvePackageName(
  packageArg: string | undefined,
  config: { app?: string },
): string {
  const name = packageArg || config.app || process.env["GPC_APP"];
  if (!name) {
    throw Object.assign(new Error("No package name"), {
      code: "MISSING_PACKAGE_NAME",
      exitCode: 2,
      suggestion: "Use --app <package> or gpc config set app <package>",
    });
  }
  assertValidPackageName(name);
  return name;
}

/**
 * Rejects a malformed name before it reaches a URL: " com.x" (a quoting slip) or
 * "=com.x" (`-a=com.x`, where Commander keeps the "=") otherwise surface as a
 * confusing 404 from Google.
 */
export function assertValidPackageName(name: string): void {
  if (!PACKAGE_NAME_PATTERN.test(name)) {
    throw Object.assign(new Error(`Invalid package name "${name}"`), {
      code: "INVALID_PACKAGE_NAME",
      exitCode: 2,
      suggestion:
        "Use the application ID, e.g. --app com.example.app (segments start with a letter; letters, digits and _ only). For the short flag, use -a com.example.app, not -a=com.example.app.",
    });
  }
}

const PACKAGE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export async function getClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createApiClient({ auth });
}

export async function getReportingClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createReportingClient({ auth });
}

/**
 * Raw auth client for endpoints outside the Play API clients. `storage: true` adds the
 * read-only GCS scope needed for the Play bulk-reports bucket; ordinary tokens never
 * carry it (least privilege), and the token cache keys default- and storage-scoped
 * tokens separately so they cannot serve each other.
 */
export async function getAuthClient(config: GpcConfig, opts?: { storage?: boolean }) {
  const { DEFAULT_SCOPES, STORAGE_READ_ONLY_SCOPE } = await import("@gpc-cli/auth");
  return resolveAuth({
    serviceAccountPath: config.auth?.serviceAccount,
    scopes: opts?.storage ? [...DEFAULT_SCOPES, STORAGE_READ_ONLY_SCOPE] : undefined,
  });
}
