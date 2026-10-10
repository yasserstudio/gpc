import { describe, it, expect, afterEach } from "vitest";
import { resolvePackageName } from "../src/resolve.js";

describe("resolvePackageName", () => {
  afterEach(() => {
    delete process.env["GPC_APP"];
  });

  it.each(["com.example.app", "com.example", "io.app_1.Prod", "a.b"])("accepts %s", (name) => {
    expect(resolvePackageName(name, {})).toBe(name);
  });

  // " com.x" is a shell quoting slip and "=com.x" is `-a=com.x` (Commander keeps
  // the "="); both used to reach the URL and come back as a confusing 404.
  it.each([" com.example.app", "=com.example.app", "com", "com.1app", "com..app", "com.app/x"])(
    "rejects %j with a usage error",
    (name) => {
      expect(() => resolvePackageName(name, {})).toThrow(
        expect.objectContaining({ code: "INVALID_PACKAGE_NAME", exitCode: 2 }),
      );
    },
  );

  it("validates names from config and GPC_APP too", () => {
    expect(() => resolvePackageName(undefined, { app: "bad name" })).toThrow(
      expect.objectContaining({ code: "INVALID_PACKAGE_NAME" }),
    );
    process.env["GPC_APP"] = "-x";
    expect(() => resolvePackageName(undefined, {})).toThrow(
      expect.objectContaining({ code: "INVALID_PACKAGE_NAME" }),
    );
  });

  it("still reports a missing name as MISSING_PACKAGE_NAME", () => {
    expect(() => resolvePackageName(undefined, {})).toThrow(
      expect.objectContaining({ code: "MISSING_PACKAGE_NAME" }),
    );
  });
});
