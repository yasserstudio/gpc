import { setupNetworking } from "./networking.js";
import { createProgram } from "./program.js";
import { loadPlugins } from "./plugins.js";
import { initAudit } from "@gpc/core";
import { getConfigDir } from "@gpc/config";

await setupNetworking();
initAudit(getConfigDir());
const pluginManager = await loadPlugins();
const program = await createProgram(pluginManager);
program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
