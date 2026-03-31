import type { Command } from "commander";
import * as cp from "node:child_process";

const PAGE_MAP: Record<string, string> = {
  // Guide
  "quick-start": "guide/quick-start",
  authentication: "guide/authentication",
  configuration: "guide/configuration",
  "developer-verification": "guide/developer-verification",
  faq: "guide/faq",

  // Commands
  anomalies: "commands/anomalies",
  apps: "commands/apps",
  auth: "commands/auth",
  bundle: "commands/bundle",
  changelog: "commands/changelog",
  config: "commands/config",
  "data-safety": "commands/data-safety",
  "device-tiers": "commands/device-tiers",
  diff: "commands/diff",
  enterprise: "commands/enterprise",
  "external-transactions": "commands/external-transactions",
  games: "commands/games",
  "generated-apks": "commands/generated-apks",
  grants: "commands/grants",
  iap: "commands/iap",
  init: "commands/init",
  "install-skills": "commands/install-skills",
  "internal-sharing": "commands/internal-sharing",
  listings: "commands/listings",
  migrate: "commands/migrate",
  "one-time-products": "commands/one-time-products",
  plugins: "commands/plugins",
  preflight: "commands/preflight",
  pricing: "commands/pricing",
  publish: "commands/publish",
  "purchase-options": "commands/purchase-options",
  purchases: "commands/purchases",
  quota: "commands/quota",
  recovery: "commands/recovery",
  releases: "commands/releases",
  reports: "commands/reports",
  reviews: "commands/reviews",
  rtdn: "commands/rtdn",
  status: "commands/status",
  subscriptions: "commands/subscriptions",
  testers: "commands/testers",
  tracks: "commands/tracks",
  train: "commands/train",
  users: "commands/users",
  verify: "commands/verify",
  vitals: "commands/vitals",

  // Advanced
  architecture: "advanced/architecture",
  "error-codes": "advanced/error-codes",
  security: "advanced/security",
  "sdk-usage": "advanced/sdk-usage",
  troubleshooting: "advanced/troubleshooting",

  // CI/CD
  "github-actions": "ci-cd/github-actions",
  "gitlab-ci": "ci-cd/gitlab-ci",
  "vitals-gates": "ci-cd/vitals-gates",

  // Migration
  "from-fastlane": "migration/from-fastlane",
};

const BASE = "https://yasserstudio.github.io/gpc/";

export function registerDocsCommand(program: Command): void {
  program
    .command("docs [topic]")
    .description("Open documentation in browser")
    .option("--list", "List available documentation topics")
    .action((topic?: string, opts?: { list?: boolean }) => {
      if (opts?.list) {
        console.log("Available topics:");
        for (const key of Object.keys(PAGE_MAP)) console.log(`  gpc docs ${key}`);
        return;
      }
      const path = topic ? PAGE_MAP[topic] : undefined;
      if (topic && !path) {
        const err = new Error(`Unknown topic "${topic}".`);
        Object.assign(err, { code: "USAGE_ERROR", exitCode: 2, suggestion: "Run: gpc docs --list" });
        throw err;
      }
      const url = path ? `${BASE}${path}` : BASE;
      const platform = process.platform;
      const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
      cp.execFile(cmd, [url], (error) => {
        if (error) {
          console.log(`Open in your browser: ${url}`);
        }
      });
    });
}
