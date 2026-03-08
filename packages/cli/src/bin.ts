import { setupNetworking } from "./networking.js";
import { createProgram } from "./program.js";

await setupNetworking();
const program = await createProgram();
program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
