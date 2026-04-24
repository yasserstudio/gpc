import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkSigningConsistency } from "../src/signing-consistency.js";

const FP_A =
  "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89";
const FP_B =
  "00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF";

function mockFetch(
  handlers: Array<{ match: (url: string, method: string) => boolean; ok: boolean; body: unknown }>,
) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    const method = init?.method ?? "GET";

    if (method === "DELETE") {
      return { ok: true, json: async () => ({}) } as Response;
    }

    for (const handler of handlers) {
      if (handler.match(urlStr, method)) {
        return {
          ok: handler.ok,
          status: handler.ok ? 200 : 400,
          json: async () => handler.body,
        } as Response;
      }
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
}

function postEdits(url: string, method: string): boolean {
  return method === "POST" && url.endsWith("/edits");
}
function getBundles(url: string, method: string): boolean {
  return method === "GET" && url.includes("/edits/") && url.endsWith("/bundles");
}
function getGeneratedApks(versionCode: number) {
  return (url: string, method: string): boolean =>
    method === "GET" && url.endsWith(`/generatedApks/${versionCode}`);
}

describe("checkSigningConsistency", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns consistent when two bundles have matching certs", async () => {
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      { match: getBundles, ok: true, body: { bundles: [{ versionCode: 10 }, { versionCode: 9 }] } },
      {
        match: getGeneratedApks(10),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: FP_A }] },
      },
      {
        match: getGeneratedApks(9),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: FP_A }] },
      },
    ]) as typeof fetch;

    const result = await checkSigningConsistency("token", "com.test.app");
    expect(result.consistent).toBe(true);
    expect(result.firstRelease).toBe(false);
    expect(result.currentVersionCode).toBe(10);
    expect(result.previousVersionCode).toBe(9);
  });

  it("returns inconsistent when certs differ", async () => {
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      {
        match: getBundles,
        ok: true,
        body: { bundles: [{ versionCode: 20 }, { versionCode: 19 }] },
      },
      {
        match: getGeneratedApks(20),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: FP_A }] },
      },
      {
        match: getGeneratedApks(19),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: FP_B }] },
      },
    ]) as typeof fetch;

    const result = await checkSigningConsistency("token", "com.test.app");
    expect(result.consistent).toBe(false);
    expect(result.currentFingerprint).toBe(FP_A);
    expect(result.previousFingerprint).toBe(FP_B);
  });

  it("returns firstRelease when only one bundle exists", async () => {
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      { match: getBundles, ok: true, body: { bundles: [{ versionCode: 1 }] } },
      {
        match: getGeneratedApks(1),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: FP_A }] },
      },
    ]) as typeof fetch;

    const result = await checkSigningConsistency("token", "com.test.app");
    expect(result.consistent).toBe(true);
    expect(result.firstRelease).toBe(true);
    expect(result.previousVersionCode).toBeUndefined();
  });

  it("throws when no bundles exist", async () => {
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      { match: getBundles, ok: true, body: { bundles: [] } },
    ]) as typeof fetch;

    await expect(checkSigningConsistency("token", "com.test.app")).rejects.toThrow(
      "No bundles found",
    );
  });

  it("throws when edit creation fails", async () => {
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: false, body: { error: { message: "Permission denied" } } },
    ]) as typeof fetch;

    await expect(checkSigningConsistency("token", "com.test.app")).rejects.toThrow(
      "Failed to create edit",
    );
  });

  it("throws when generated APKs have no fingerprint", async () => {
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      { match: getBundles, ok: true, body: { bundles: [{ versionCode: 5 }, { versionCode: 4 }] } },
      { match: getGeneratedApks(5), ok: true, body: { generatedApks: [] } },
    ]) as typeof fetch;

    await expect(checkSigningConsistency("token", "com.test.app")).rejects.toThrow(
      "No signing certificate found",
    );
  });

  it("throws when bundles list HTTP fails", async () => {
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      { match: getBundles, ok: false, body: {} },
    ]) as typeof fetch;

    await expect(checkSigningConsistency("token", "com.test.app")).rejects.toThrow(
      "Failed to list bundles",
    );
  });

  it("matches case-insensitive fingerprints as consistent", async () => {
    const fpLower = FP_A.toLowerCase();
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      { match: getBundles, ok: true, body: { bundles: [{ versionCode: 10 }, { versionCode: 9 }] } },
      {
        match: getGeneratedApks(10),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: FP_A }] },
      },
      {
        match: getGeneratedApks(9),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: fpLower }] },
      },
    ]) as typeof fetch;

    const result = await checkSigningConsistency("token", "com.test.app");
    expect(result.consistent).toBe(true);
  });

  it("calls DELETE on edit even when bundles list fails", async () => {
    const deleteCalls: string[] = [];
    const baseMock = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      { match: getBundles, ok: false, body: {} },
    ]);
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
      const method = init?.method ?? "GET";
      if (method === "DELETE") {
        deleteCalls.push(urlStr);
        return { ok: true, json: async () => ({}) } as Response;
      }
      return baseMock(url, init);
    }) as typeof fetch;

    await expect(checkSigningConsistency("token", "com.test.app")).rejects.toThrow();
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0]).toContain("/edits/edit-1");
  });

  it("sorts bundles by versionCode descending", async () => {
    globalThis.fetch = mockFetch([
      { match: postEdits, ok: true, body: { id: "edit-1" } },
      {
        match: getBundles,
        ok: true,
        body: { bundles: [{ versionCode: 3 }, { versionCode: 7 }, { versionCode: 5 }] },
      },
      {
        match: getGeneratedApks(7),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: FP_A }] },
      },
      {
        match: getGeneratedApks(5),
        ok: true,
        body: { generatedApks: [{ certificateSha256Fingerprint: FP_A }] },
      },
    ]) as typeof fetch;

    const result = await checkSigningConsistency("token", "com.test.app");
    expect(result.currentVersionCode).toBe(7);
    expect(result.previousVersionCode).toBe(5);
  });
});
