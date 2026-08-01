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
  return name;
}

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
