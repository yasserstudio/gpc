// Named exports only. No default export.

import { readFile } from "node:fs/promises";
import type { PreflightConfig, FindingSeverity } from "./types.js";
import { DEFAULT_PREFLIGHT_CONFIG } from "./types.js";

const VALID_SEVERITIES = new Set(["critical", "error", "warning", "info"]);

export async function loadPreflightConfig(configPath?: string): Promise<PreflightConfig> {
  const path = configPath || ".preflightrc.json";

  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return { ...DEFAULT_PREFLIGHT_CONFIG };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Invalid JSON in ${path}. Check the file for syntax errors.`,
    );
  }

  const config: PreflightConfig = { ...DEFAULT_PREFLIGHT_CONFIG };

  if (typeof parsed["failOn"] === "string" && VALID_SEVERITIES.has(parsed["failOn"])) {
    config.failOn = parsed["failOn"] as FindingSeverity;
  }

  if (typeof parsed["targetSdkMinimum"] === "number" && parsed["targetSdkMinimum"] > 0) {
    config.targetSdkMinimum = parsed["targetSdkMinimum"];
  }

  if (typeof parsed["maxDownloadSizeMb"] === "number" && parsed["maxDownloadSizeMb"] > 0) {
    config.maxDownloadSizeMb = parsed["maxDownloadSizeMb"];
  }

  if (Array.isArray(parsed["allowedPermissions"])) {
    config.allowedPermissions = (parsed["allowedPermissions"] as unknown[]).filter(
      (v): v is string => typeof v === "string",
    );
  }

  if (Array.isArray(parsed["disabledRules"])) {
    config.disabledRules = (parsed["disabledRules"] as unknown[]).filter(
      (v): v is string => typeof v === "string",
    );
  }

  if (typeof parsed["severityOverrides"] === "object" && parsed["severityOverrides"] !== null) {
    const overrides: Record<string, FindingSeverity> = {};
    for (const [key, val] of Object.entries(parsed["severityOverrides"] as Record<string, unknown>)) {
      if (typeof val === "string" && VALID_SEVERITIES.has(val)) {
        overrides[key] = val as FindingSeverity;
      }
    }
    config.severityOverrides = overrides;
  }

  return config;
}
