import { describe, it, expect } from "vitest";
import { redactSensitive } from "../src/output";
import { formatOutput } from "../src/output";
import { safePath, safePathWithin } from "../src/utils/safe-path";

// ---------------------------------------------------------------------------
// Output redaction
// ---------------------------------------------------------------------------
describe("redactSensitive", () => {
  it("redacts private_key field", () => {
    const data = { type: "service_account", private_key: "-----BEGIN RSA KEY-----" };
    const result = redactSensitive(data) as Record<string, unknown>;
    expect(result["private_key"]).toBe("[REDACTED]");
    expect(result["type"]).toBe("service_account");
  });

  it("redacts accessToken field", () => {
    const data = { accessToken: "ya29.secret-token", email: "test@test.com" };
    const result = redactSensitive(data) as Record<string, unknown>;
    expect(result["accessToken"]).toBe("[REDACTED]");
    expect(result["email"]).toBe("test@test.com");
  });

  it("redacts nested sensitive fields", () => {
    const data = {
      auth: { client_secret: "secret123", clientId: "id123" },
    };
    const result = redactSensitive(data) as any;
    expect(result.auth.client_secret).toBe("[REDACTED]");
    expect(result.auth.clientId).toBe("id123");
  });

  it("redacts sensitive fields in arrays", () => {
    const data = [
      { name: "safe", token: "secret" },
      { name: "also-safe", password: "pw123" },
    ];
    const result = redactSensitive(data) as any[];
    expect(result[0].token).toBe("[REDACTED]");
    expect(result[0].name).toBe("safe");
    expect(result[1].password).toBe("[REDACTED]");
  });

  it("passes through primitives unchanged", () => {
    expect(redactSensitive("hello")).toBe("hello");
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(true)).toBe(true);
    expect(redactSensitive(null)).toBe(null);
    expect(redactSensitive(undefined)).toBe(undefined);
  });

  it("does not redact non-string values with sensitive keys", () => {
    const data = { token: 12345 };
    const result = redactSensitive(data) as Record<string, unknown>;
    expect(result["token"]).toBe(12345);
  });

  it("redacts all known sensitive keys", () => {
    const keys = [
      "private_key",
      "privateKey",
      "private_key_id",
      "privateKeyId",
      "accessToken",
      "access_token",
      "refreshToken",
      "refresh_token",
      "client_secret",
      "clientSecret",
      "token",
      "password",
      "secret",
      "credentials",
    ];
    for (const key of keys) {
      const data = { [key]: "sensitive-value" };
      const result = redactSensitive(data) as Record<string, unknown>;
      expect(result[key]).toBe("[REDACTED]");
    }
  });
});

describe("formatOutput with redaction", () => {
  it("redacts by default", () => {
    const data = { accessToken: "ya29.secret" };
    const output = formatOutput(data, "json");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("ya29.secret");
  });

  it("skips redaction when redact=false", () => {
    const data = { accessToken: "ya29.secret" };
    const output = formatOutput(data, "json", false);
    expect(output).toContain("ya29.secret");
    expect(output).not.toContain("[REDACTED]");
  });
});

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------
describe("safePath", () => {
  it("resolves relative paths", () => {
    const result = safePath("foo/bar");
    expect(result).toMatch(/\/foo\/bar$/);
  });

  it("normalizes .. components", () => {
    const result = safePath("/base/sub/../other");
    expect(result).toBe("/base/other");
  });

  it("normalizes . components", () => {
    const result = safePath("/base/./sub");
    expect(result).toBe("/base/sub");
  });
});

describe("safePathWithin", () => {
  it("allows paths within base directory", () => {
    const result = safePathWithin("/base/sub/file.txt", "/base");
    expect(result).toBe("/base/sub/file.txt");
  });

  it("throws for path traversal outside base", () => {
    expect(() => safePathWithin("/base/../etc/passwd", "/base")).toThrow(/resolves outside/);
  });

  it("allows the base directory itself", () => {
    const result = safePathWithin("/base", "/base");
    expect(result).toBe("/base");
  });

  it("rejects sibling directories", () => {
    expect(() => safePathWithin("/other/file.txt", "/base")).toThrow(/resolves outside/);
  });
});
