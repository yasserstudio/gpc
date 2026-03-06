import type { Command } from "commander";
import { exec } from "node:child_process";

export function registerDocsCommand(program: Command): void {
  program
    .command("docs")
    .description("Open documentation in browser")
    .action(() => {
      const url = "https://github.com/yasserstudio/gpc#readme";
      const platform = process.platform;
      const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
      exec(`${cmd} ${url}`, (error) => {
        if (error) {
          console.log(`Open in your browser: ${url}`);
        }
      });
    });
}
