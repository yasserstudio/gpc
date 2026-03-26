if (process.env["GPC_NO_COLOR"] === "1") process.env["NO_COLOR"] = "1";
if (process.argv.includes("--no-color")) {
  process.env["NO_COLOR"] = "1";
}
import { existsSync } from "node:fs";
import { setupNetworking } from "./networking.js";
import { createProgram } from "./program.js";
import { loadPlugins } from "./plugins.js";
import { handleCliError } from "./error-handler.js";
import { initAudit, sendWebhook } from "@gpc-cli/core";
import type { WebhookPayload } from "@gpc-cli/core";
import { getConfigDir, loadConfig, getUserConfigPath } from "@gpc-cli/config";
import { checkForUpdate, formatUpdateNotification } from "./update-check.js";

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

// Skip passive update check when the user is explicitly running `gpc update` —
// that command does its own check against the GitHub Releases API.
const isUpdateCommand = process.argv[2] === "update";

// Start update check before command execution (non-blocking)
const updateCheckPromise = isUpdateCommand ? Promise.resolve(null) : checkForUpdate(currentVersion);

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

const pluginManager = await loadPlugins();
const program = await createProgram(pluginManager);

// GPC_DEBUG=1 enables verbose mode without mutating process.argv
if (process.env["GPC_DEBUG"] === "1") {
  program.setOptionValueWithSource("verbose", true, "env");
}

const startTime = Date.now();
let commandSuccess = true;
let commandError: string | undefined;

await program.parseAsync(process.argv).catch((error: unknown) => {
  commandSuccess = false;
  commandError = error instanceof Error ? error.message : String(error);
  const exitCode = handleCliError(error);
  process.exit(exitCode);
});

// Send webhook notification if --notify was set
const notifyOpt = program.opts()["notify"] as string | boolean | undefined;
if (notifyOpt !== undefined && notifyOpt !== false) {
  try {
    const config = await loadConfig();
    if (config.webhooks) {
      const commandName = process.argv
        .slice(2)
        .filter((a) => !a.startsWith("--notify"))
        .join(" ");
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
// isUpdateCommand is declared above — update check was skipped for this command
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
