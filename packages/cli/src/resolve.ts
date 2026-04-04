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
