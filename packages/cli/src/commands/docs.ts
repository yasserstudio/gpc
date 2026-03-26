import type { Command } from "commander";
import * as cp from "node:child_process";

const PAGE_MAP: Record<string, string> = {
  releases: "commands/releases",
  status: "commands/status",
  vitals: "commands/vitals",
  reviews: "commands/reviews",
  listings: "commands/listings",
  subscriptions: "commands/subscriptions",
  bundle: "commands/bundle",
  users: "commands/users",
  audit: "commands/audit",
  config: "commands/config",
  doctor: "commands/doctor",
  publish: "commands/publish",
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
