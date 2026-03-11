import { setupNetworking } from "./networking.js";
import { createProgram } from "./program.js";
import { loadPlugins } from "./plugins.js";
import { handleCliError } from "./error-handler.js";
import { initAudit, sendWebhook } from "@gpc-cli/core";
import type { WebhookPayload } from "@gpc-cli/core";
import { getConfigDir, loadConfig } from "@gpc-cli/config";
import { checkForUpdate, formatUpdateNotification } from "./update-check.js";

await setupNetworking();
initAudit(getConfigDir());

const currentVersion = process.env["__GPC_VERSION"] || "0.0.0";

// Start update check before command execution (non-blocking)
const updateCheckPromise = checkForUpdate(currentVersion);

const pluginManager = await loadPlugins();
const program = await createProgram(pluginManager);

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
      const commandName = process.argv.slice(2).filter((a) => !a.startsWith("--notify")).join(" ");
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
try {
  const result = await Promise.race([
    updateCheckPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
  ]);

  if (
    result &&
    result.updateAvailable &&
    process.stdout.isTTY &&
    !process.argv.includes("--json") &&
    program.opts()["output"] !== "json"
  ) {
    process.stderr.write(`\n${formatUpdateNotification(result)}\n`);
  }
} catch {
  // Silently ignore update check failures
}
