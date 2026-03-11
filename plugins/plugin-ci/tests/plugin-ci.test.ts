import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PLUGIN_CI_VERSION, detectCIEnvironment, ciPlugin } from "../src/index";

describe("plugin-ci", () => {
  it("exports PLUGIN_CI_VERSION", () => {
    expect(PLUGIN_CI_VERSION).toBe("0.9.4");
  });

  describe("detectCIEnvironment", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      // Clear all CI-related env vars so each test controls its own environment
      delete process.env["CI"];
      delete process.env["GITHUB_ACTIONS"];
      delete process.env["GITHUB_RUN_ID"];
      delete process.env["GITHUB_REF_NAME"];
      delete process.env["GITHUB_SHA"];
      delete process.env["GITHUB_STEP_SUMMARY"];
      delete process.env["GITLAB_CI"];
      delete process.env["CI_JOB_ID"];
      delete process.env["CI_COMMIT_BRANCH"];
      delete process.env["CI_COMMIT_SHA"];
      delete process.env["JENKINS_URL"];
      delete process.env["BUILD_NUMBER"];
      delete process.env["CIRCLECI"];
      delete process.env["CIRCLE_BUILD_NUM"];
      delete process.env["BITRISE_IO"];
      delete process.env["BITRISE_BUILD_NUMBER"];
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("detects GitHub Actions", () => {
      process.env["GITHUB_ACTIONS"] = "true";
      process.env["GITHUB_RUN_ID"] = "12345";
      process.env["GITHUB_REF_NAME"] = "main";
      process.env["GITHUB_SHA"] = "abc123";
      process.env["GITHUB_STEP_SUMMARY"] = "/tmp/summary.md";

      const ci = detectCIEnvironment();
      expect(ci.isCI).toBe(true);
      expect(ci.provider).toBe("github-actions");
      expect(ci.buildId).toBe("12345");
      expect(ci.branch).toBe("main");
      expect(ci.commitSha).toBe("abc123");
      expect(ci.hasStepSummary).toBe(true);
    });

    it("detects GitLab CI", () => {
      process.env["GITLAB_CI"] = "true";
      process.env["CI_JOB_ID"] = "999";
      process.env["CI_COMMIT_BRANCH"] = "develop";
      process.env["CI_COMMIT_SHA"] = "def456";

      const ci = detectCIEnvironment();
      expect(ci.isCI).toBe(true);
      expect(ci.provider).toBe("gitlab-ci");
      expect(ci.buildId).toBe("999");
      expect(ci.branch).toBe("develop");
    });

    it("detects Jenkins", () => {
      process.env["JENKINS_URL"] = "http://jenkins.local";
      process.env["BUILD_NUMBER"] = "42";

      const ci = detectCIEnvironment();
      expect(ci.isCI).toBe(true);
      expect(ci.provider).toBe("jenkins");
      expect(ci.buildId).toBe("42");
    });

    it("detects CircleCI", () => {
      process.env["CIRCLECI"] = "true";
      process.env["CIRCLE_BUILD_NUM"] = "100";

      const ci = detectCIEnvironment();
      expect(ci.isCI).toBe(true);
      expect(ci.provider).toBe("circleci");
    });

    it("detects Bitrise", () => {
      process.env["BITRISE_IO"] = "true";
      process.env["BITRISE_BUILD_NUMBER"] = "77";

      const ci = detectCIEnvironment();
      expect(ci.isCI).toBe(true);
      expect(ci.provider).toBe("bitrise");
    });

    it("detects generic CI=true", () => {
      process.env["CI"] = "true";

      const ci = detectCIEnvironment();
      expect(ci.isCI).toBe(true);
      expect(ci.provider).toBe("unknown");
    });

    it("returns isCI false when not in CI", () => {
      delete process.env["CI"];
      delete process.env["GITHUB_ACTIONS"];
      delete process.env["GITLAB_CI"];
      delete process.env["JENKINS_URL"];
      delete process.env["CIRCLECI"];
      delete process.env["BITRISE_IO"];

      const ci = detectCIEnvironment();
      expect(ci.isCI).toBe(false);
      expect(ci.hasStepSummary).toBe(false);
    });
  });

  describe("ciPlugin", () => {
    it("has correct name and version", () => {
      expect(ciPlugin.name).toBe("@gpc-cli/plugin-ci");
      expect(ciPlugin.version).toBe(PLUGIN_CI_VERSION);
    });

    it("register does not throw when not in CI", () => {
      const originalEnv = { ...process.env };
      delete process.env["CI"];
      delete process.env["GITHUB_ACTIONS"];

      const hooks = {
        beforeCommand: vi.fn(),
        afterCommand: vi.fn(),
        onError: vi.fn(),
        registerCommands: vi.fn(),
      };

      ciPlugin.register(hooks);

      // No hooks should be registered when not in CI
      expect(hooks.afterCommand).not.toHaveBeenCalled();
      expect(hooks.onError).not.toHaveBeenCalled();

      process.env = { ...originalEnv };
    });

    it("register adds hooks when in GitHub Actions", () => {
      const originalEnv = { ...process.env };
      process.env["GITHUB_ACTIONS"] = "true";
      process.env["GITHUB_STEP_SUMMARY"] = "/tmp/summary.md";

      const hooks = {
        beforeCommand: vi.fn(),
        afterCommand: vi.fn(),
        onError: vi.fn(),
        registerCommands: vi.fn(),
      };

      ciPlugin.register(hooks);

      expect(hooks.afterCommand).toHaveBeenCalledOnce();
      expect(hooks.onError).toHaveBeenCalledOnce();

      process.env = { ...originalEnv };
    });
  });
});
