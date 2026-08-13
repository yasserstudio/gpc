import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ConfigError } from "./errors.js";
import { getConfigDir } from "./paths.js";
import type { GpcConfig, ProfileConfig } from "./types.js";

async function writeSecureFile(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, { encoding: "utf-8", mode: 0o600 });
  await chmod(filePath, 0o600).catch(() => {});
}

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function validateConfigKey(key: string): void {
  if (!key || key.startsWith(".") || key.endsWith(".") || key.includes("..")) {
    throw new ConfigError(
      `Invalid config key: "${key}"`,
      "CONFIG_INVALID_KEY",
      "Config keys must be non-empty, cannot start or end with a dot, and cannot contain consecutive dots. Example: auth.serviceAccount",
    );
  }
  const parts = key.split(".");
  for (const part of parts) {
    if (DANGEROUS_KEYS.has(part)) {
      throw new ConfigError(
        `Unsafe config key: "${key}" contains forbidden key "${part}"`,
        "CONFIG_INVALID_KEY",
        `The key "${part}" is reserved and cannot be used in config paths.`,
      );
    }
  }
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  validateConfigKey(key);
  const configPath = join(getConfigDir(), "config.json");

  let existing: Record<string, unknown> = {};
  try {
    const content = await readFile(configPath, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // File doesn't exist yet — start fresh
  }

  // Support dotted keys like "auth.serviceAccount"
  const keys = key.split(".");
  let target = existing;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i] as string;
    if (typeof target[k] !== "object" || target[k] === null) {
      target[k] = {};
    }
    target = target[k] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1] as string;
  target[lastKey] = value;

  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  await writeSecureFile(configPath, JSON.stringify(existing, null, 2) + "\n");
}

export async function deleteConfigValue(key: string): Promise<void> {
  validateConfigKey(key);
  const configPath = join(getConfigDir(), "config.json");

  let content: string;
  try {
    content = await readFile(configPath, "utf-8");
  } catch {
    return; // Nothing to delete
  }
  let existing: Record<string, unknown>;
  try {
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new ConfigError(
      `Invalid JSON in config file: ${configPath}`,
      "CONFIG_INVALID_JSON",
      `Check ${configPath} for syntax errors.`,
    );
  }

  const keys = key.split(".");
  let target = existing;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i] as string;
    if (typeof target[k] !== "object" || target[k] === null) return;
    target = target[k] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1] as string;
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete target[lastKey];

  await writeSecureFile(configPath, JSON.stringify(existing, null, 2) + "\n");
}

export async function setProfileConfig(profileName: string, config: ProfileConfig): Promise<void> {
  if (!profileName || DANGEROUS_KEYS.has(profileName)) {
    throw new ConfigError(
      `Invalid profile name: "${profileName}"`,
      "CONFIG_INVALID_KEY",
      `Profile names must be non-empty and cannot be "${profileName}".`,
    );
  }
  const configPath = join(getConfigDir(), "config.json");

  let existing: Record<string, unknown> = {};
  try {
    const content = await readFile(configPath, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // start fresh
  }

  if (typeof existing["profiles"] !== "object" || existing["profiles"] === null) {
    existing["profiles"] = {};
  }
  (existing["profiles"] as Record<string, unknown>)[profileName] = config;

  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  await writeSecureFile(configPath, JSON.stringify(existing, null, 2) + "\n");
}

export async function deleteProfile(profileName: string): Promise<boolean> {
  const configPath = join(getConfigDir(), "config.json");

  let existing: Record<string, unknown>;
  try {
    const content = await readFile(configPath, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return false;
  }

  const profiles = existing["profiles"] as Record<string, unknown> | undefined;
  if (!profiles || !(profileName in profiles)) return false;

  existing["profiles"] = Object.fromEntries(
    Object.entries(profiles).filter(([key]) => key !== profileName),
  );
  await writeSecureFile(configPath, JSON.stringify(existing, null, 2) + "\n");
  return true;
}

export async function listProfiles(): Promise<string[]> {
  const configPath = join(getConfigDir(), "config.json");

  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content) as Record<string, unknown>;
    const profiles = config["profiles"] as Record<string, unknown> | undefined;
    return profiles ? Object.keys(profiles) : [];
  } catch {
    return [];
  }
}

const PLUGIN_APPROVAL_POLICY_VERSION = 1;

function readStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function isRelativePluginPath(pluginName: string): boolean {
  return pluginName.startsWith(".");
}

/** Canonical identity used for approval comparisons across projects. */
export function resolvePluginApprovalId(pluginName: string, cwd = process.cwd()): string {
  if (pluginName.startsWith("file:")) {
    try {
      return pathToFileURL(fileURLToPath(pluginName)).href;
    } catch {
      return pluginName;
    }
  }
  if (pluginName.startsWith(".") || isAbsolute(pluginName)) {
    return pathToFileURL(resolve(cwd, pluginName)).href;
  }
  return pluginName;
}

/**
 * Grandfather approvals that predate manifest permissions exactly once.
 * Later manual additions to approvedPlugins are not added to the legacy set.
 */
export async function ensurePluginApprovalPolicy(cwd = process.cwd()): Promise<void> {
  const configPath = join(getConfigDir(), "config.json");
  let existing: Record<string, unknown>;
  try {
    existing = JSON.parse(await readFile(configPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return;
  }

  if (existing["pluginApprovalPolicyVersion"] === PLUGIN_APPROVAL_POLICY_VERSION) return;

  // Historical relative approvals did not record which project they belonged
  // to. Binding them to the first post-upgrade cwd could approve an unrelated
  // repository, so require an explicit re-approval instead.
  const approved = readStringList(existing["approvedPlugins"])
    .filter((name) => !isRelativePluginPath(name))
    .map((name) => resolvePluginApprovalId(name, cwd));
  const priorLegacy = readStringList(existing["legacyApprovedPlugins"])
    .filter((name) => !isRelativePluginPath(name))
    .map((name) => resolvePluginApprovalId(name, cwd));
  existing["approvedPlugins"] = [...new Set(approved)];
  existing["legacyApprovedPlugins"] = [...new Set([...priorLegacy, ...approved])];
  existing["pluginApprovalPolicyVersion"] = PLUGIN_APPROVAL_POLICY_VERSION;
  await writeSecureFile(configPath, JSON.stringify(existing, null, 2) + "\n");
}

export async function approvePlugin(pluginName: string): Promise<void> {
  await ensurePluginApprovalPolicy();
  const configPath = join(getConfigDir(), "config.json");

  let existing: Record<string, unknown> = {};
  try {
    const content = await readFile(configPath, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // start fresh
  }

  const approvalId = resolvePluginApprovalId(pluginName);
  const approved = readStringList(existing["approvedPlugins"]);
  if (!approved.includes(approvalId)) {
    approved.push(approvalId);
  }
  existing["approvedPlugins"] = approved;
  existing["legacyApprovedPlugins"] = readStringList(existing["legacyApprovedPlugins"]);
  existing["pluginApprovalPolicyVersion"] = PLUGIN_APPROVAL_POLICY_VERSION;

  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  await writeSecureFile(configPath, JSON.stringify(existing, null, 2) + "\n");
}

export async function revokePluginApproval(pluginName: string): Promise<boolean> {
  await ensurePluginApprovalPolicy();
  const configPath = join(getConfigDir(), "config.json");

  let existing: Record<string, unknown>;
  try {
    const content = await readFile(configPath, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return false;
  }

  const approvalId = resolvePluginApprovalId(pluginName);
  const approved = readStringList(existing["approvedPlugins"]);
  const index = approved.findIndex((name) => name === approvalId || name === pluginName);
  if (index === -1) return false;

  approved.splice(index, 1);
  existing["approvedPlugins"] = approved;
  const legacy = readStringList(existing["legacyApprovedPlugins"]);
  existing["legacyApprovedPlugins"] = legacy.filter(
    (name) => name !== approvalId && name !== pluginName,
  );
  await writeSecureFile(configPath, JSON.stringify(existing, null, 2) + "\n");
  return true;
}

export async function initConfig(config: GpcConfig): Promise<string> {
  const configDir = getConfigDir();
  const configPath = join(configDir, "config.json");

  await mkdir(configDir, { recursive: true, mode: 0o700 });
  await writeSecureFile(configPath, JSON.stringify(config, null, 2) + "\n");

  return configPath;
}
