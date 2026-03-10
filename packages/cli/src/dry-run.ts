import type { OutputFormat } from "@gpc-cli/config";

export interface DryRunPreview {
  command: string;
  action: string;
  target: string;
  details?: Record<string, unknown>;
}

export function isDryRun(program: { opts(): Record<string, unknown> }): boolean {
  let cmd: { parent?: unknown; opts(): Record<string, unknown> } = program;
  while (cmd.parent) {
    cmd = cmd.parent as typeof cmd;
  }
  return !!cmd.opts()['dryRun'];
}

export function printDryRun(preview: DryRunPreview, format: OutputFormat, formatOutput: (data: unknown, format: OutputFormat, redact?: boolean) => string): void {
  const output = {
    dryRun: true,
    ...preview,
    message: `Would ${preview.action} ${preview.target}`,
  };
  console.log(formatOutput(output, format));
}
