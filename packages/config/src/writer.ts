import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getConfigDir } from "./paths.js";
import type { GpcConfig } from "./types.js";

export async function setConfigValue(
  key: string,
  value: string,
): Promise<void> {
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
    const k = keys[i]!;
    if (typeof target[k] !== "object" || target[k] === null) {
      target[k] = {};
    }
    target = target[k] as Record<string, unknown>;
  }
  target[keys[keys.length - 1]!] = value;

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
}

export async function initConfig(config: GpcConfig): Promise<string> {
  const configDir = getConfigDir();
  const configPath = join(configDir, "config.json");

  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  return configPath;
}
