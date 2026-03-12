import type { Command } from "commander";
import type { OutputFormat } from "@gpc-cli/config";
import type { GpcConfig } from "@gpc-cli/config";

export function getOutputFormat(program: Command, config: GpcConfig): OutputFormat {
  return (program.opts()["output"] as OutputFormat | undefined) || config.output || "table";
}
