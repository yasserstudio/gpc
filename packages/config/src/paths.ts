import { homedir } from "node:os";
import { join, isAbsolute } from "node:path";

// Cache homedir() — it calls an OS function, no need to repeat per call
const HOME = homedir();

function resolveXdg(envVar: string, fallback: string): string {
  const xdg = process.env[envVar];
  if (xdg && isAbsolute(xdg)) return xdg;
  return fallback;
}

export function getConfigDir(): string {
  const base = resolveXdg("XDG_CONFIG_HOME", join(HOME, ".config"));
  return join(base, "gpc");
}

export function getUserConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function getDataDir(): string {
  const base = resolveXdg("XDG_DATA_HOME", join(HOME, ".local", "share"));
  return join(base, "gpc");
}

export function getCacheDir(): string {
  const base = resolveXdg("XDG_CACHE_HOME", join(HOME, ".cache"));
  return join(base, "gpc");
}
