import { describe, it, expect } from "vitest";
import { GpcError, ConfigError, ApiError, NetworkError } from "../src/errors";

describe("error code catalog", () => {
  it("GpcError sets correct properties", () => {
    const err = new GpcError("something failed", "ERR_TEST", 1, "try again");
    expect(err.name).toBe("GpcError");
    expect(err.message).toBe("something failed");
    expect(err.code).toBe("ERR_TEST");
    expect(err.exitCode).toBe(1);
    expect(err.suggestion).toBe("try again");
    expect(err).toBeInstanceOf(Error);
  });

  it("GpcError.toJSON() returns proper format", () => {
    const err = new GpcError("broken", "ERR_BROKEN", 1, "fix it");
    const json = err.toJSON();
    expect(json).toEqual({
      success: false,
      error: {
        code: "ERR_BROKEN",
        message: "broken",
        suggestion: "fix it",
      },
    });
  });

  it("GpcError.toJSON() omits suggestion when undefined", () => {
    const err = new GpcError("broken", "ERR_BROKEN", 1);
    const json = err.toJSON();
    expect(json.error.suggestion).toBeUndefined();
  });

  it("ConfigError uses exit code 1", () => {
    const err = new ConfigError("bad config", "CONFIG_MISSING", "check your config");
    expect(err.name).toBe("ConfigError");
    expect(err.exitCode).toBe(1);
    expect(err.code).toBe("CONFIG_MISSING");
    expect(err.suggestion).toBe("check your config");
    expect(err).toBeInstanceOf(GpcError);
    expect(err).toBeInstanceOf(Error);
  });

  it("ApiError uses exit code 4", () => {
    const err = new ApiError("forbidden", "API_FORBIDDEN", 403, "check credentials");
    expect(err.name).toBe("ApiError");
    expect(err.exitCode).toBe(4);
    expect(err.code).toBe("API_FORBIDDEN");
    expect(err.statusCode).toBe(403);
    expect(err.suggestion).toBe("check credentials");
    expect(err).toBeInstanceOf(GpcError);
  });

  it("ApiError works without statusCode", () => {
    const err = new ApiError("unknown error", "API_UNKNOWN");
    expect(err.statusCode).toBeUndefined();
    expect(err.exitCode).toBe(4);
  });

  it("NetworkError uses exit code 5 and fixed code", () => {
    const err = new NetworkError("connection refused", "check your internet");
    expect(err.name).toBe("NetworkError");
    expect(err.exitCode).toBe(5);
    expect(err.code).toBe("NETWORK_ERROR");
    expect(err.suggestion).toBe("check your internet");
    expect(err).toBeInstanceOf(GpcError);
  });

  it("all error classes inherit from Error", () => {
    const errors = [
      new GpcError("test", "T", 1),
      new ConfigError("test", "T"),
      new ApiError("test", "T"),
      new NetworkError("test"),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(Error);
      expect(err.stack).toBeDefined();
    }
  });
});
