import type { Command } from "commander";
import { execFile } from "node:child_process";

const PAGE_MAP: Record<string, string> = {
  releases:      "commands/releases",
  status:        "commands/status",
  vitals:        "commands/vitals",
  reviews:       "commands/reviews",
  listings:      "commands/listings",
  subscriptions: "commands/subscriptions",
  bundle:        "commands/bundle",
  users:         "commands/users",
  audit:         "commands/audit",
  config:        "commands/config",
  doctor:        "commands/doctor",
  publish:       "commands/publish",
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
        console.error(`Unknown topic "${topic}". Run: gpc docs --list`);
        process.exit(2);
      }
      const url = path ? `${BASE}${path}` : BASE;
      const platform = process.platform;
      const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
      execFile(cmd, [url], (error) => {
        if (error) {
          console.log(`Open in your browser: ${url}`);
        }
      });
    });
}
