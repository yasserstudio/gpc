import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getCacheDir } from "@gpc-cli/config";

export interface TrainStage {
  track: string;
  rollout: number;
  /** ISO 8601 duration or human string like "2d", "7d" */
  after?: string;
}

export interface TrainGates {
  crashes?: { max: number };
  anr?: { max: number };
}

export interface TrainConfig {
  stages: TrainStage[];
  gates?: TrainGates;
}

export type TrainStatus = "idle" | "running" | "paused" | "completed" | "aborted";

export interface TrainState {
  packageName: string;
  status: TrainStatus;
  currentStage: number;
  startedAt?: string;
  updatedAt: string;
  stages: Array<
    TrainStage & {
      executedAt?: string;
      scheduledAt?: string;
    }
  >;
  gates?: TrainGates;
}

function stateFile(packageName: string): string {
  return join(getCacheDir(), `train-${packageName}.json`);
}

export async function readTrainState(packageName: string): Promise<TrainState | null> {
  const path = stateFile(packageName);
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as TrainState;
  } catch {
    return null;
  }
}

export async function writeTrainState(packageName: string, state: TrainState): Promise<void> {
  const path = stateFile(packageName);
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2), "utf-8");
}

export async function clearTrainState(packageName: string): Promise<void> {
  const { unlink } = await import("node:fs/promises");
  const path = stateFile(packageName);
  await unlink(path).catch(() => {});
}

/** Parse a duration string like "2d", "7d", "1h" into milliseconds. */
export function parseDuration(s: string): number {
  const match = /^(\d+)(d|h|m)$/.exec(s.trim());
  if (!match) return 0;
  const n = parseInt(match[1] ?? "0", 10);
  switch (match[2]) {
    case "d":
      return n * 24 * 60 * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    case "m":
      return n * 60 * 1000;
    default:
      return 0;
  }
}
