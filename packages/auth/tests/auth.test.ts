import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("googleapis", () => {
  const mockGetAccessToken = vi.fn().mockResolvedValue({ token: "mock-token" });

  function MockJWT() {
    return { getAccessToken: mockGetAccessToken };
  }

  function MockGoogleAuth() {
    return {
      getClient: vi.fn().mockRejectedValue(new Error("No ADC")),
      getProjectId: vi.fn().mockRejectedValue(new Error("No ADC")),
    };
  }

  return {
    google: {
      auth: {
        JWT: MockJWT,
        GoogleAuth: MockGoogleAuth,
      },
    },
  };
});

const MOCK_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "test-project",
  private_key_id: "key-id-123",
  private_key:
    "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n",
  client_email: "test@test-project.iam.gserviceaccount.com",
  client_id: "123456789",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

import { AuthError } from "../src/errors";
import {
  loadServiceAccountKey,
  createServiceAccountAuth,
} from "../src/service-account";
import { resolveAuth } from "../src/resolve";

let tempDir: string;
const tempFiles: string[] = [];

beforeEach(async () => {
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
// loadServiceAccountKey
// ---------------------------------------------------------------------------
describe("loadServiceAccountKey", () => {
  it("loads from a valid JSON file", async () => {
    const filePath = await writeTempFile(
      "sa.json",
      JSON.stringify(MOCK_SERVICE_ACCOUNT),
    );
    const key = await loadServiceAccountKey(filePath);
    expect(key.type).toBe("service_account");
    expect(key.client_email).toBe(
      "test@test-project.iam.gserviceaccount.com",
    );
    expect(key.project_id).toBe("test-project");
  });

  it("loads from a raw JSON string", async () => {
    const key = await loadServiceAccountKey(
      JSON.stringify(MOCK_SERVICE_ACCOUNT),
    );
    expect(key.type).toBe("service_account");
    expect(key.client_email).toBe(
      "test@test-project.iam.gserviceaccount.com",
    );
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
    expect(client.getClientEmail()).toBe(
      "test@test-project.iam.gserviceaccount.com",
    );
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
    const filePath = await writeTempFile(
      "sa-resolve.json",
      JSON.stringify(MOCK_SERVICE_ACCOUNT),
    );
    const client = await resolveAuth({ serviceAccountPath: filePath });
    expect(client.getClientEmail()).toBe(
      "test@test-project.iam.gserviceaccount.com",
    );
  });

  it("uses serviceAccountJson from options when provided", async () => {
    const client = await resolveAuth({
      serviceAccountJson: JSON.stringify(MOCK_SERVICE_ACCOUNT),
    });
    expect(client.getClientEmail()).toBe(
      "test@test-project.iam.gserviceaccount.com",
    );
  });

  it("uses GPC_SERVICE_ACCOUNT env var when no options provided", async () => {
    process.env["GPC_SERVICE_ACCOUNT"] = JSON.stringify(MOCK_SERVICE_ACCOUNT);
    const client = await resolveAuth();
    expect(client.getClientEmail()).toBe(
      "test@test-project.iam.gserviceaccount.com",
    );
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
});
