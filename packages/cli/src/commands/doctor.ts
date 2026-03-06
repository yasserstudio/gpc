import type { Command } from "commander";
import { loadConfig } from "@gpc/config";
import { resolveAuth, AuthError } from "@gpc/auth";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Verify setup and connectivity")
    .action(async () => {
      console.log("GPC Doctor\n");
      let allGood = true;

      // Check Node.js version
      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split(".")[0]!, 10);
      if (major >= 20) {
        console.log(`  \u2713 Node.js ${nodeVersion}`);
      } else {
        console.log(`  \u2717 Node.js ${nodeVersion} (requires >=20)`);
        allGood = false;
      }

      // Check config
      try {
        const config = await loadConfig();
        console.log(`  \u2713 Configuration loaded`);
        if (config.app) {
          console.log(`  \u2713 Default app: ${config.app}`);
        } else {
          console.log(`  - No default app configured (use --app flag or gpc config set app <package>)`);
        }
      } catch {
        console.log("  \u2717 Configuration error");
        allGood = false;
      }

      // Check auth
      try {
        const config = await loadConfig();
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
        });
        console.log(`  \u2713 Authenticated as ${client.getClientEmail()}`);

        // Try to get a token to verify connectivity
        await client.getAccessToken();
        console.log("  \u2713 API connectivity verified");
      } catch (error) {
        if (error instanceof AuthError) {
          console.log(`  \u2717 Authentication: ${error.message}`);
          if (error.suggestion) console.log(`    ${error.suggestion}`);
        } else {
          console.log("  \u2717 API connectivity failed");
        }
        allGood = false;
      }

      console.log("");
      if (allGood) {
        console.log("All checks passed!");
      } else {
        console.log("Some checks failed. Fix the issues above and run again.");
        process.exit(1);
      }
    });
}
