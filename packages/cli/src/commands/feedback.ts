import type { Command } from "commander";
import { execFile } from "node:child_process";
import { listAuditEvents } from "@gpc-cli/core";
import { detectInstallMethod } from "../updater.js";

export function registerFeedbackCommand(program: Command): void {
  program
    .command("feedback")
    .description("Open a pre-filled GitHub issue with system diagnostics")
    .option("--title <title>", "Issue title")
    .option("--print", "Print the report to stdout instead of opening a browser")
    .action(async (opts) => {
      const version = process.env["__GPC_VERSION"] || "0.0.0";

      // Collect last audit entry for context
      let lastCommand = "";
      try {
        const events = await listAuditEvents({ limit: 3 });
        if (events.length > 0) {
          lastCommand = events
            .map((e) => `\`${e.command}${e.args ? " " + e.args : ""}\` (${e.timestamp})`)
            .join("\n- ");
        }
      } catch {
        // Audit log unavailable — skip
      }

      const sections = [
        "**GPC version:** " + version,
        "**Node:** " + process.version,
        "**Platform:** " + process.platform + "/" + process.arch,
        "**Install method:** " + detectInstallMethod(),
        "**Shell:** " + (process.env["SHELL"] || process.env["ComSpec"] || "unknown"),
        "**CI:** " + (process.env["CI"] ? "yes" : "no"),
      ];

      if (lastCommand) {
        sections.push("", "**Recent commands:**", "- " + lastCommand);
      }

      sections.push("", "**Describe the issue:**", "<!-- Replace this with your bug description -->");

      const body = sections.join("\n");

      if (opts.print) {
        console.log(body);
        return;
      }
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
