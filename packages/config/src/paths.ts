import { homedir } from "node:os";
import { join, isAbsolute } from "node:path";

function resolveXdg(envVar: string, fallback: string): string {
  const xdg = process.env[envVar];
  if (xdg && isAbsolute(xdg)) return xdg;
  return fallback;
}

export function getConfigDir(): string {
  const base = resolveXdg("XDG_CONFIG_HOME", join(homedir(), ".config"));
  return join(base, "gpc");
}

export function getUserConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function getDataDir(): string {
  const base = resolveXdg("XDG_DATA_HOME", join(homedir(), ".local", "share"));
  return join(base, "gpc");
}

export function getCacheDir(): string {
  const base = resolveXdg("XDG_CACHE_HOME", join(homedir(), ".cache"));
  return join(base, "gpc");
}
