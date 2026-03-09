import { createInterface } from "node:readline";

/**
 * Check if interactive prompts are allowed.
 * Disabled by --no-interactive flag, GPC_NO_INTERACTIVE env, or non-TTY stdin.
 */
export function isInteractive(program?: { opts(): Record<string, unknown> }): boolean {
  // Commander's --no-interactive sets interactive = false
  if (program) {
    let root = program as any;
    while (root.parent) root = root.parent;
    if (root.opts().interactive === false) return false;
  }

  if (process.env["GPC_NO_INTERACTIVE"] === "1" || process.env["GPC_NO_INTERACTIVE"] === "true") {
    return false;
  }

  if (process.env["CI"] === "true" || process.env["CI"] === "1") {
    return false;
  }

  return Boolean(process.stdin.isTTY);
}

/**
 * Prompt for text input.
 */
export async function promptInput(message: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const rl = createInterface({ input: process.stdin, output: process.stderr });

  return new Promise((resolve) => {
    rl.question(`${message}${suffix}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

/**
 * Prompt for selection from a list of choices.
 */
export async function promptSelect(message: string, choices: string[], defaultValue?: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });

  process.stderr.write(`${message}\n`);
  for (let i = 0; i < choices.length; i++) {
    const marker = choices[i] === defaultValue ? " (default)" : "";
    process.stderr.write(`  ${i + 1}) ${choices[i]}${marker}\n`);
  }

  return new Promise((resolve) => {
    rl.question("Choice: ", (answer) => {
      rl.close();
      const trimmed = answer.trim();

      // Accept number
      const num = Number(trimmed);
      if (num >= 1 && num <= choices.length) {
        resolve(choices[num - 1]!);
        return;
      }

      // Accept exact match
      if (choices.includes(trimmed)) {
        resolve(trimmed);
        return;
      }

      // Default
      resolve(defaultValue || choices[0]!);
    });
  });
}

/**
 * Prompt for yes/no confirmation.
 */
export async function promptConfirm(message: string, defaultValue = true): Promise<boolean> {
  const hint = defaultValue ? "Y/n" : "y/N";
  const rl = createInterface({ input: process.stdin, output: process.stderr });

  return new Promise((resolve) => {
    rl.question(`${message} [${hint}]: `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") resolve(defaultValue);
      else resolve(trimmed === "y" || trimmed === "yes");
    });
  });
}
