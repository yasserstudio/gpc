import type { Command } from "commander";
import { detectInstallMethod } from "../updater.js";

export function registerVersionCommand(program: Command): void {
  program
    .command("version")
    .description("Show version information")
    .action(() => {
      const version = process.env["__GPC_VERSION"] || "0.0.0";
      if (program.opts()["output"] === "json") {
        console.log(
          JSON.stringify({
            version,
            node: process.version,
            platform: `${process.platform}/${process.arch}`,
            installMethod: detectInstallMethod(),
          }),
        );
      } else {
        console.log(version);
      }
    });
}
