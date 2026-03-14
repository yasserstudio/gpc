import { describe, it, expect } from "vitest";
import { checkNodeVersion, checkPackageName, checkProxy } from "../src/commands/doctor.js";

// ---------------------------------------------------------------------------
// checkNodeVersion
// ---------------------------------------------------------------------------

describe("checkNodeVersion", () => {
  it("passes for Node.js 20", () => {
    const result = checkNodeVersion("20.0.0");
    expect(result.status).toBe("pass");
    expect(result.message).toContain("20.0.0");
  });

  it("passes for Node.js 22", () => {
    const result = checkNodeVersion("22.12.0");
    expect(result.status).toBe("pass");
  });

  it("fails for Node.js 18", () => {
    const result = checkNodeVersion("18.20.0");
    expect(result.status).toBe("fail");
    expect(result.message).toContain("requires >=20");
    expect(result.suggestion).toContain("nodejs.org");
  });

  it("fails for Node.js 16", () => {
    const result = checkNodeVersion("16.0.0");
    expect(result.status).toBe("fail");
  });

  it("fails for malformed version defaulting to 0", () => {
    const result = checkNodeVersion("bad.version");
    expect(result.status).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// checkPackageName
// ---------------------------------------------------------------------------

describe("checkPackageName", () => {
  it("returns null when app is undefined", () => {
    expect(checkPackageName(undefined)).toBeNull();
  });

  it("passes for a well-formed package name", () => {
    const result = checkPackageName("com.example.app");
    expect(result?.status).toBe("pass");
    expect(result?.message).toContain("com.example.app");
  });

  it("passes for a 3-segment package name", () => {
    expect(checkPackageName("tv.visioo.remote")?.status).toBe("pass");
  });

  it("passes for package names with underscores and digits", () => {
    expect(checkPackageName("com.my_company.app2")?.status).toBe("pass");
  });

  it("warns for a single-segment name (no dots)", () => {
    const result = checkPackageName("myapp");
    expect(result?.status).toBe("warn");
    expect(result?.suggestion).toContain("2+");
  });

  it("warns for a name starting with a digit", () => {
    expect(checkPackageName("1com.example.app")?.status).toBe("warn");
  });

  it("warns for a name with an empty segment", () => {
    expect(checkPackageName("com..example")?.status).toBe("warn");
  });

  it("warns for a segment starting with a digit", () => {
    expect(checkPackageName("com.1example.app")?.status).toBe("warn");
  });
});

// ---------------------------------------------------------------------------
// checkProxy
// ---------------------------------------------------------------------------

describe("checkProxy", () => {
  it("returns null when no proxy is configured", () => {
    expect(checkProxy(undefined)).toBeNull();
  });

  it("passes for a valid http proxy URL", () => {
    const result = checkProxy("http://proxy.example.com:8080");
    expect(result?.status).toBe("pass");
    expect(result?.message).toContain("proxy.example.com");
  });

  it("passes for a valid https proxy URL", () => {
    expect(checkProxy("https://proxy.internal:3128")?.status).toBe("pass");
  });

  it("warns for a non-URL string", () => {
    const result = checkProxy("not-a-url");
    expect(result?.status).toBe("warn");
    expect(result?.suggestion).toContain("HTTPS_PROXY");
  });

  it("returns null for empty string (no proxy configured)", () => {
    expect(checkProxy("")).toBeNull();
  });
});
