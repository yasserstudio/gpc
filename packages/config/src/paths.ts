import { homedir } from "node:os";
import { join } from "node:path";

export function getConfigDir(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg || join(homedir(), ".config");
  return join(base, "gpc");
}

export function getUserConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function getDataDir(): string {
  const xdg = process.env["XDG_DATA_HOME"];
  const base = xdg || join(homedir(), ".local", "share");
  return join(base, "gpc");
}
