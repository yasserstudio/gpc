import { describe, it, expect } from "vitest";
import { redactSensitive, SENSITIVE_KEYS } from "../src/output";
import { redactAuditArgs, SENSITIVE_ARG_KEYS, createAuditEntry } from "../src/audit";

describe("redactSensitive (output.ts)", () => {
  it("redacts private_key in a flat object", () => {
    const data = { name: "test", private_key: "-----BEGIN RSA PRIVATE KEY-----\nSECRET" };
    const result = redactSensitive(data) as Record<string, unknown>;
    expect(result["private_key"]).toBe("[REDACTED]");
    expect(result["name"]).toBe("test");
  });

  it("redacts client_secret in a flat object", () => {
    const data = { client_secret: "super-secret-value", client_id: "12345" };
    const result = redactSensitive(data) as Record<string, unknown>;
    expect(result["client_secret"]).toBe("[REDACTED]");
    expect(result["client_id"]).toBe("12345");
  });

  it("redacts multiple sensitive fields", () => {
    const data = {
      token: "abc123",
      password: "hunter2",
      apiKey: "key-xyz",
      bearer: "Bearer token",
      jwt: "eyJhbGciOiJIUzI1NiJ9...",
      username: "admin",
    };
    const result = redactSensitive(data) as Record<string, unknown>;
    expect(result["token"]).toBe("[REDACTED]");
    expect(result["password"]).toBe("[REDACTED]");
    expect(result["apiKey"]).toBe("[REDACTED]");
    expect(result["bearer"]).toBe("[REDACTED]");
    expect(result["jwt"]).toBe("[REDACTED]");
    expect(result["username"]).toBe("admin");
  });

  it("redacts nested object fields recursively", () => {
    const data = {
      config: {
        auth: {
          private_key: "secret-key",
          client_email: "test@example.com",
        },
      },
    };
    const result = redactSensitive(data) as Record<string, unknown>;
    const auth = (result["config"] as Record<string, unknown>)["auth"] as Record<string, unknown>;
    expect(auth["private_key"]).toBe("[REDACTED]");
    expect(auth["client_email"]).toBe("test@example.com");
  });

  it("redacts sensitive fields inside arrays", () => {
    const data = [
      { name: "account1", access_token: "tok1" },
      { name: "account2", access_token: "tok2" },
    ];
    const result = redactSensitive(data) as Record<string, unknown>[];
    expect(result[0]!["access_token"]).toBe("[REDACTED]");
    expect(result[1]!["access_token"]).toBe("[REDACTED]");
    expect(result[0]!["name"]).toBe("account1");
  });

  it("handles null and undefined gracefully", () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
  });

  it("passes through primitives unchanged", () => {
    expect(redactSensitive("hello")).toBe("hello");
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(true)).toBe(true);
  });

  it("redacts new security keys (signing_key, keystore_password, etc.)", () => {
    const data = {
      signing_key: "key-material",
      keystore_password: "ks-pass",
      store_password: "store-pass",
      key_password: "key-pass",
      auth_token: "auth-tok",
      api_key: "api-key-value",
      unrelated: "safe",
    };
    const result = redactSensitive(data) as Record<string, unknown>;
    expect(result["signing_key"]).toBe("[REDACTED]");
    expect(result["keystore_password"]).toBe("[REDACTED]");
    expect(result["store_password"]).toBe("[REDACTED]");
    expect(result["key_password"]).toBe("[REDACTED]");
    expect(result["auth_token"]).toBe("[REDACTED]");
    expect(result["api_key"]).toBe("[REDACTED]");
    expect(result["unrelated"]).toBe("safe");
  });
});

describe("redactAuditArgs (audit.ts)", () => {
  it("redacts sensitive keys in audit entry args", () => {
    const entry = createAuditEntry("test-cmd", {
      private_key: "secret",
      token: "tok123",
      track: "internal",
    });
    const redacted = redactAuditArgs(entry);
    expect(redacted.args["private_key"]).toBe("[REDACTED]");
    expect(redacted.args["token"]).toBe("[REDACTED]");
    expect(redacted.args["track"]).toBe("internal");
  });

  it("redacts new keys (apiKey, jwt, signing_key, etc.)", () => {
    const entry = createAuditEntry("deploy", {
      apiKey: "my-api-key",
      jwt: "eyJhbGci...",
      signing_key: "sign-key",
      keystore_password: "ks-pwd",
      store_password: "store-pwd",
      key_password: "key-pwd",
      bearer: "Bearer xyz",
      auth_token: "auth-tok",
      api_key: "api-k",
      file: "app.aab",
    });
    const redacted = redactAuditArgs(entry);
    expect(redacted.args["apiKey"]).toBe("[REDACTED]");
    expect(redacted.args["jwt"]).toBe("[REDACTED]");
    expect(redacted.args["signing_key"]).toBe("[REDACTED]");
    expect(redacted.args["keystore_password"]).toBe("[REDACTED]");
    expect(redacted.args["store_password"]).toBe("[REDACTED]");
    expect(redacted.args["key_password"]).toBe("[REDACTED]");
    expect(redacted.args["bearer"]).toBe("[REDACTED]");
    expect(redacted.args["auth_token"]).toBe("[REDACTED]");
    expect(redacted.args["api_key"]).toBe("[REDACTED]");
    expect(redacted.args["file"]).toBe("app.aab");
  });

  it("does not mutate the original entry", () => {
    const entry = createAuditEntry("cmd", { token: "secret", name: "test" });
    const redacted = redactAuditArgs(entry);
    expect(entry.args["token"]).toBe("secret");
    expect(redacted.args["token"]).toBe("[REDACTED]");
  });
});

describe("key set alignment", () => {
  it("SENSITIVE_KEYS (output.ts) and SENSITIVE_ARG_KEYS (audit.ts) share a common baseline", () => {
    // These keys must be in BOTH sets — they represent the core credential fields
    const commonKeys = [
      "private_key",
      "privateKey",
      "private_key_id",
      "privateKeyId",
      "client_secret",
      "clientSecret",
      "accessToken",
      "access_token",
      "refreshToken",
      "refresh_token",
      "token",
      "password",
      "secret",
      "credentials",
      "apiKey",
      "api_key",
      "auth_token",
      "bearer",
      "jwt",
      "signing_key",
      "keystore_password",
      "store_password",
      "key_password",
    ];

    for (const key of commonKeys) {
      expect(SENSITIVE_KEYS.has(key), `SENSITIVE_KEYS missing: ${key}`).toBe(true);
      expect(SENSITIVE_ARG_KEYS.has(key), `SENSITIVE_ARG_KEYS missing: ${key}`).toBe(true);
    }
  });
});
