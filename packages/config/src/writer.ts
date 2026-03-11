import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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

export async function setProfileConfig(profileName: string, config: ProfileConfig): Promise<void> {
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

export async function approvePlugin(pluginName: string): Promise<void> {
  const configPath = join(getConfigDir(), "config.json");

  let existing: Record<string, unknown> = {};
  try {
    const content = await readFile(configPath, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    // start fresh
  }

  const approved = (existing["approvedPlugins"] as string[] | undefined) ?? [];
  if (!approved.includes(pluginName)) {
    approved.push(pluginName);
  }
  existing["approvedPlugins"] = approved;

  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  await writeSecureFile(configPath, JSON.stringify(existing, null, 2) + "\n");
}

export async function revokePluginApproval(pluginName: string): Promise<boolean> {
  const configPath = join(getConfigDir(), "config.json");

  let existing: Record<string, unknown>;
  try {
    const content = await readFile(configPath, "utf-8");
    existing = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return false;
  }

  const approved = (existing["approvedPlugins"] as string[] | undefined) ?? [];
  const index = approved.indexOf(pluginName);
  if (index === -1) return false;

  approved.splice(index, 1);
  existing["approvedPlugins"] = approved;
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
