import { describe, it, expect, vi, afterEach } from "vitest";

// Bug N regression: sendNotification must use execFile (array args, no shell)
// not execSync (shell string interpolation).

const { execFileMock } = vi.hoisted(() => ({ execFileMock: vi.fn() }));

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

import { sendNotification } from "../src/commands/status.js";

afterEach(() => {
  execFileMock.mockReset();
  delete process.env["CI"];
});

describe("sendNotification (Bug N regression — execFile, not execSync)", () => {
  it("does nothing when CI=1", () => {
    process.env["CI"] = "1";
    sendNotification("Title", "Body");
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("calls execFile with osascript on darwin", () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin", configurable: true });

    sendNotification("GPC Alert", "Crash rate exceeded 2%");

    Object.defineProperty(process, "platform", { value: origPlatform, configurable: true });

    expect(execFileMock).toHaveBeenCalledWith("osascript", expect.arrayContaining(["-e"]));
  });

  it("passes title and body as separate argv elements on linux — no shell quoting needed", () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });

    sendNotification("GPC Alert", "Body with spaces");

    Object.defineProperty(process, "platform", { value: origPlatform, configurable: true });

    expect(execFileMock).toHaveBeenCalledWith("notify-send", ["GPC Alert", "Body with spaces"]);
  });

  it("calls powershell execFile on win32", () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });

    sendNotification("GPC Alert", "Body text");

    Object.defineProperty(process, "platform", { value: origPlatform, configurable: true });

    expect(execFileMock).toHaveBeenCalledWith("powershell", expect.any(Array));
  });

  it("escapes single quotes in title and body on win32", () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });

    sendNotification("GPC's Alert", "Body with 'quotes'");

    Object.defineProperty(process, "platform", { value: origPlatform, configurable: true });

    const args = execFileMock.mock.calls[0]?.[1] as string[];
    const cmd = args.join(" ");
    expect(cmd).toContain("GPC''s Alert");
    expect(cmd).toContain("Body with ''quotes''");
  });

  it("strips newlines from title and body on win32", () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });

    sendNotification("Title\nWith\rNewlines", "Body\ntext");

    Object.defineProperty(process, "platform", { value: origPlatform, configurable: true });

    const args = execFileMock.mock.calls[0]?.[1] as string[];
    const cmd = args.join(" ");
    expect(cmd).not.toMatch(/[\r\n]/);
  });
});
