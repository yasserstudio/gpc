import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Lazy-import guard for the AI SDK deps.
 *
 * `gpc changelog generate` without --ai must NOT transitively load any of:
 *   - ai
 *   - @ai-sdk/anthropic
 *   - @ai-sdk/openai
 *   - @ai-sdk/google
 *
 * These are imported only inside createTranslator() + fetchAggregateCost(),
 * both gated behind the --ai code path. Users without an LLM key pay zero
 * bundle / startup cost.
 *
 * We enforce this via static analysis on the built bundle: top-level
 * static imports of ai / @ai-sdk/* are forbidden. Dynamic `await import(...)`
 * inside function bodies is allowed (and is what our translator factory uses).
 */
describe("ai deps lazy-import guard", () => {
  it("the built @gpc-cli/core bundle has no top-level static import of ai / @ai-sdk/*", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const distFile = resolve(here, "..", "dist", "index.js");

    if (!existsSync(distFile)) {
      // Bundle hasn't been built (e.g., local watch mode). Skip gracefully —
      // the turbo test.dependsOn: ["build"] wire ensures CI always exercises this.
      return;
    }

    const source = readFileSync(distFile, "utf8");

    const forbidden = [
      /^\s*import\s+[^;]*\s+from\s+["']ai["']/m,
      /^\s*import\s+[^;]*\s+from\s+["']@ai-sdk\/anthropic["']/m,
      /^\s*import\s+[^;]*\s+from\s+["']@ai-sdk\/openai["']/m,
      /^\s*import\s+[^;]*\s+from\s+["']@ai-sdk\/google["']/m,
    ];

    for (const re of forbidden) {
      const match = source.match(re);
      expect(match, `Eager static import detected: ${match?.[0]}`).toBeNull();
    }

    // Sanity: confirm dynamic imports are present where we expect them.
    // At least one `await import("ai")` and one `@ai-sdk/*` dynamic import
    // should be in the bundle (inside changelog-ai.ts's lazy factories).
    const dynamicAi = source.match(/import\s*\(\s*["']ai["']\s*\)/);
    expect(dynamicAi, "expected a dynamic import of 'ai' inside translator factory").not.toBeNull();

    const dynamicProvider = source.match(
      /import\s*\(\s*["']@ai-sdk\/(anthropic|openai|google)["']\s*\)/,
    );
    expect(
      dynamicProvider,
      "expected dynamic imports of @ai-sdk/<provider> inside translator factory",
    ).not.toBeNull();
  });
});
