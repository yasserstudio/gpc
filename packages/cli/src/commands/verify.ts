import type { Command } from "commander";
import { resolveAuth } from "@gpc-cli/auth";
import { loadConfig } from "@gpc-cli/config";
import { green, yellow, dim, bold } from "../colors.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENFORCEMENT_DATE = new Date("2026-09-01");
const ENFORCEMENT_REGIONS = ["Brazil", "Indonesia", "Singapore", "Thailand"];
const ENFORCEMENT_REGION_CODES = ["BR", "ID", "SG", "TH"];

const RESOURCES = {
  overview: "https://developer.android.com/developer-verification",
  playConsole: "https://developer.android.com/developer-verification/guides/google-play-console",
  androidConsole:
    "https://developer.android.com/developer-verification/guides/android-developer-console",
  limitedDistribution:
    "https://developer.android.com/developer-verification/guides/limited-distribution",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBeforeEnforcement(): boolean {
  return Date.now() < ENFORCEMENT_DATE.getTime();
}

function formatDeadline(): string {
  return isBeforeEnforcement()
    ? `Enforcement begins September 2026 (${ENFORCEMENT_REGION_CODES.join(", ")})`
    : `Enforcement active — verify your account is compliant`;
}

async function openUrl(url: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  execFile(cmd, args);
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerVerifyCommand(program: Command): void {
  program
    .command("verify")
    .description("Android developer verification status and resources")
    .option("--open", "Open the verification page in your browser")
    .action(async (opts, cmd) => {
      const parentOpts = cmd.parent?.opts() ?? {};
      const jsonMode = !!(parentOpts["json"] || parentOpts["output"] === "json");

      // Try to get account email (non-blocking)
      let accountEmail = "unknown";
      try {
        const config = await loadConfig();
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
        });
        accountEmail = client.getClientEmail();
      } catch {
        // Auth not configured — that's fine for this command
      }

      if (opts["open"]) {
        await openUrl(RESOURCES.overview);
        if (jsonMode) {
          console.log(JSON.stringify({ opened: RESOURCES.overview }));
        } else {
          console.log(`Opened ${RESOURCES.overview}`);
        }
        return;
      }

      if (jsonMode) {
        console.log(
          JSON.stringify({
            enforcement: {
              date: "2026-09",
              regions: ENFORCEMENT_REGIONS,
              active: !isBeforeEnforcement(),
            },
            account: accountEmail,
            resources: RESOURCES,
          }),
        );
        return;
      }

      // Table output
      console.log("");
      console.log(bold("Android Developer Verification"));
      console.log("");
      console.log(
        `  Status:   ${isBeforeEnforcement() ? yellow(formatDeadline()) : green(formatDeadline())}`,
      );
      console.log(`  Account:  ${accountEmail}`);
      console.log(`  Console:  Play Console (auto-registered for Play apps)`);
      console.log("");
      console.log("  What you need to do:");
      console.log(
        `  1. Confirm identity verification in Play Console ${dim("→ Settings → Developer Account")}`,
      );
      console.log(`  2. Check auto-registration results above your app list`);
      console.log(`  3. Register any non-Play apps within Play Console`);
      console.log("");
      console.log("  Resources:");
      console.log(`  ${dim("→")} ${RESOURCES.overview}`);
      console.log(`  ${dim("→")} ${RESOURCES.playConsole}`);
      console.log(`  ${dim("→")} ${RESOURCES.limitedDistribution}`);
      console.log("");
      console.log(dim("  Run 'gpc verify --open' to open the verification page in your browser."));
      console.log(dim("  Full guide: gpc docs developer-verification"));
      console.log("");
    });
}
