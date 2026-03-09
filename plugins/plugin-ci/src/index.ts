import { definePlugin } from "@gpc-cli/plugin-sdk";
import type { CommandEvent, CommandResult, PluginError } from "@gpc-cli/plugin-sdk";

export const PLUGIN_CI_VERSION = "0.8.0";

// ---------------------------------------------------------------------------
// CI environment detection
// ---------------------------------------------------------------------------

export interface CIEnvironment {
  /** Whether we're running in a CI environment */
  isCI: boolean;

  /** CI provider name (if detected) */
  provider?: string;

  /** Build number or run ID */
  buildId?: string;

  /** Branch name */
  branch?: string;

  /** Commit SHA */
  commitSha?: string;

  /** Whether GitHub Actions step summary is available */
  hasStepSummary: boolean;
}

export function detectCIEnvironment(): CIEnvironment {
  const env = process.env;

  // GitHub Actions
  if (env["GITHUB_ACTIONS"] === "true") {
    return {
      isCI: true,
      provider: "github-actions",
      buildId: env["GITHUB_RUN_ID"],
      branch: env["GITHUB_REF_NAME"],
      commitSha: env["GITHUB_SHA"],
      hasStepSummary: !!env["GITHUB_STEP_SUMMARY"],
    };
  }

  // GitLab CI
  if (env["GITLAB_CI"] === "true") {
    return {
      isCI: true,
      provider: "gitlab-ci",
      buildId: env["CI_JOB_ID"],
      branch: env["CI_COMMIT_BRANCH"],
      commitSha: env["CI_COMMIT_SHA"],
      hasStepSummary: false,
    };
  }

  // Jenkins
  if (env["JENKINS_URL"]) {
    return {
      isCI: true,
      provider: "jenkins",
      buildId: env["BUILD_NUMBER"],
      branch: env["BRANCH_NAME"],
      commitSha: env["GIT_COMMIT"],
      hasStepSummary: false,
    };
  }

  // CircleCI
  if (env["CIRCLECI"] === "true") {
    return {
      isCI: true,
      provider: "circleci",
      buildId: env["CIRCLE_BUILD_NUM"],
      branch: env["CIRCLE_BRANCH"],
      commitSha: env["CIRCLE_SHA1"],
      hasStepSummary: false,
    };
  }

  // Bitrise
  if (env["BITRISE_IO"] === "true") {
    return {
      isCI: true,
      provider: "bitrise",
      buildId: env["BITRISE_BUILD_NUMBER"],
      branch: env["BITRISE_GIT_BRANCH"],
      commitSha: env["BITRISE_GIT_COMMIT"],
      hasStepSummary: false,
    };
  }

  // Generic CI detection
  if (env["CI"] === "true" || env["CI"] === "1") {
    return {
      isCI: true,
      provider: "unknown",
      hasStepSummary: false,
    };
  }

  return { isCI: false, hasStepSummary: false };
}

// ---------------------------------------------------------------------------
// GitHub Actions step summary
// ---------------------------------------------------------------------------

import { appendFile } from "node:fs/promises";

export async function writeStepSummary(markdown: string): Promise<void> {
  const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
  if (!summaryPath) return;
  await appendFile(summaryPath, markdown + "\n");
}

function formatCommandSummary(event: CommandEvent, result: CommandResult): string {
  const status = result.success ? "✅" : "❌";
  const lines = [
    `### ${status} \`gpc ${event.command}\``,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| App | \`${event.app ?? "N/A"}\` |`,
    `| Duration | ${result.durationMs}ms |`,
    `| Exit Code | ${result.exitCode} |`,
  ];
  return lines.join("\n");
}

function formatErrorSummary(event: CommandEvent, error: PluginError): string {
  const lines = [
    `### ❌ \`gpc ${event.command}\` failed`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| App | \`${event.app ?? "N/A"}\` |`,
    `| Error Code | \`${error.code}\` |`,
    `| Message | ${error.message} |`,
  ];
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

export const ciPlugin = definePlugin({
  name: "@gpc-cli/plugin-ci",
  version: PLUGIN_CI_VERSION,

  register(hooks) {
    const ci = detectCIEnvironment();

    // Only activate hooks when running in CI
    if (!ci.isCI) return;

    hooks.afterCommand(async (event: CommandEvent, result: CommandResult) => {
      if (ci.hasStepSummary) {
        await writeStepSummary(formatCommandSummary(event, result));
      }
    });

    hooks.onError(async (event: CommandEvent, error: PluginError) => {
      if (ci.hasStepSummary) {
        await writeStepSummary(formatErrorSummary(event, error));
      }
    });
  },
});
