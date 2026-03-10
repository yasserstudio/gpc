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
  return !!cmd.opts().dryRun;
}

export function printDryRun(preview: DryRunPreview, format: string, formatOutput: (data: unknown, format: string) => string): void {
  const output = {
    dryRun: true,
    ...preview,
    message: `Would ${preview.action} ${preview.target}`,
  };
  console.log(formatOutput(output, format));
}
