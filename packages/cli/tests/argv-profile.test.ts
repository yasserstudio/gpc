import { describe, it, expect } from "vitest";
import { extractProfileFromArgv } from "../src/argv-profile.js";

describe("extractProfileFromArgv", () => {
  it("returns undefined when no flag is present", () => {
    expect(extractProfileFromArgv(["node", "gpc", "status"])).toBeUndefined();
  });

  it("extracts --profile <name>", () => {
    expect(extractProfileFromArgv(["node", "gpc", "status", "--profile", "jowee"])).toBe("jowee");
  });

  it("extracts short -p <name>", () => {
    expect(extractProfileFromArgv(["node", "gpc", "status", "-p", "visioo"])).toBe("visioo");
  });

  it("returns undefined when --profile is the last arg", () => {
    expect(extractProfileFromArgv(["node", "gpc", "--profile"])).toBeUndefined();
  });

  it("returns undefined when value looks like another flag", () => {
    expect(extractProfileFromArgv(["node", "gpc", "--profile", "--json"])).toBeUndefined();
  });
});
