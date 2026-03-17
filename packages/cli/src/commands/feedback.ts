import { Command } from "commander";
import { execFile } from "node:child_process";
import { detectInstallMethod } from "../updater.js";

export function registerFeedbackCommand(program: Command): void {
  program
    .command("feedback")
    .description("Open a pre-filled GitHub issue with system diagnostics")
    .option("--title <title>", "Issue title")
    .action(async (opts) => {
      const version = process.env["__GPC_VERSION"] || "0.0.0";
      const body = [
        "**GPC version:** " + version,
        "**Node:** " + process.version,
        "**Platform:** " + process.platform + "/" + process.arch,
        "**Install method:** " + detectInstallMethod(),
        "",
        "**Describe the issue:**",
        "<!-- Replace this with your bug description -->",
      ].join("\n");
      const params = new URLSearchParams({
        title: opts.title ?? "Bug report",
        body,
        labels: "bug",
      });
      const url = `https://github.com/yasserstudio/gpc/issues/new?${params}`;
      if (process.platform === "win32") {
        execFile("cmd", ["/c", "start", "", url], (err) => {
          if (err) console.log(`Open in your browser:\n${url}`);
          else console.log("Opened GitHub issue form in your browser.");
        });
      } else {
        const cmd = process.platform === "darwin" ? "open" : "xdg-open";
        execFile(cmd, [url], (err) => {
          if (err) console.log(`Open in your browser:\n${url}`);
          else console.log("Opened GitHub issue form in your browser.");
        });
      }
    });
}
