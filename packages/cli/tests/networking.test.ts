import { createServer, type Server } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PROXY_VARS = [
  "HTTPS_PROXY",
  "https_proxy",
  "HTTP_PROXY",
  "http_proxy",
  "NO_PROXY",
  "no_proxy",
  "__GPC_BINARY",
];
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

describe("setupNetworking proxy (real undici)", () => {
  let server: Server;
  let proxyUrl: string;
  let seen: string[];

  beforeEach(async () => {
    // A fake proxy that records the CONNECT target, then refuses the tunnel.
    seen = [];
    server = createServer((socket) => {
      socket.once("data", (chunk) => {
        seen.push(chunk.toString().split("\r\n")[0]!);
        socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    proxyUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    const { Agent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new Agent());
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function probe(url: string): Promise<void> {
    await fetch(url, { signal: AbortSignal.timeout(3000) }).catch(() => undefined);
  }

  it("routes HTTPS requests through the proxy without an experimental warning", async () => {
    process.env["HTTPS_PROXY"] = proxyUrl;
    const warn = vi.spyOn(process, "emitWarning");

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();
    await probe("https://androidpublisher.googleapis.com/");

    expect(seen).toEqual(["CONNECT androidpublisher.googleapis.com:443 HTTP/1.1"]);
    expect(warn.mock.calls.some((call) => JSON.stringify(call).includes("UNDICI-EHPA"))).toBe(
      false,
    );
  });

  it("still proxies when an empty lowercase variable shadows the uppercase one", async () => {
    process.env["https_proxy"] = "";
    process.env["HTTPS_PROXY"] = proxyUrl;

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();
    await probe("https://androidpublisher.googleapis.com/");

    expect(seen).toEqual(["CONNECT androidpublisher.googleapis.com:443 HTTP/1.1"]);
  });

  it("uses HTTP_PROXY for HTTPS requests when no HTTPS proxy is set", async () => {
    process.env["http_proxy"] = "";
    process.env["HTTP_PROXY"] = proxyUrl;

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();
    await probe("https://androidpublisher.googleapis.com/");

    expect(seen).toEqual(["CONNECT androidpublisher.googleapis.com:443 HTTP/1.1"]);
  });

  it("honors NO_PROXY", async () => {
    process.env["HTTPS_PROXY"] = proxyUrl;
    process.env["NO_PROXY"] = "localhost";

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();
    await probe("https://localhost:1/");

    expect(seen).toEqual([]);
  });

  it("fails closed on a malformed proxy URL without echoing it", async () => {
    process.env["HTTPS_PROXY"] = "http://user:s3cret@[bad";

    const { setupNetworking } = await import("../src/networking.js");
    const error = await setupNetworking().catch((e: unknown) => e);

    expect(error).toMatchObject({ code: "NETWORK_ERROR", exitCode: 5 });
    const text = `${(error as Error).message} ${(error as { suggestion?: string }).suggestion}`;
    expect(text).toContain("HTTPS_PROXY");
    expect(text).not.toContain("s3cret");
  });
});

describe("setupNetworking proxy (skipped paths)", () => {
  it("leaves proxying to Bun in the standalone binary", async () => {
    const setGlobalDispatcher = vi.fn();
    vi.doMock("undici", () => ({ EnvHttpProxyAgent: class {}, setGlobalDispatcher }));
    process.env["__GPC_BINARY"] = "1";
    process.env["HTTPS_PROXY"] = "http://proxy.example.com:8080";

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();

    expect(setGlobalDispatcher).not.toHaveBeenCalled();
  });

  it("does nothing when no proxy is configured, including empty variables", async () => {
    const setGlobalDispatcher = vi.fn();
    vi.doMock("undici", () => ({ EnvHttpProxyAgent: class {}, setGlobalDispatcher }));
    process.env["https_proxy"] = "";

    const { setupNetworking } = await import("../src/networking.js");
    await setupNetworking();

    expect(setGlobalDispatcher).not.toHaveBeenCalled();
  });
});
