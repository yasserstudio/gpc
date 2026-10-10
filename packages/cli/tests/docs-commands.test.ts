import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(
  new URL("../../../scripts/validate-doc-commands.mjs", import.meta.url),
);
const builtCli = fileURLToPath(new URL("../dist/index.js", import.meta.url));

// The docs once showed 105 commands and flags that did not exist (`gpc upload
// --package`, `vitals check`, `--rollout 0.1`). Every `gpc ...` line in the docs
// and READMEs must resolve against the real command tree.
describe("documented gpc commands", () => {
  it.skipIf(!existsSync(builtCli))(
    "all exist with real flags",
    () => {
      let output = "";
      try {
        output = execFileSync(process.execPath, [script], { encoding: "utf-8" });
      } catch (err) {
        output = String((err as { stdout?: string }).stdout ?? err);
        throw new Error(`Documented commands that do not exist:\n${output}`);
      }
      expect(output).toMatch(/; 0 findings/);
    },
    60_000,
  );
});
