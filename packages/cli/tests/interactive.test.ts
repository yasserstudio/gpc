import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requireOption, requireConfirm, skipConfirm, isInteractive } from "../src/prompt";

// Mock readline for promptInput/promptSelect/promptConfirm
vi.mock("node:readline", () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn((msg: string, cb: (answer: string) => void) => cb("")),
    close: vi.fn(),
  }),
}));

describe("requireOption", () => {
  it("returns existing value without prompting", async () => {
    const result = await requireOption(
      "track",
      "beta",
      {
        message: "Track:",
        choices: ["internal", "alpha", "beta"],
      },
      true,
    );
    expect(result).toBe("beta");
  });

  it("prompts when value is missing and interactive", async () => {
    const { createInterface } = await import("node:readline");
    (createInterface as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      question: vi.fn((_msg: string, cb: (answer: string) => void) => cb("2")),
      close: vi.fn(),
    });

    const result = await requireOption(
      "track",
      undefined,
      {
        message: "Track:",
        choices: ["internal", "alpha", "beta"],
      },
      true,
    );
    // promptSelect with "2" selects second choice
    expect(result).toBe("alpha");
  });

  it("prompts for text input when no choices provided", async () => {
    const { createInterface } = await import("node:readline");
    (createInterface as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      question: vi.fn((_msg: string, cb: (answer: string) => void) => cb("my-value")),
      close: vi.fn(),
    });

    const result = await requireOption(
      "text",
      undefined,
      {
        message: "Enter text:",
      },
      true,
    );
    expect(result).toBe("my-value");
  });

  it("uses default value when interactive input is empty", async () => {
    const { createInterface } = await import("node:readline");
    (createInterface as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      question: vi.fn((_msg: string, cb: (answer: string) => void) => cb("")),
      close: vi.fn(),
    });

    const result = await requireOption(
      "currency",
      undefined,
      {
        message: "Currency:",
        default: "USD",
      },
      true,
    );
    expect(result).toBe("USD");
  });

  it("exits with code 2 when non-interactive and missing", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    await expect(
      requireOption(
        "track",
        undefined,
        {
          message: "Track:",
          choices: ["internal", "alpha", "beta"],
        },
        false,
      ),
    ).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("--track"));

    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});

describe("skipConfirm", () => {
  it("returns false with no program", () => {
    expect(skipConfirm()).toBe(false);
  });

  it("returns true when --yes is set", () => {
    const program = { opts: () => ({ yes: true }) };
    expect(skipConfirm(program)).toBe(true);
  });

  it("returns false when --yes is not set", () => {
    const program = { opts: () => ({}) };
    expect(skipConfirm(program)).toBe(false);
  });

  it("follows parent chain to root program", () => {
    const root = { opts: () => ({ yes: true }), parent: null };
    const child = { opts: () => ({}), parent: root };
    expect(skipConfirm(child as any)).toBe(true);
  });
});

describe("requireConfirm", () => {
  const originalEnv = { ...process.env };
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env["GPC_NO_INTERACTIVE"];
    delete process.env["CI"];
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdin, "isTTY", { value: originalIsTTY, writable: true });
  });

  it("skips prompt when --yes is set", async () => {
    const program = { opts: () => ({ yes: true }) };
    // Should not throw or prompt
    await requireConfirm("Delete everything?", program);
  });

  it("skips prompt in non-interactive mode", async () => {
    process.env["CI"] = "true";
    const program = { opts: () => ({}) };
    await requireConfirm("Delete everything?", program);
  });

  it("exits with 0 when user denies confirmation", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    const program = { opts: () => ({ interactive: true }) };

    const { createInterface } = await import("node:readline");
    (createInterface as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      question: vi.fn((_msg: string, cb: (answer: string) => void) => cb("n")),
      close: vi.fn(),
    });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(requireConfirm("Delete?", program)).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logSpy).toHaveBeenCalledWith("Aborted.");

    exitSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("proceeds when user confirms", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    const program = { opts: () => ({ interactive: true }) };

    const { createInterface } = await import("node:readline");
    (createInterface as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      question: vi.fn((_msg: string, cb: (answer: string) => void) => cb("y")),
      close: vi.fn(),
    });

    await requireConfirm("Delete?", program);
    // No error means it proceeded
  });
});
