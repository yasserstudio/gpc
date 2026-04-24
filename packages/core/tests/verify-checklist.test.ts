import { describe, it, expect } from "vitest";
import { buildChecklist, renderChecklistMarkdown } from "../src/index.js";

describe("buildChecklist", () => {
  it("marks account as done when authenticated", () => {
    const result = buildChecklist({ authenticated: true, accountEmail: "test@example.com" });
    const account = result.items.find((i) => i.id === "account-active");
    expect(account?.status).toBe("done");
    expect(account?.detail).toContain("test@example.com");
  });

  it("marks account as action-needed when not authenticated", () => {
    const result = buildChecklist({ authenticated: false });
    const account = result.items.find((i) => i.id === "account-active");
    expect(account?.status).toBe("action-needed");
  });

  it("marks manual steps as cannot-detect by default", () => {
    const result = buildChecklist({ authenticated: true });
    const identity = result.items.find((i) => i.id === "identity-verified");
    expect(identity?.status).toBe("cannot-detect");
    expect(identity?.actionUrl).toBeDefined();
  });

  it("resolves manual steps from interactive answers", () => {
    const result = buildChecklist({
      authenticated: true,
      interactiveAnswers: { "identity-verified": true, "auto-registration-reviewed": false },
    });
    const identity = result.items.find((i) => i.id === "identity-verified");
    expect(identity?.status).toBe("done");
    const autoReg = result.items.find((i) => i.id === "auto-registration-reviewed");
    expect(autoReg?.status).toBe("action-needed");
  });

  it("includes app-accessible when provided", () => {
    const result = buildChecklist({ authenticated: true, appAccessible: true });
    const app = result.items.find((i) => i.id === "app-accessible");
    expect(app?.status).toBe("done");
  });

  it("marks bundle-uploaded as done when count > 0", () => {
    const result = buildChecklist({ authenticated: true, bundleCount: 5 });
    const bundle = result.items.find((i) => i.id === "bundle-uploaded");
    expect(bundle?.status).toBe("done");
    expect(bundle?.detail).toContain("5 bundles");
  });

  it("marks bundle-uploaded as action-needed when count is 0", () => {
    const result = buildChecklist({ authenticated: true, bundleCount: 0 });
    const bundle = result.items.find((i) => i.id === "bundle-uploaded");
    expect(bundle?.status).toBe("action-needed");
  });

  it("marks play-app-signing as done when has generated APKs", () => {
    const result = buildChecklist({ authenticated: true, hasGeneratedApks: true });
    const signing = result.items.find((i) => i.id === "play-app-signing");
    expect(signing?.status).toBe("done");
  });

  it("marks play-app-signing as action-needed when no generated APKs", () => {
    const result = buildChecklist({ authenticated: true, hasGeneratedApks: false });
    const signing = result.items.find((i) => i.id === "play-app-signing");
    expect(signing?.status).toBe("action-needed");
  });

  it("computes completed count correctly", () => {
    const result = buildChecklist({
      authenticated: true,
      appAccessible: true,
      bundleCount: 3,
      hasGeneratedApks: true,
      interactiveAnswers: { "identity-verified": true },
    });
    expect(result.completed).toBe(5);
    expect(result.total).toBe(7);
  });

  it("uses singular for 1 bundle", () => {
    const result = buildChecklist({ authenticated: true, bundleCount: 1 });
    const bundle = result.items.find((i) => i.id === "bundle-uploaded");
    expect(bundle?.detail).toBe("1 bundle on file");
  });

  it("marks app-accessible as action-needed when false", () => {
    const result = buildChecklist({ authenticated: true, appAccessible: false });
    const app = result.items.find((i) => i.id === "app-accessible");
    expect(app?.status).toBe("action-needed");
    expect(app?.detail).toContain("Could not access");
  });

  it("resolves additional-keys manual step from interactive answers", () => {
    const result = buildChecklist({
      authenticated: true,
      interactiveAnswers: { "additional-keys": true },
    });
    const keys = result.items.find((i) => i.id === "additional-keys");
    expect(keys?.status).toBe("done");
  });

  it("marks additional-keys as action-needed when answered no", () => {
    const result = buildChecklist({
      authenticated: true,
      interactiveAnswers: { "additional-keys": false },
    });
    const keys = result.items.find((i) => i.id === "additional-keys");
    expect(keys?.status).toBe("action-needed");
    expect(keys?.actionUrl).toBeDefined();
  });

  it("omits app/bundle/signing items when not provided", () => {
    const result = buildChecklist({ authenticated: true });
    expect(result.items.find((i) => i.id === "app-accessible")).toBeUndefined();
    expect(result.items.find((i) => i.id === "bundle-uploaded")).toBeUndefined();
    expect(result.items.find((i) => i.id === "play-app-signing")).toBeUndefined();
    expect(result.total).toBe(4);
  });
});

describe("renderChecklistMarkdown", () => {
  it("renders a markdown checklist", () => {
    const result = buildChecklist({
      authenticated: true,
      appAccessible: true,
      bundleCount: 2,
      hasGeneratedApks: true,
    });
    const md = renderChecklistMarkdown(result, "sa@project.iam.gserviceaccount.com");
    expect(md).toContain("# Developer Verification Checklist");
    expect(md).toContain("sa@project.iam.gserviceaccount.com");
    expect(md).toContain("- [x] Play Console account active");
    expect(md).toContain("- [ ] Identity verification complete");
    expect(md).toContain("- [x] App accessible via API");
    expect(md).toContain("- [x] At least one bundle uploaded");
    expect(md).toContain("- [x] Play App Signing enrolled");
  });

  it("includes action URLs for incomplete items", () => {
    const result = buildChecklist({ authenticated: false });
    const md = renderChecklistMarkdown(result, "unknown");
    expect(md).toContain("https://play.google.com/console");
  });

  it("omits action URLs for done items", () => {
    const result = buildChecklist({
      authenticated: true,
      interactiveAnswers: { "identity-verified": true },
    });
    const md = renderChecklistMarkdown(result, "test@example.com");
    const identityLine = md.split("\n").find((l) => l.includes("Identity verification complete"));
    expect(identityLine).toContain("[x]");
    const identityIndex = md.split("\n").indexOf(identityLine!);
    const nextLines = md
      .split("\n")
      .slice(identityIndex + 1, identityIndex + 3)
      .join("\n");
    expect(nextLines).not.toContain("play.google.com/console/developers/settings");
  });

  it("includes progress count", () => {
    const result = buildChecklist({ authenticated: true, bundleCount: 0 });
    const md = renderChecklistMarkdown(result, "test@example.com");
    expect(md).toMatch(/Progress: \d+\/\d+/);
  });
});
