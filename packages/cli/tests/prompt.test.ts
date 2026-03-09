import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isInteractive } from "../src/prompt";

describe("isInteractive", () => {
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

  it("returns false when --no-interactive flag is set", () => {
    const program = { opts: () => ({ interactive: false }) };
    expect(isInteractive(program)).toBe(false);
  });

  it("returns false when GPC_NO_INTERACTIVE=1", () => {
    process.env["GPC_NO_INTERACTIVE"] = "1";
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    expect(isInteractive()).toBe(false);
  });

  it("returns false when GPC_NO_INTERACTIVE=true", () => {
    process.env["GPC_NO_INTERACTIVE"] = "true";
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    expect(isInteractive()).toBe(false);
  });

  it("returns false when CI=true", () => {
    process.env["CI"] = "true";
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    expect(isInteractive()).toBe(false);
  });

  it("returns false when stdin is not TTY", () => {
    Object.defineProperty(process.stdin, "isTTY", { value: false, writable: true });
    expect(isInteractive()).toBe(false);
  });

  it("returns true when stdin is TTY and no override flags", () => {
    Object.defineProperty(process.stdin, "isTTY", { value: true, writable: true });
    expect(isInteractive()).toBe(true);
  });

  it("respects --no-interactive on root program (with parent chain)", () => {
    const root = { opts: () => ({ interactive: false }), parent: null };
    const child = { opts: () => ({}), parent: root };
    expect(isInteractive(child as any)).toBe(false);
  });
});
