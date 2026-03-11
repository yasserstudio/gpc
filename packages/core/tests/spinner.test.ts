import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSpinner } from "../src/utils/spinner.js";

describe("createSpinner", () => {
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrWriteSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    stderrWriteSpy.mockRestore();
    vi.useRealTimers();
  });

  it("creates a spinner that can start and stop without error", () => {
    const spinner = createSpinner("Loading...");
    // Force TTY for this test
    const origIsTTY = process.stderr.isTTY;
    Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

    spinner.start();
    vi.advanceTimersByTime(200);
    spinner.stop("Done");

    Object.defineProperty(process.stderr, "isTTY", { value: origIsTTY, configurable: true });
    expect(stderrWriteSpy).toHaveBeenCalled();
  });

  it("does not animate in non-TTY mode", () => {
    const origIsTTY = process.stderr.isTTY;
    Object.defineProperty(process.stderr, "isTTY", { value: false, configurable: true });

    const spinner = createSpinner("Processing...");
    spinner.start();
    vi.advanceTimersByTime(500);
    spinner.stop("Done");

    Object.defineProperty(process.stderr, "isTTY", { value: origIsTTY, configurable: true });

    // In non-TTY mode, should write the message once on start, not animate
    const calls = stderrWriteSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((c) => c.includes("Processing..."))).toBe(true);
    // Should not contain spinner frame characters in non-TTY mode
    expect(calls.some((c) => /\r\x1b\[K/.test(c))).toBe(false);
  });

  it("fail() shows error message", () => {
    const origIsTTY = process.stderr.isTTY;
    Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

    const spinner = createSpinner("Uploading...");
    spinner.start();
    spinner.fail("Upload failed");

    Object.defineProperty(process.stderr, "isTTY", { value: origIsTTY, configurable: true });

    const calls = stderrWriteSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((c) => c.includes("\u2718 Upload failed"))).toBe(true);
  });

  it("stop() shows success message with checkmark", () => {
    const origIsTTY = process.stderr.isTTY;
    Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

    const spinner = createSpinner("Working...");
    spinner.start();
    spinner.stop("All done");

    Object.defineProperty(process.stderr, "isTTY", { value: origIsTTY, configurable: true });

    const calls = stderrWriteSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((c) => c.includes("\u2714 All done"))).toBe(true);
  });

  it("update() changes the spinner message", () => {
    const origIsTTY = process.stderr.isTTY;
    Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

    const spinner = createSpinner("Step 1...");
    spinner.start();
    spinner.update("Step 2...");
    vi.advanceTimersByTime(100);
    spinner.stop();

    Object.defineProperty(process.stderr, "isTTY", { value: origIsTTY, configurable: true });

    const calls = stderrWriteSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((c) => c.includes("Step 2..."))).toBe(true);
  });

  it("never writes to stdout", () => {
    const stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const origIsTTY = process.stderr.isTTY;
    Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

    const spinner = createSpinner("Testing...");
    spinner.start();
    vi.advanceTimersByTime(200);
    spinner.stop("Done");

    Object.defineProperty(process.stderr, "isTTY", { value: origIsTTY, configurable: true });

    expect(stdoutWriteSpy).not.toHaveBeenCalled();
    stdoutWriteSpy.mockRestore();
  });
});
