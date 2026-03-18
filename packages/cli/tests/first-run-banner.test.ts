import { describe, it, expect } from "vitest";

/**
 * Pure logic extracted from bin.ts first-run banner check.
 * Tests the shouldShowFirstRunBanner function in isolation.
 */
function shouldShowFirstRunBanner(configExists: boolean, argv: string[]): boolean {
  if (configExists) return false;

  const isJsonMode =
    argv.includes("--json") ||
    argv.includes("-j") ||
    argv.includes("--ci") ||
    (argv.includes("--output") && argv[argv.indexOf("--output") + 1] === "json") ||
    (argv.includes("-o") && argv[argv.indexOf("-o") + 1] === "json");

  const isQuiet = argv.includes("--quiet") || argv.includes("-q");

  return !isJsonMode && !isQuiet;
}

describe("first-run banner logic", () => {
  it("shows banner when config does not exist and no special flags", () => {
    expect(shouldShowFirstRunBanner(false, ["node", "gpc", "status"])).toBe(true);
  });

  it("does not show banner when config exists", () => {
    expect(shouldShowFirstRunBanner(true, ["node", "gpc", "status"])).toBe(false);
  });

  it("does not show banner when --json flag is present", () => {
    expect(shouldShowFirstRunBanner(false, ["node", "gpc", "status", "--json"])).toBe(false);
  });

  it("does not show banner when -j flag is present", () => {
    expect(shouldShowFirstRunBanner(false, ["node", "gpc", "status", "-j"])).toBe(false);
  });

  it("does not show banner when --ci flag is present", () => {
    expect(shouldShowFirstRunBanner(false, ["node", "gpc", "releases", "upload", "--ci"])).toBe(
      false,
    );
  });

  it("does not show banner when --quiet flag is present", () => {
    expect(shouldShowFirstRunBanner(false, ["node", "gpc", "status", "--quiet"])).toBe(false);
  });

  it("does not show banner when -q flag is present", () => {
    expect(shouldShowFirstRunBanner(false, ["node", "gpc", "status", "-q"])).toBe(false);
  });

  it("does not show banner when --output json is present", () => {
    expect(shouldShowFirstRunBanner(false, ["node", "gpc", "status", "--output", "json"])).toBe(
      false,
    );
  });

  it("shows banner when --output table is present (not JSON) and no config", () => {
    expect(shouldShowFirstRunBanner(false, ["node", "gpc", "status", "--output", "table"])).toBe(
      true,
    );
  });
});
