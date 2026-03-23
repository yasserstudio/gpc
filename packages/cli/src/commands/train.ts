import { resolvePackageName } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient, createReportingClient } from "@gpc-cli/api";
import {
  startTrain,
  getTrainStatus,
  pauseTrain,
  abortTrain,
  advanceTrain,
  formatOutput,
} from "@gpc-cli/core";
import type { TrainConfig } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";


async function getClients(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return {
    apiClient: createApiClient({ auth }),
    reportingClient: createReportingClient({ auth }),
  };
}

async function loadTrainConfig(file: string): Promise<TrainConfig> {
  const { readFile } = await import("node:fs/promises");
  try {
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw) as TrainConfig;
  } catch {
    console.error(`Error: Could not read train config from "${file}"`);
    process.exit(2);
  }
}

export function registerTrainCommands(program: Command): void {
  const train = program
    .command("train")
    .description("Manage config-driven staged rollout release trains");

  train
    .command("start")
    .description("Start a release train from a config file")
    .option("--config <file>", "Train config file (JSON)", ".gpcrc-train.json")
    .option("--force", "Restart even if a train is already running")
    .action(async (options) => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      const trainConfig = await loadTrainConfig(options.config as string);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "train start",
            action: "start release train",
            target: packageName,
            details: { stages: trainConfig.stages.length, gates: trainConfig.gates },
          },
          format,
          formatOutput,
        );
        return;
      }

      const { apiClient } = await getClients(config);

      try {
        const state = await startTrain(apiClient, packageName, trainConfig, {
          force: options.force as boolean,
        });
        console.log(formatOutput(state, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  train
    .command("status")
    .description("Show current release train state")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      try {
        const state = await getTrainStatus(packageName);
        if (!state) {
          if (format === "json") {
            console.log(formatOutput(null, format));
          } else {
            console.log(`No active release train for ${packageName}.`);
          }
          return;
        }
        console.log(formatOutput(state, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  train
    .command("advance")
    .description("Advance the train to the next stage (after delay and gate checks pass)")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);
      const { apiClient, reportingClient } = await getClients(config);

      try {
        const state = await advanceTrain(apiClient, reportingClient, packageName);
        if (!state) {
          console.log(`No active release train for ${packageName}.`);
          return;
        }
        console.log(formatOutput(state, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  train
    .command("pause")
    .description("Pause the release train")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      try {
        const state = await pauseTrain(packageName);
        if (!state) {
          console.log(`No active release train for ${packageName}.`);
          return;
        }
        console.log(formatOutput(state, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  train
    .command("abort")
    .description("Abort and clear the release train state")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);

      await requireConfirm(`Abort release train for ${packageName}?`, program);

      try {
        await abortTrain(packageName);
        console.log(`Release train aborted for ${packageName}.`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
