import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const { mockGetAccessToken, mockGetClient, mockGetProjectId, jwtOverride, adcOverride } =
  vi.hoisted(() => {
    const mockGetAccessToken = vi.fn().mockResolvedValue({ token: "mock-token" });
    const mockGetClient = vi.fn().mockRejectedValue(new Error("No ADC"));
    const mockGetProjectId = vi.fn().mockRejectedValue(new Error("No ADC"));
    // Allow per-test overrides via a mutable ref
    const jwtOverride: { fn: (() => unknown) | null } = { fn: null };
    const adcOverride: { fn: (() => unknown) | null } = { fn: null };
    return { mockGetAccessToken, mockGetClient, mockGetProjectId, jwtOverride, adcOverride };
  });

vi.mock("google-auth-library", () => {
  // Must use function (not arrow) so it can be called with `new`
  function MockJWT() {
    if (jwtOverride.fn) {
      const result = jwtOverride.fn();
      jwtOverride.fn = null;
      return result;
    }
    return { getAccessToken: mockGetAccessToken };
  }

  function MockGoogleAuth() {
    if (adcOverride.fn) {
      const result = adcOverride.fn();
      adcOverride.fn = null;
      return result;
    }
    return {
      getClient: mockGetClient,
      getProjectId: mockGetProjectId,
    };
  }

  return {
    JWT: MockJWT,
    GoogleAuth: MockGoogleAuth,
  };
});

const MOCK_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "test-project",
  private_key_id: "key-id-123",
  private_key: "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n",
  client_email: "test@test-project.iam.gserviceaccount.com",
  client_id: "123456789",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

import { AuthError } from "../src/errors";
import { loadServiceAccountKey, createServiceAccountAuth } from "../src/service-account";
import { resolveAuth } from "../src/resolve";
import { _resetMemoryCache } from "../src/token-cache";

let tempDir: string;
const tempFiles: string[] = [];

beforeEach(async () => {
  _resetMemoryCache();
  tempDir = await mkdtemp(join(tmpdir(), "auth-test-"));
});

afterEach(async () => {
  for (const f of tempFiles) {
    await unlink(f).catch(() => {});
  }
  tempFiles.length = 0;
});

async function writeTempFile(name: string, content: string): Promise<string> {
  const filePath = join(tempDir, name);
  await writeFile(filePath, content, "utf-8");
  tempFiles.push(filePath);
  return filePath;
}

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------
describe("AuthError", () => {
  it("has correct name, code, message, and suggestion properties", () => {
    const err = new AuthError("something broke", "AUTH_INVALID_KEY", "try again");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AuthError");
    expect(err.code).toBe("AUTH_INVALID_KEY");
    expect(err.message).toBe("something broke");
    expect(err.suggestion).toBe("try again");
  });
});

// ---------------------------------------------------------------------------
// Phase 9 – error hierarchy
// ---------------------------------------------------------------------------
describe("error hierarchy", () => {
  it("AuthError has exitCode 3", () => {
    const err = new AuthError("expired", "AUTH_EXPIRED");
    expect(err.exitCode).toBe(3);
  });

  it("AuthError has toJSON() that returns structured error", () => {
    const err = new AuthError("invalid key", "AUTH_INVALID_KEY", "Regenerate key.");
    expect(err.toJSON()).toEqual({
      success: false,
      error: {
        code: "AUTH_INVALID_KEY",
        message: "invalid key",
        suggestion: "Regenerate key.",
      },
    });
  });
});

// ---------------------------------------------------------------------------
// loadServiceAccountKey
// ---------------------------------------------------------------------------
describe("loadServiceAccountKey", () => {
  it("loads from a valid JSON file", async () => {
    const filePath = await writeTempFile("sa.json", JSON.stringify(MOCK_SERVICE_ACCOUNT));
    const key = await loadServiceAccountKey(filePath);
    expect(key.type).toBe("service_account");
    expect(key.client_email).toBe("test@test-project.iam.gserviceaccount.com");
    expect(key.project_id).toBe("test-project");
  });

  it("loads from a raw JSON string", async () => {
    const key = await loadServiceAccountKey(JSON.stringify(MOCK_SERVICE_ACCOUNT));
    expect(key.type).toBe("service_account");
    expect(key.client_email).toBe("test@test-project.iam.gserviceaccount.com");
  });

  it("throws AUTH_FILE_NOT_FOUND for a missing file", async () => {
    try {
      await loadServiceAccountKey("/tmp/nonexistent-file-abc123.json");
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_FILE_NOT_FOUND");
    }
  });

  it("throws AUTH_INVALID_KEY for invalid JSON", async () => {
    const filePath = await writeTempFile("bad.json", "not json {{{");
    try {
      await loadServiceAccountKey(filePath);
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_INVALID_KEY");
    }
  });

  it("throws AUTH_INVALID_KEY for missing required fields", async () => {
    const incomplete = { type: "service_account" };
    try {
      await loadServiceAccountKey(JSON.stringify(incomplete));
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_INVALID_KEY");
      expect((err as AuthError).message).toContain("private_key");
    }
  });

  it('throws AUTH_INVALID_KEY when type is not "service_account"', async () => {
    const badType = { ...MOCK_SERVICE_ACCOUNT, type: "oauth_client" };
    try {
      await loadServiceAccountKey(JSON.stringify(badType));
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_INVALID_KEY");
      expect((err as AuthError).message).toContain("oauth_client");
    }
  });
});

// ---------------------------------------------------------------------------
// createServiceAccountAuth
// ---------------------------------------------------------------------------
describe("createServiceAccountAuth", () => {
  it("returns an AuthClient with getClientEmail() returning the email", () => {
    const client = createServiceAccountAuth(MOCK_SERVICE_ACCOUNT);
    expect(client.getClientEmail()).toBe("test@test-project.iam.gserviceaccount.com");
  });

  it("returns an AuthClient with getProjectId() returning the project_id", () => {
    const client = createServiceAccountAuth(MOCK_SERVICE_ACCOUNT);
    expect(client.getProjectId()).toBe("test-project");
  });
});

// ---------------------------------------------------------------------------
// resolveAuth
// ---------------------------------------------------------------------------
describe("resolveAuth", () => {
  const originalEnv = process.env["GPC_SERVICE_ACCOUNT"];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env["GPC_SERVICE_ACCOUNT"] = originalEnv;
    } else {
      delete process.env["GPC_SERVICE_ACCOUNT"];
    }
  });

  it("uses serviceAccountPath from options when provided", async () => {
    const filePath = await writeTempFile("sa-resolve.json", JSON.stringify(MOCK_SERVICE_ACCOUNT));
    const client = await resolveAuth({ serviceAccountPath: filePath });
    expect(client.getClientEmail()).toBe("test@test-project.iam.gserviceaccount.com");
  });

  it("uses serviceAccountJson from options when provided", async () => {
    const client = await resolveAuth({
      serviceAccountJson: JSON.stringify(MOCK_SERVICE_ACCOUNT),
    });
    expect(client.getClientEmail()).toBe("test@test-project.iam.gserviceaccount.com");
  });

  it("uses GPC_SERVICE_ACCOUNT env var when no options provided", async () => {
    process.env["GPC_SERVICE_ACCOUNT"] = JSON.stringify(MOCK_SERVICE_ACCOUNT);
    const client = await resolveAuth();
    expect(client.getClientEmail()).toBe("test@test-project.iam.gserviceaccount.com");
  });

  it("throws AUTH_NO_CREDENTIALS when nothing is configured", async () => {
    delete process.env["GPC_SERVICE_ACCOUNT"];
    try {
      await resolveAuth();
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_NO_CREDENTIALS");
    }
  });

  it("serviceAccountJson takes priority over GPC_SERVICE_ACCOUNT env var", async () => {
    const altAccount = {
      ...MOCK_SERVICE_ACCOUNT,
      client_email: "json-option@test-project.iam.gserviceaccount.com",
    };
    process.env["GPC_SERVICE_ACCOUNT"] = JSON.stringify(MOCK_SERVICE_ACCOUNT);
    const client = await resolveAuth({
      serviceAccountJson: JSON.stringify(altAccount),
    });
    expect(client.getClientEmail()).toBe("json-option@test-project.iam.gserviceaccount.com");
  });

  it("falls back to ADC when no service account options or env var are set", async () => {
    delete process.env["GPC_SERVICE_ACCOUNT"];

    const adcClient = {
      email: "adc-user@example.com",
      getAccessToken: vi.fn().mockResolvedValue({ token: "adc-token" }),
    };

    adcOverride.fn = () => ({
      getClient: vi.fn().mockResolvedValue(adcClient),
      getProjectId: vi.fn().mockResolvedValue("adc-project"),
    });

    const client = await resolveAuth();
    expect(client.getClientEmail()).toBe("adc-user@example.com");
    expect(client.getProjectId()).toBe("adc-project");
    const token = await client.getAccessToken();
    expect(token).toBe("adc-token");
  });

  it("ADC client throws AUTH_TOKEN_FAILED when token is empty", async () => {
    delete process.env["GPC_SERVICE_ACCOUNT"];

    const adcClient = {
      email: "adc-user@example.com",
      getAccessToken: vi.fn().mockResolvedValue({ token: null }),
    };

    adcOverride.fn = () => ({
      getClient: vi.fn().mockResolvedValue(adcClient),
      getProjectId: vi.fn().mockResolvedValue("adc-project"),
    });

    const client = await resolveAuth();
    try {
      await client.getAccessToken();
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_TOKEN_FAILED");
      expect((err as AuthError).message).toContain(
        "Application Default Credentials returned an empty token",
      );
    }
  });

  it("ADC client returns 'unknown' when email is not available", async () => {
    delete process.env["GPC_SERVICE_ACCOUNT"];

    const adcClient = {
      getAccessToken: vi.fn().mockResolvedValue({ token: "adc-token" }),
    };

    adcOverride.fn = () => ({
      getClient: vi.fn().mockResolvedValue(adcClient),
      getProjectId: vi.fn().mockRejectedValue(new Error("no project")),
    });

    const client = await resolveAuth();
    expect(client.getClientEmail()).toBe("adc-default");
    expect(client.getProjectId()).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// validateServiceAccountKey – non-object inputs
// ---------------------------------------------------------------------------
describe("validateServiceAccountKey via loadServiceAccountKey", () => {
  it("throws AUTH_INVALID_KEY when JSON parses to null", async () => {
    try {
      await loadServiceAccountKey('{"type":"service_account"}');
      // The above has missing fields, but we want null specifically.
      // null doesn't start with '{', so we need a file approach.
    } catch {
      // ignore — this is not the test we want
    }

    // Create a file that contains "null"
    const filePath = await writeTempFile("null.json", "null");
    try {
      await loadServiceAccountKey(filePath);
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_INVALID_KEY");
      expect((err as AuthError).message).toContain("must be a JSON object");
    }
  });

  it("throws AUTH_INVALID_KEY when JSON parses to an array", async () => {
    const filePath = await writeTempFile("array.json", "[]");
    try {
      await loadServiceAccountKey(filePath);
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_INVALID_KEY");
    }
  });

  it("throws AUTH_INVALID_KEY when JSON parses to a number", async () => {
    const filePath = await writeTempFile("number.json", "42");
    try {
      await loadServiceAccountKey(filePath);
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_INVALID_KEY");
      expect((err as AuthError).message).toContain("must be a JSON object");
    }
  });
});

// ---------------------------------------------------------------------------
// createServiceAccountAuth – getAccessToken and getProjectId
// ---------------------------------------------------------------------------
describe("createServiceAccountAuth – token and project", () => {
  it("getAccessToken returns the token from the JWT client", async () => {
    const client = createServiceAccountAuth(MOCK_SERVICE_ACCOUNT);
    const token = await client.getAccessToken();
    expect(token).toBe("mock-token");
  });

  it("getAccessToken throws AUTH_TOKEN_FAILED when JWT rejects", async () => {
    jwtOverride.fn = () => ({
      getAccessToken: vi.fn().mockRejectedValue(new Error("private key is invalid")),
    });

    const client = createServiceAccountAuth(MOCK_SERVICE_ACCOUNT);
    try {
      await client.getAccessToken();
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_TOKEN_FAILED");
      expect((err as AuthError).message).toContain("private key is invalid");
    }
  });

  it("getAccessToken throws AUTH_TOKEN_FAILED when token is empty", async () => {
    jwtOverride.fn = () => ({
      getAccessToken: vi.fn().mockResolvedValue({ token: null }),
    });

    const client = createServiceAccountAuth(MOCK_SERVICE_ACCOUNT);
    try {
      await client.getAccessToken();
      expect.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("AUTH_TOKEN_FAILED");
      expect((err as AuthError).message).toContain("Token response was empty");
    }
  });

  it("getProjectId returns undefined when project_id is absent", () => {
    const keyWithoutProject = { ...MOCK_SERVICE_ACCOUNT };
    delete (keyWithoutProject as Record<string, unknown>)["project_id"];
    const client = createServiceAccountAuth(keyWithoutProject);
    expect(client.getProjectId()).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Token cache edge cases
// ---------------------------------------------------------------------------
import { getCachedToken, setCachedToken, clearTokenCache, acquireToken } from "../src/token-cache";

describe("token cache – edge cases", () => {
  let cacheDir: string;

  beforeEach(async () => {
    _resetMemoryCache();
    cacheDir = await mkdtemp(join(tmpdir(), "auth-cache-"));
  });

  afterEach(async () => {
    await unlink(join(cacheDir, "token-cache.json")).catch(() => {});
    await unlink(join(cacheDir, "token-cache.json.tmp")).catch(() => {});
  });

  it("getCachedToken returns null for missing email", async () => {
    const result = await getCachedToken(cacheDir, "nobody@example.com");
    expect(result).toBeNull();
  });

  it("setCachedToken and getCachedToken round-trip", async () => {
    await setCachedToken(cacheDir, "test@example.com", "tok123", 3600);
    const result = await getCachedToken(cacheDir, "test@example.com");
    expect(result).toBe("tok123");
  });

  it("getCachedToken returns null for expired token", async () => {
    // Set token that expires immediately (negative margin)
    await setCachedToken(cacheDir, "expired@example.com", "old-token", -1);
    const result = await getCachedToken(cacheDir, "expired@example.com");
    expect(result).toBeNull();
  });

  it("clearTokenCache removes specific email", async () => {
    await setCachedToken(cacheDir, "a@example.com", "tok-a", 3600);
    await setCachedToken(cacheDir, "b@example.com", "tok-b", 3600);
    await clearTokenCache(cacheDir, "a@example.com");
    const a = await getCachedToken(cacheDir, "a@example.com");
    const b = await getCachedToken(cacheDir, "b@example.com");
    expect(a).toBeNull();
    expect(b).toBe("tok-b");
  });

  it("clearTokenCache without email clears everything", async () => {
    await setCachedToken(cacheDir, "x@example.com", "tok-x", 3600);
    await clearTokenCache(cacheDir);
    const result = await getCachedToken(cacheDir, "x@example.com");
    expect(result).toBeNull();
  });

  it("acquireToken deduplicates concurrent refresh calls", async () => {
    _resetMemoryCache();
    let callCount = 0;
    const refresh = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      return { token: "dedup-token", expiresInSeconds: 3600 };
    };

    // Fire two concurrent acquireToken calls for the same email
    const [tok1, tok2] = await Promise.all([
      acquireToken("concurrent@example.com", cacheDir, refresh),
      acquireToken("concurrent@example.com", cacheDir, refresh),
    ]);

    expect(tok1).toBe("dedup-token");
    expect(tok2).toBe("dedup-token");
    // Should only have called refresh once due to mutex
    expect(callCount).toBe(1);
  });

  it("acquireToken returns cached token on second call", async () => {
    _resetMemoryCache();
    let callCount = 0;
    const refresh = async () => {
      callCount++;
      return { token: "cached-token", expiresInSeconds: 3600 };
    };

    const tok1 = await acquireToken("cached@example.com", cacheDir, refresh);
    const tok2 = await acquireToken("cached@example.com", cacheDir, refresh);

    expect(tok1).toBe("cached-token");
    expect(tok2).toBe("cached-token");
    expect(callCount).toBe(1);
  });

  it("acquireToken works without cacheDir", async () => {
    _resetMemoryCache();
    const refresh = async () => ({ token: "no-disk-token", expiresInSeconds: 3600 });
    const tok = await acquireToken("nodisk@example.com", undefined, refresh);
    expect(tok).toBe("no-disk-token");
  });

  it("getCachedToken throws on invalid cache key", async () => {
    await expect(getCachedToken(cacheDir, "../traversal")).rejects.toThrow("Invalid cache key");
  });

  it("setCachedToken throws on invalid cache key", async () => {
    await expect(setCachedToken(cacheDir, "bad/key", "tok", 3600)).rejects.toThrow(
      "Invalid cache key",
    );
  });
});
