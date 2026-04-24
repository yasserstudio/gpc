import type { Command } from "commander";
import { resolveAuth } from "@gpc-cli/auth";
import { loadConfig } from "@gpc-cli/config";
import { buildChecklist, renderChecklistMarkdown } from "@gpc-cli/core";
import { green, yellow, red, dim, bold } from "../colors.js";
import { isInteractive, promptConfirm } from "../prompt.js";

const ENFORCEMENT_DATE = new Date("2026-09-30");
const ENFORCEMENT_REGIONS = ["Brazil", "Indonesia", "Singapore", "Thailand"];
const ENFORCEMENT_REGION_CODES = ["BR", "ID", "SG", "TH"];
const API_HOST = "androidpublisher.googleapis.com";

const RESOURCES = {
  overview: "https://developer.android.com/developer-verification",
  playConsole: "https://developer.android.com/developer-verification/guides/google-play-console",
  androidConsole:
    "https://developer.android.com/developer-verification/guides/android-developer-console",
  limitedDistribution:
    "https://developer.android.com/developer-verification/guides/limited-distribution",
  faq: "https://developer.android.com/developer-verification/faq",
};

function daysUntilEnforcement(): number {
  return Math.ceil((ENFORCEMENT_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function isBeforeEnforcement(): boolean {
  return Date.now() < ENFORCEMENT_DATE.getTime();
}

function formatDeadline(): string {
  const days = daysUntilEnforcement();
  if (days > 0) {
    return `Enforcement begins September 30, 2026 (${days} days, ${ENFORCEMENT_REGION_CODES.join("/")})`;
  }
  return "Enforcement active. Verify your account is compliant.";
}

async function openUrl(url: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  execFile(cmd, args, (err) => {
    if (err) console.error(dim(`Could not open browser: ${err.message}`));
  });
}

interface AppProbeResult {
  accessible: boolean;
  bundleCount: number;
  latestVersionCode?: number;
  hasGeneratedApks: boolean;
}

async function probeApp(accessToken: string, packageName: string): Promise<AppProbeResult> {
  const baseUrl = `https://${API_HOST}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;
  const result: AppProbeResult = {
    accessible: false,
    bundleCount: 0,
    hasGeneratedApks: false,
  };

  const editResp = await fetch(`${baseUrl}/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(10_000),
  });
  if (!editResp.ok) return result;

  const edit = (await editResp.json()) as { id: string };
  result.accessible = true;

  try {
    const bundlesResp = await fetch(`${baseUrl}/edits/${edit.id}/bundles`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (bundlesResp.ok) {
      const data = (await bundlesResp.json()) as { bundles?: { versionCode: number }[] };
      const bundles = data.bundles ?? [];
      result.bundleCount = bundles.length;
      if (bundles.length > 0) {
        result.latestVersionCode = bundles.reduce((max, b) =>
          b.versionCode > max.versionCode ? b : max,
        ).versionCode;

        const apksResp = await fetch(`${baseUrl}/generatedApks/${result.latestVersionCode}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (apksResp.ok) {
          const apksData = (await apksResp.json()) as {
            generatedApks?: { certificateSha256Fingerprint?: string }[];
          };
          result.hasGeneratedApks = (apksData.generatedApks?.length ?? 0) > 0;
        }
      }
    }
  } finally {
    await fetch(`${baseUrl}/edits/${edit.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5_000),
    }).catch(() => {});
  }

  return result;
}

export function registerVerifyCommand(program: Command): void {
  const verify = program
    .command("verify")
    .description("Android developer verification status and resources")
    .option("--open", "Open the verification page in your browser")
    .action(async (opts, cmd) => {
      const parentOpts = cmd.parent?.opts() ?? {};
      const jsonMode = !!(parentOpts["json"] || parentOpts["output"] === "json");

      let accountEmail = "unknown";
      let accessToken: string | undefined;
      let config;
      try {
        config = await loadConfig();
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
        });
        accountEmail = client.getClientEmail();
        accessToken = await client.getAccessToken();
      } catch {
        // Auth not configured
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

      const packageName = (parentOpts["app"] as string | undefined) ?? config?.app;
      let appInfo: AppProbeResult | undefined;
      if (accessToken && packageName) {
        try {
          appInfo = await probeApp(accessToken, packageName);
        } catch {
          // Non-blocking
        }
      }

      const days = daysUntilEnforcement();
      const actionItems: { priority: string; title: string; command?: string }[] = [];

      if (!accessToken) {
        actionItems.push({
          priority: "high",
          title: "Authenticate with Google Play",
          command: "gpc auth login",
        });
      }
      if (appInfo && appInfo.bundleCount === 0) {
        actionItems.push({
          priority: "medium",
          title: "Upload your first AAB",
          command: "gpc publish",
        });
      }
      if (appInfo && !appInfo.hasGeneratedApks) {
        actionItems.push({
          priority: "medium",
          title: "Enroll in Play App Signing",
        });
      }
      if (days > 0 && days <= 90) {
        actionItems.push({
          priority: "high",
          title: "Enforcement is less than 90 days away. Complete verification now.",
        });
      }
      actionItems.push({
        priority: "low",
        title: "Run full readiness walkthrough",
        command: "gpc verify checklist",
      });

      if (jsonMode) {
        console.log(
          JSON.stringify(
            {
              enforcement: {
                date: "2026-09-30",
                daysRemaining: days,
                regions: ENFORCEMENT_REGIONS,
                active: !isBeforeEnforcement(),
              },
              account: accountEmail,
              app: appInfo
                ? {
                    packageName,
                    accessible: appInfo.accessible,
                    bundleCount: appInfo.bundleCount,
                    latestVersionCode: appInfo.latestVersionCode,
                    playAppSigningEnrolled: appInfo.hasGeneratedApks,
                  }
                : undefined,
              actionItems,
              resources: RESOURCES,
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log("");
      console.log(bold("Android Developer Verification"));
      console.log("");
      console.log(`  Status:   ${days <= 90 ? yellow(formatDeadline()) : dim(formatDeadline())}`);
      console.log(`  Account:  ${accountEmail}`);
      if (appInfo) {
        console.log(`  App:      ${packageName}`);
        console.log(
          `  Bundles:  ${appInfo.bundleCount}${appInfo.latestVersionCode ? ` (latest: v${appInfo.latestVersionCode})` : ""}`,
        );
        console.log(
          `  Signing:  ${appInfo.hasGeneratedApks ? green("Play App Signing enrolled") : yellow("Not enrolled or no bundles")}`,
        );
      }
      console.log("");

      if (actionItems.length > 1) {
        console.log("  Action items:");
        for (const item of actionItems) {
          const icon =
            item.priority === "high"
              ? red("!")
              : item.priority === "medium"
                ? yellow("!")
                : dim("-");
          const cmdHint = item.command ? ` ${dim(`→ ${item.command}`)}` : "";
          console.log(`  ${icon} ${item.title}${cmdHint}`);
        }
        console.log("");
      }

      console.log("  Resources:");
      console.log(`  ${dim("→")} ${RESOURCES.overview}`);
      console.log(`  ${dim("→")} ${RESOURCES.playConsole}`);
      console.log(`  ${dim("→")} ${RESOURCES.faq}`);
      console.log("");
      console.log(dim("  Run 'gpc verify --open' to open the verification page in your browser."));
      console.log(dim("  Full guide: gpc docs developer-verification"));
      console.log("");
    });

  verify
    .command("checklist")
    .description("Verification readiness walkthrough")
    .action(async (_opts, subcmd) => {
      const parentOpts = subcmd.parent?.parent?.opts() ?? {};
      const jsonMode = !!(parentOpts["json"] || parentOpts["output"] === "json");
      const interactive = isInteractive(subcmd.parent?.parent);

      let accountEmail = "unknown";
      let accessToken: string | undefined;
      let config;
      let authenticated = false;
      try {
        config = await loadConfig();
        const client = await resolveAuth({
          serviceAccountPath: config.auth?.serviceAccount,
        });
        accountEmail = client.getClientEmail();
        accessToken = await client.getAccessToken();
        authenticated = true;
      } catch {
        // Auth not configured
      }

      const packageName = (parentOpts["app"] as string | undefined) ?? config?.app;
      let appAccessible: boolean | undefined;
      let bundleCount: number | undefined;
      let hasGeneratedApks: boolean | undefined;

      if (accessToken && packageName) {
        try {
          const probe = await probeApp(accessToken, packageName);
          appAccessible = probe.accessible;
          bundleCount = probe.bundleCount;
          hasGeneratedApks = probe.hasGeneratedApks;
        } catch {
          // Non-blocking
        }
      }

      const interactiveAnswers: Record<string, boolean> = {};
      if (interactive && !jsonMode && !parentOpts["json"]) {
        console.log("");
        console.log(bold("Developer Verification Checklist"));
        console.log(dim("  Answer Y/N for items we cannot auto-detect.\n"));

        const manualSteps = [
          {
            id: "identity-verified",
            question: "Have you completed identity verification in Play Console?",
          },
          {
            id: "auto-registration-reviewed",
            question: "Have you reviewed your auto-registration results in Play Console?",
          },
          {
            id: "additional-keys",
            question: "Have you registered all additional signing keys used outside Play?",
          },
        ];

        for (const step of manualSteps) {
          interactiveAnswers[step.id] = await promptConfirm(step.question, false);
        }
      }

      const result = buildChecklist({
        authenticated,
        accountEmail,
        appAccessible,
        bundleCount,
        hasGeneratedApks,
        interactiveAnswers:
          Object.keys(interactiveAnswers).length > 0 ? interactiveAnswers : undefined,
      });

      if (jsonMode) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log("");
      console.log(bold(`Verification Readiness: ${result.completed}/${result.total}`));
      console.log("");

      for (const item of result.items) {
        let icon: string;
        let label: string;
        if (item.status === "done") {
          icon = green("✓");
          label = item.title;
        } else if (item.status === "action-needed") {
          icon = red("✗");
          label = item.title;
        } else {
          icon = yellow("?");
          label = item.title;
        }
        console.log(`  ${icon} ${label}`);
        if (item.detail && item.status !== "done") {
          console.log(`    ${dim(item.detail)}`);
        }
        if (item.actionUrl && item.status !== "done") {
          console.log(`    ${dim("→")} ${item.actionUrl}`);
        }
      }

      console.log("");

      const md = renderChecklistMarkdown(result, accountEmail);
      if (!interactive) {
        console.log(dim("--- Markdown report ---"));
        console.log(md);
      } else {
        console.log(
          dim("  Tip: run with --json or --no-interactive to get a machine-readable report."),
        );
      }
    });
}
