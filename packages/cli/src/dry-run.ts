export interface DryRunPreview {
  command: string;
  action: string;
  target: string;
  details?: Record<string, unknown>;
}

export function isDryRun(program: { opts(): Record<string, unknown> }): boolean {
  let cmd = program as any;
  while (cmd.parent) {
    cmd = cmd.parent;
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
