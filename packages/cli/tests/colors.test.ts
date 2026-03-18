import { describe, it, expect, beforeEach, afterEach } from "vitest";

// We import after env manipulation via dynamic import to ensure module re-evaluation
// isn't needed — the functions read env vars at call time.
import { green, red, yellow, dim, gray, bold } from "../src/colors.js";

describe("colors", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env vars before each test
    delete process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
  });

  afterEach(() => {
    // Restore
    for (const key of ["NO_COLOR", "FORCE_COLOR"]) {
      if (key in originalEnv) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  describe("NO_COLOR=1 — all functions return plain strings", () => {
    beforeEach(() => {
      process.env["NO_COLOR"] = "1";
    });

    it("green() returns plain string", () => {
      expect(green("hello")).toBe("hello");
    });

    it("red() returns plain string", () => {
      expect(red("error")).toBe("error");
    });

    it("yellow() returns plain string", () => {
      expect(yellow("warn")).toBe("warn");
    });

    it("dim() returns plain string", () => {
      expect(dim("muted")).toBe("muted");
    });

    it("gray() returns plain string", () => {
      expect(gray("info")).toBe("info");
    });

    it("bold() returns plain string", () => {
      expect(bold("strong")).toBe("strong");
    });
  });

  describe("FORCE_COLOR=1 — functions wrap with ANSI codes", () => {
    beforeEach(() => {
      process.env["FORCE_COLOR"] = "1";
    });

    it("green() wraps with ANSI green code", () => {
      expect(green("hello")).toBe("\x1b[32mhello\x1b[0m");
    });

    it("red() wraps with ANSI red code", () => {
      expect(red("error")).toBe("\x1b[31merror\x1b[0m");
    });

    it("yellow() wraps with ANSI yellow code", () => {
      expect(yellow("warn")).toBe("\x1b[33mwarn\x1b[0m");
    });

    it("dim() wraps with ANSI dim code", () => {
      expect(dim("muted")).toBe("\x1b[2mmuted\x1b[0m");
    });

    it("gray() wraps with ANSI gray code", () => {
      expect(gray("info")).toBe("\x1b[90minfo\x1b[0m");
    });

    it("bold() wraps with ANSI bold code", () => {
      expect(bold("strong")).toBe("\x1b[1mstrong\x1b[0m");
    });
  });

  describe("NO_COLOR overrides FORCE_COLOR (per no-color.org spec)", () => {
    it("NO_COLOR wins over FORCE_COLOR=1", () => {
      process.env["NO_COLOR"] = "1";
      process.env["FORCE_COLOR"] = "1";
      expect(green("hello")).toBe("hello");
      expect(red("error")).toBe("error");
    });
  });
});
