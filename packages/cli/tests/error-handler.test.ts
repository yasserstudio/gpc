import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleCliError } from "../src/error-handler";

describe("handleCliError", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("prints error code and message for typed errors", () => {
    const err = Object.assign(new Error("something failed"), {
      code: "SOME_ERROR",
      exitCode: 4,
    });
    const code = handleCliError(err);
    expect(code).toBe(4);
    expect(errorSpy).toHaveBeenCalledWith("Error [SOME_ERROR]: something failed");
  });

  it("prints suggestion when available", () => {
    const err = Object.assign(new Error("bad input"), {
      code: "BAD_INPUT",
      exitCode: 2,
      suggestion: "Try --help",
    });
    handleCliError(err);
    const output = errorSpy.mock.calls.flat().join("\n");
    expect(output).toContain("Suggestion: Try --help");
  });

  it("appends auth hint for auth-related errors (exitCode 3)", () => {
    const err = Object.assign(new Error("not authenticated"), {
      code: "AUTH_FAILED",
      exitCode: 3,
    });
    handleCliError(err);
    const output = errorSpy.mock.calls.flat().join("\n");
    expect(output).toContain("gpc doctor");
  });

  it("appends auth hint when error code contains AUTH keyword", () => {
    const err = Object.assign(new Error("nope"), {
      code: "UNAUTHENTICATED",
      exitCode: 4,
    });
    handleCliError(err);
    const output = errorSpy.mock.calls.flat().join("\n");
    expect(output).toContain("gpc doctor");
  });

  it("does NOT append auth hint for UPDATE_* errors even with 403 in message", () => {
    const err = Object.assign(new Error("GitHub API returned HTTP 403"), {
      code: "UPDATE_API_ERROR",
      exitCode: 4,
    });
    handleCliError(err);
    const output = errorSpy.mock.calls.flat().join("\n");
    expect(output).not.toContain("gpc doctor");
  });

  it("does NOT append auth hint for UPDATE_RATE_LIMITED", () => {
    const err = Object.assign(new Error("GitHub API rate limit exceeded"), {
      code: "UPDATE_RATE_LIMITED",
      exitCode: 4,
      suggestion: "export GPC_GITHUB_TOKEN=ghp_...",
    });
    handleCliError(err);
    const output = errorSpy.mock.calls.flat().join("\n");
    expect(output).not.toContain("gpc doctor");
    expect(output).toContain("GPC_GITHUB_TOKEN");
  });

  it("returns 1 for plain Error objects", () => {
    const code = handleCliError(new Error("unknown error"));
    expect(code).toBe(1);
  });

  it("handles non-Error values gracefully", () => {
    const code = handleCliError("string error");
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith("Error: string error");
  });
});
