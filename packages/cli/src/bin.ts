import { setupNetworking } from "./networking.js";
import { createProgram } from "./program.js";
import { loadPlugins } from "./plugins.js";
import { initAudit } from "@gpc-cli/core";
import { getConfigDir } from "@gpc-cli/config";
import { checkForUpdate, formatUpdateNotification } from "./update-check.js";

await setupNetworking();
initAudit(getConfigDir());

const currentVersion = process.env["__GPC_VERSION"] || "0.0.0";

// Start update check before command execution (non-blocking)
const updateCheckPromise = checkForUpdate(currentVersion);

const pluginManager = await loadPlugins();
const program = await createProgram(pluginManager);

await program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

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
