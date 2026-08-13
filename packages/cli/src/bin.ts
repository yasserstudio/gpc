import { existsSync } from "node:fs";

import { initAudit, sendWebhook } from "@gpc-cli/core";
import type { WebhookPayload } from "@gpc-cli/core";
import { getConfigDir, loadConfig, getUserConfigPath } from "@gpc-cli/config";

import { handleCliError } from "./error-handler.js";
import { setupNetworking } from "./networking.js";
import { loadPlugins } from "./plugins.js";
import { createProgram, runProgram } from "./program.js";
import { checkForUpdate, formatUpdateNotification } from "./update-check.js";
import { sanitizeWebhookCommandArgs } from "./webhook-args.js";

if (process.env["GPC_NO_COLOR"] === "1") process.env["NO_COLOR"] = "1";
if (process.argv.includes("--no-color")) {
  process.env["NO_COLOR"] = "1";
}

// First-run banner
const _isJsonMode =
  process.argv.includes("--json") ||
  process.argv.includes("-j") ||
  process.argv.includes("--ci") ||
  (process.argv.includes("--output") &&
    process.argv[process.argv.indexOf("--output") + 1] === "json") ||
  (process.argv.includes("-o") && process.argv[process.argv.indexOf("-o") + 1] === "json");
const _isQuiet = process.argv.includes("--quiet") || process.argv.includes("-q");

const _setupCommands = new Set(["config", "auth", "quickstart", "doctor", "init", "setup-gcp"]);
const _isSetupCommand = _setupCommands.has(process.argv[2] ?? "");

if (!_isJsonMode && !_isQuiet && !_isSetupCommand && !existsSync(getUserConfigPath())) {
  process.stderr.write("\u2726 First time? Run gpc config init to get set up.\n\n");
}

await setupNetworking();
initAudit(getConfigDir());

const currentVersion = process.env["__GPC_VERSION"] || "0.0.0";

// Handle --ci and --json flags early (before command parsing)
if (process.argv.includes("--ci")) {
  process.env["CI"] = "1";
  // --ci implies --output json --no-interactive --no-color
  if (!process.argv.some((a) => a.startsWith("--output") || a.startsWith("-o"))) {
    process.argv.push("--output", "json");
  }
  if (!process.argv.includes("--no-interactive")) {
    process.argv.push("--no-interactive");
  }
  if (!process.argv.includes("--no-color")) {
    process.argv.push("--no-color");
  }
}
if (process.argv.includes("--json") || process.argv.includes("-j")) {
  if (!process.argv.some((a) => a.startsWith("--output") || a.startsWith("-o"))) {
    process.argv.push("--output", "json");
  }
}

// Propagate --profile / -p to GPC_PROFILE env var so loadConfig() picks it up.
// Must run before any loadConfig() call (commands read env, not program.opts).
import { extractProfileFromArgv } from "./argv-profile.js";
{
  const profile = extractProfileFromArgv(process.argv);
  if (profile) process.env["GPC_PROFILE"] = profile;
}

const pluginManager = await loadPlugins();
const program = await createProgram(pluginManager);

// GPC_DEBUG=1 enables verbose mode without mutating process.argv
if (process.env["GPC_DEBUG"] === "1") {
  program.setOptionValueWithSource("verbose", true, "env");
}

const startTime = Date.now();
let commandSuccess = true;
let commandParsed = false;
let informationalExit = false;
let isUpdateCommand = false;
let isCompletionProvider = false;
let commandError: string | undefined;
let updateCheckPromise = Promise.resolve<Awaited<ReturnType<typeof checkForUpdate>>>(null);

program.hook("preAction", (_thisCommand, actionCommand) => {
  commandParsed = true;
  let topLevel = actionCommand;
  while (topLevel.parent && topLevel.parent !== program) topLevel = topLevel.parent;
  isUpdateCommand = topLevel.name() === "update";
  isCompletionProvider = topLevel.name() === "__complete";
  if (!isUpdateCommand && !isCompletionProvider) {
    // Start the passive check only after Commander confirms this is a real
    // action. Help/version exits therefore never start or await network work.
    updateCheckPromise = checkForUpdate(currentVersion);
  }
});

await runProgram(program, process.argv, pluginManager).catch((error: unknown) => {
  const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  informationalExit = code === "commander.helpDisplayed" || code === "commander.version";
  const exitCode = handleCliError(error);
  commandSuccess = exitCode === 0;
  commandError = commandSuccess
    ? undefined
    : error instanceof Error
      ? error.message
      : String(error);
  process.exitCode = exitCode;
});

// Send webhook notification if --notify was set
const notifyOpt = program.opts()["notify"] as string | boolean | undefined;
if (!informationalExit && notifyOpt !== undefined && notifyOpt !== false) {
  try {
    const config = await loadConfig();
    if (config.webhooks) {
      const filtered = sanitizeWebhookCommandArgs(process.argv.slice(2), program, commandParsed);
      const commandName = filtered.join(" ");
      const payload: WebhookPayload = {
        command: commandName || "unknown",
        success: commandSuccess,
        duration: Date.now() - startTime,
        app: program.opts()["app"] as string | undefined,
        error: commandError,
      };

      const target = typeof notifyOpt === "string" ? notifyOpt : undefined;
      // Fire-and-forget — do not block exit
      sendWebhook(config.webhooks, payload, target).catch(() => {});
    }
  } catch {
    // Never let webhook logic break the CLI
  }
}

// After command completes, show update notification if available
// isUpdateCommand is declared above — update check was skipped for this command.
// Skip entirely for __complete: the setTimeout below would keep the event loop
// alive for 3s, blowing the completion latency budget.
if (!isCompletionProvider && !informationalExit && commandSuccess) {
  try {
    const result = await Promise.race([
      updateCheckPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    if (
      result &&
      result.updateAvailable &&
      !isUpdateCommand &&
      process.stdout.isTTY &&
      !process.argv.includes("--json") &&
      program.opts()["output"] !== "json"
    ) {
      process.stderr.write(`\n${formatUpdateNotification(result)}\n`);
    }
  } catch {
    // Silently ignore update check failures
  }
}
