import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("setupNetworking proxy", () => {
  const PROXY_VARS = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "__GPC_BINARY"];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(PROXY_VARS.map((k) => [k, process.env[k]]));
    for (const k of PROXY_VARS) delete process.env[k];
    vi.resetModules();
  });

  afterEach(() => {
    for (const k of PROXY_VARS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.doUnmock("undici");
    vi.resetModules();
  });

  it("installs a NO_PROXY-aware dispatcher when HTTPS_PROXY is set", async () => {
    const setGlobalDispatcher = vi.fn();
    class EnvHttpProxyAgent {}
    vi.doMock("undici", () => ({ EnvHttpProxyAgent, setGlobalDispatcher }));
    process.env["HTTPS_PROXY"] = "http://proxy.example.com:8080";

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();

    expect(setGlobalDispatcher).toHaveBeenCalledTimes(1);
    expect(setGlobalDispatcher.mock.calls[0]![0]).toBeInstanceOf(EnvHttpProxyAgent);
  });

  it("fails closed without echoing the proxy URL when the proxy cannot be applied", async () => {
    vi.doMock("undici", () => ({
      EnvHttpProxyAgent: class {
        constructor() {
          throw new TypeError("Invalid URL: http://user:s3cret@proxy");
        }
      },
      setGlobalDispatcher: vi.fn(),
    }));
    process.env["HTTP_PROXY"] = "http://user:s3cret@proxy";

    const { setupNetworking } = await import("../src/networking.js");
    const error = await setupNetworking().catch((e: unknown) => e);

    expect(error).toMatchObject({ code: "NETWORK_ERROR", exitCode: 5 });
    const text = `${(error as Error).message} ${(error as { suggestion?: string }).suggestion}`;
    expect(text).toContain("HTTP_PROXY");
    expect(text).not.toContain("s3cret");
  });

  it("leaves proxying to Bun in the standalone binary", async () => {
    const setGlobalDispatcher = vi.fn();
    vi.doMock("undici", () => ({ EnvHttpProxyAgent: class {}, setGlobalDispatcher }));
    process.env["__GPC_BINARY"] = "1";
    process.env["HTTPS_PROXY"] = "http://proxy.example.com:8080";

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();

    expect(setGlobalDispatcher).not.toHaveBeenCalled();
  });

  it("does nothing when no proxy is configured", async () => {
    const setGlobalDispatcher = vi.fn();
    vi.doMock("undici", () => ({ EnvHttpProxyAgent: class {}, setGlobalDispatcher }));

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();

    expect(setGlobalDispatcher).not.toHaveBeenCalled();
  });
});
