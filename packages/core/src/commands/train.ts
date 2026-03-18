import type { PlayApiClient } from "@gpc-cli/api";
import type { ReportingApiClient } from "@gpc-cli/api";
import {
  readTrainState,
  writeTrainState,
  clearTrainState,
  parseDuration,
} from "../utils/train-state.js";
import type { TrainConfig, TrainState } from "../utils/train-state.js";
import { updateRollout } from "./releases.js";
import { getVitalsCrashes, getVitalsAnr } from "./vitals.js";

export type { TrainConfig, TrainState };

export interface StartTrainOptions {
  force?: boolean;
}

/** Start or resume a release train for a package. */
export async function startTrain(
  apiClient: PlayApiClient,
  packageName: string,
  config: TrainConfig,
  options?: StartTrainOptions,
): Promise<TrainState> {
  const existing = await readTrainState(packageName);

  if (existing && existing.status === "running" && !options?.force) {
    return existing;
  }

  const now = new Date().toISOString();
  const state: TrainState = {
    packageName,
    status: "running",
    currentStage: 0,
    startedAt: now,
    updatedAt: now,
    stages: config.stages.map((s, i) => ({
      ...s,
      scheduledAt: i === 0 ? now : undefined,
    })),
    gates: config.gates,
  };

  await writeTrainState(packageName, state);

  // Execute stage 0 immediately
  await executeStage(apiClient, packageName, state, 0);

  return state;
}

/** Get current train status. */
export async function getTrainStatus(packageName: string): Promise<TrainState | null> {
  return readTrainState(packageName);
}

/** Pause a running train. */
export async function pauseTrain(packageName: string): Promise<TrainState | null> {
  const state = await readTrainState(packageName);
  if (!state || state.status !== "running") return state;

  state.status = "paused";
  state.updatedAt = new Date().toISOString();
  await writeTrainState(packageName, state);
  return state;
}

/** Abort a train and clear state. */
export async function abortTrain(packageName: string): Promise<void> {
  await clearTrainState(packageName);
}

/** Advance the train to the next eligible stage. */
export async function advanceTrain(
  apiClient: PlayApiClient,
  reportingClient: ReportingApiClient,
  packageName: string,
): Promise<TrainState | null> {
  const state = await readTrainState(packageName);
  if (!state || state.status !== "running") return state;

  const nextStage = state.currentStage + 1;
  if (nextStage >= state.stages.length) {
    state.status = "completed";
    state.updatedAt = new Date().toISOString();
    await writeTrainState(packageName, state);
    return state;
  }

  const nextStageConfig = state.stages[nextStage]!;

  // Check `after` delay
  if (nextStageConfig.after) {
    const delayMs = parseDuration(nextStageConfig.after);
    const currentStageConfig = state.stages[state.currentStage];
    const executedAt = currentStageConfig?.executedAt;
    if (executedAt && delayMs > 0) {
      const elapsed = Date.now() - new Date(executedAt).getTime();
      if (elapsed < delayMs) {
        // Not ready yet — schedule time for info
        const readyAt = new Date(new Date(executedAt).getTime() + delayMs).toISOString();
        nextStageConfig.scheduledAt = readyAt;
        await writeTrainState(packageName, state);
        return state;
      }
    }
  }

  // Check vitals gates before advancing
  if (state.gates) {
    if (state.gates.crashes?.max !== undefined) {
      const result = await getVitalsCrashes(reportingClient, packageName, { days: 1 });
      const latestRow = result.rows?.[result.rows.length - 1];
      const firstMetric = latestRow?.metrics ? Object.keys(latestRow.metrics)[0] : undefined;
      const value = firstMetric
        ? Number(latestRow?.metrics[firstMetric]?.decimalValue?.value)
        : undefined;
      if (value !== undefined && value > state.gates.crashes.max / 100) {
        state.status = "paused";
        state.updatedAt = new Date().toISOString();
        await writeTrainState(packageName, state);
        throw new Error(
          `Crash gate failed: ${(value * 100).toFixed(3)}% > max ${state.gates.crashes.max}%. Train paused.`,
        );
      }
    }

    if (state.gates.anr?.max !== undefined) {
      const result = await getVitalsAnr(reportingClient, packageName, { days: 1 });
      const latestRow = result.rows?.[result.rows.length - 1];
      const firstMetric = latestRow?.metrics ? Object.keys(latestRow.metrics)[0] : undefined;
      const value = firstMetric
        ? Number(latestRow?.metrics[firstMetric]?.decimalValue?.value)
        : undefined;
      if (value !== undefined && value > state.gates.anr.max / 100) {
        state.status = "paused";
        state.updatedAt = new Date().toISOString();
        await writeTrainState(packageName, state);
        throw new Error(
          `ANR gate failed: ${(value * 100).toFixed(3)}% > max ${state.gates.anr.max}%. Train paused.`,
        );
      }
    }
  }

  await executeStage(apiClient, packageName, state, nextStage);
  return state;
}

async function executeStage(
  apiClient: PlayApiClient,
  packageName: string,
  state: TrainState,
  stageIndex: number,
): Promise<void> {
  const stage = state.stages[stageIndex]!;
  const rolloutFraction = stage.rollout / 100;

  await updateRollout(apiClient, packageName, stage.track, "increase", rolloutFraction);

  stage.executedAt = new Date().toISOString();
  state.currentStage = stageIndex;
  state.updatedAt = new Date().toISOString();
  await writeTrainState(packageName, state);
}
