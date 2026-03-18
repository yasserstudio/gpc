// Named exports only. No default export.

function isColorEnabled(): boolean {
  if (process.env["NO_COLOR"] !== undefined && process.env["NO_COLOR"] !== "") return false;
  if (
    process.env["FORCE_COLOR"] === "1" ||
    process.env["FORCE_COLOR"] === "2" ||
    process.env["FORCE_COLOR"] === "3"
  )
    return true;
  return process.stdout.isTTY ?? false;
}

function wrap(code: number, s: string): string {
  if (!isColorEnabled()) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}

export function green(s: string): string  { return wrap(32, s); }
export function red(s: string): string    { return wrap(31, s); }
export function yellow(s: string): string { return wrap(33, s); }
export function dim(s: string): string    { return wrap(2, s); }
export function gray(s: string): string   { return wrap(90, s); }
export function bold(s: string): string   { return wrap(1, s); }
