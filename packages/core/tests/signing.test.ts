import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseKeytoolOutput,
  normalizeFingerprint,
  compareFingerprints,
  getKeystoreFingerprint,
  getApiSigningFingerprint,
} from "../src/index.js";

describe("parseKeytoolOutput", () => {
  const ORACLE_OUTPUT = `
Keystore type: PKCS12
Keystore provider: SUN

Your keystore contains 1 entry

Alias name: mykey
Creation date: Jan 1, 2025
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=Test, OU=Dev, O=TestOrg, L=City, ST=State, C=US
Issuer: CN=Test, OU=Dev, O=TestOrg, L=City, ST=State, C=US
Serial number: abcdef12
Valid from: Wed Jan 01 00:00:00 UTC 2025 until: Tue Dec 31 23:59:59 UTC 2050
Certificate fingerprints:
	 SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
	 SHA256: AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89
Signature algorithm name: SHA256withRSA
`;

  const OPENJDK_OUTPUT = `
Alias name: upload
Creation date: Mar 15, 2024
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=Upload Key
SHA-256: 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00
SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
`;

  it("extracts SHA-256 from Oracle JDK output", () => {
    const result = parseKeytoolOutput(ORACLE_OUTPUT);
    expect(result.sha256).toBe(
      "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
    );
    expect(result.alias).toBe("mykey");
  });

  it("extracts SHA-256 from OpenJDK output", () => {
    const result = parseKeytoolOutput(OPENJDK_OUTPUT);
    expect(result.sha256).toBe(
      "11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00",
    );
    expect(result.alias).toBe("upload");
  });

  it("throws when SHA-256 is missing", () => {
    expect(() => parseKeytoolOutput("no fingerprint here")).toThrow("Could not find SHA-256");
  });

  it("normalizes fingerprint to uppercase", () => {
    const lowercaseOutput = ORACLE_OUTPUT.replace(
      "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
      "ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89",
    );
    const result = parseKeytoolOutput(lowercaseOutput);
    expect(result.sha256).toBe(
      "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
    );
  });

  it("extracts alias as unknown when missing", () => {
    const noAlias = `SHA256: AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89`;
    const result = parseKeytoolOutput(noAlias);
    expect(result.alias).toBe("unknown");
  });
});

describe("normalizeFingerprint", () => {
  it("strips colons and lowercases", () => {
    expect(normalizeFingerprint("AB:CD:EF:01")).toBe("abcdef01");
  });

  it("strips spaces", () => {
    expect(normalizeFingerprint("AB CD EF 01")).toBe("abcdef01");
  });

  it("handles already-normalized input", () => {
    expect(normalizeFingerprint("abcdef01")).toBe("abcdef01");
  });

  it("handles empty string", () => {
    expect(normalizeFingerprint("")).toBe("");
  });
});

describe("compareFingerprints", () => {
  it("matches identical fingerprints", () => {
    expect(
      compareFingerprints(
        "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
        "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
      ),
    ).toBe(true);
  });

  it("matches case-insensitive", () => {
    expect(
      compareFingerprints(
        "ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89",
        "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
      ),
    ).toBe(true);
  });

  it("matches with/without colons", () => {
    expect(
      compareFingerprints(
        "ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789",
        "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
      ),
    ).toBe(true);
  });

  it("detects mismatches", () => {
    expect(
      compareFingerprints(
        "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89",
        "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00",
      ),
    ).toBe(false);
  });
});

const FP_FULL =
  "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  constants: { R_OK: 4 },
}));

describe("getKeystoreFingerprint", () => {
  const KEYTOOL_OUTPUT = `
Alias name: release
SHA256: ${FP_FULL}
`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fingerprint from keytool output", async () => {
    const { access } = await import("node:fs/promises");
    const { execFile } = await import("node:child_process");
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(execFile).mockImplementation(((
      _cmd: unknown,
      _args: unknown,
      _opts: unknown,
      cb: unknown,
    ) => {
      (cb as Function)(null, KEYTOOL_OUTPUT, "");
    }) as unknown as typeof execFile);

    const result = await getKeystoreFingerprint("/path/to/keystore.jks", "password123");
    expect(result.sha256).toBe(FP_FULL);
    expect(result.alias).toBe("release");
    expect(result.keystorePath).toBe("/path/to/keystore.jks");
  });

  it("throws KEYTOOL_NOT_FOUND when keytool is missing", async () => {
    const { access } = await import("node:fs/promises");
    const { execFile } = await import("node:child_process");
    vi.mocked(access).mockResolvedValue(undefined);
    const enoent = Object.assign(new Error("spawn keytool ENOENT"), { code: "ENOENT" });
    vi.mocked(execFile).mockImplementation(((
      _cmd: unknown,
      _args: unknown,
      _opts: unknown,
      cb: unknown,
    ) => {
      (cb as Function)(enoent, "", "keytool not found");
    }) as unknown as typeof execFile);

    await expect(getKeystoreFingerprint("/path/to/keystore.jks", "pass")).rejects.toThrow(
      "keytool not found",
    );
  });

  it("throws KEYSTORE_PASSWORD_ERROR on wrong password", async () => {
    const { access } = await import("node:fs/promises");
    const { execFile } = await import("node:child_process");
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(execFile).mockImplementation(((
      _cmd: unknown,
      _args: unknown,
      _opts: unknown,
      cb: unknown,
    ) => {
      (cb as Function)(new Error("keytool error"), "", "password was incorrect");
    }) as unknown as typeof execFile);

    await expect(getKeystoreFingerprint("/path/to/keystore.jks", "wrong")).rejects.toThrow(
      "Keystore password is incorrect",
    );
  });

  it("throws KEYSTORE_READ_ERROR when file is not readable", async () => {
    const { access } = await import("node:fs/promises");
    vi.mocked(access).mockRejectedValue(new Error("EACCES"));

    await expect(getKeystoreFingerprint("/no/such/file.jks", "pass")).rejects.toThrow(
      "Keystore not found or not readable",
    );
  });
});

describe("getApiSigningFingerprint", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns fingerprint from API", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
      const method = init?.method ?? "GET";
      if (method === "POST" && urlStr.endsWith("/edits"))
        return { ok: true, json: async () => ({ id: "e1" }) } as Response;
      if (method === "GET" && urlStr.endsWith("/bundles"))
        return { ok: true, json: async () => ({ bundles: [{ versionCode: 42 }] }) } as Response;
      if (method === "GET" && urlStr.endsWith("/generatedApks/42"))
        return {
          ok: true,
          json: async () => ({ generatedApks: [{ certificateSha256Fingerprint: FP_FULL }] }),
        } as Response;
      if (method === "DELETE") return { ok: true, json: async () => ({}) } as Response;
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as typeof fetch;

    const result = await getApiSigningFingerprint("token", "com.test.app");
    expect(result).not.toBeNull();
    expect(result!.sha256).toBe(FP_FULL);
    expect(result!.versionCode).toBe(42);
  });

  it("returns null when edit creation fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      return { ok: false, status: 403, json: async () => ({}) } as Response;
    }) as typeof fetch;

    const result = await getApiSigningFingerprint("token", "com.test.app");
    expect(result).toBeNull();
  });

  it("returns null when no bundles exist", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
      const method = init?.method ?? "GET";
      if (method === "POST" && urlStr.endsWith("/edits"))
        return { ok: true, json: async () => ({ id: "e1" }) } as Response;
      if (method === "GET" && urlStr.endsWith("/bundles"))
        return { ok: true, json: async () => ({ bundles: [] }) } as Response;
      if (method === "DELETE") return { ok: true, json: async () => ({}) } as Response;
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as typeof fetch;

    const result = await getApiSigningFingerprint("token", "com.test.app");
    expect(result).toBeNull();
  });

  it("returns null when no fingerprint in generatedApks", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
      const method = init?.method ?? "GET";
      if (method === "POST" && urlStr.endsWith("/edits"))
        return { ok: true, json: async () => ({ id: "e1" }) } as Response;
      if (method === "GET" && urlStr.endsWith("/bundles"))
        return { ok: true, json: async () => ({ bundles: [{ versionCode: 10 }] }) } as Response;
      if (method === "GET" && urlStr.endsWith("/generatedApks/10"))
        return { ok: true, json: async () => ({ generatedApks: [] }) } as Response;
      if (method === "DELETE") return { ok: true, json: async () => ({}) } as Response;
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as typeof fetch;

    const result = await getApiSigningFingerprint("token", "com.test.app");
    expect(result).toBeNull();
  });
});
