import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import {
  generateChangelog,
  parseCommit,
  parseRemoteUrl,
  defaultGitRunner,
  renderMarkdown,
  RENDERERS,
  type GitRunner,
  type RawCommit,
} from "../src/index.js";

const execFile = promisify(execFileCb);

function makeRaw(overrides: Partial<RawCommit> & { sha: string; subject: string }): RawCommit {
  return {
    body: "",
    files: [],
    additions: 0,
    deletions: 0,
    authorDate: new Date("2026-04-15T12:00:00Z").toISOString(),
    ...overrides,
  };
}

function makeRunner(overrides: Partial<GitRunner> = {}): GitRunner {
  return {
    log: async () => [],
    describeLatestTag: async () => "v0.0.1",
    verifyRef: async () => true,
    remoteUrl: async () => null,
    ...overrides,
  };
}

describe("parseCommit", () => {
  it("parses single conventional commit and drops scope", () => {
    const raw = makeRaw({ sha: "abc1234", subject: "feat(cli): add dynamic completion" });
    const parsed = parseCommit(raw);
    expect(parsed.type).toBe("feat");
    expect(parsed.scope).toBe("cli");
    expect(parsed.subject).toBe("add dynamic completion");
  });

  it("preserves trailing PR ref", () => {
    const raw = makeRaw({ sha: "abc", subject: "fix: rate limiter accuracy (#142)" });
    const parsed = parseCommit(raw);
    expect(parsed.prRef).toBe("#142");
    expect(parsed.subject).toBe("rate limiter accuracy (#142)");
    expect(parsed.type).toBe("fix");
  });

  it("treats `!` after type as breaking", () => {
    const raw = makeRaw({ sha: "abc", subject: "feat(api)!: drop deprecated endpoints" });
    const parsed = parseCommit(raw);
    expect(parsed.type).toBe("breaking");
  });

  it("flags revert commits", () => {
    const raw = makeRaw({ sha: "abc", subject: 'Revert "feat: add experimental flag"' });
    const parsed = parseCommit(raw);
    expect(parsed.isRevert).toBe(true);
    expect(parsed.type).toBe("feat");
  });

  it("flags fixup commits", () => {
    const raw = makeRaw({ sha: "abc", subject: "fix typo in README" });
    const parsed = parseCommit(raw);
    expect(parsed.isFixup).toBe(true);
  });

  it("canonicalizes verb form", () => {
    const raw = makeRaw({ sha: "abc", subject: "Added support for X" });
    const parsed = parseCommit(raw);
    expect(parsed.subject).toBe("add support for X");
  });

  it("falls back to type=other for unknown prefix", () => {
    const raw = makeRaw({ sha: "abc", subject: "wip experimental thing" });
    const parsed = parseCommit(raw);
    expect(parsed.type).toBe("other");
  });
});

describe("parseRemoteUrl", () => {
  it("parses HTTPS remote", () => {
    expect(parseRemoteUrl("https://github.com/yasserstudio/gpc.git")).toBe("yasserstudio/gpc");
    expect(parseRemoteUrl("https://github.com/yasserstudio/gpc")).toBe("yasserstudio/gpc");
  });

  it("parses SSH remote", () => {
    expect(parseRemoteUrl("git@github.com:yasserstudio/gpc.git")).toBe("yasserstudio/gpc");
  });

  it("returns null for unrecognized remote or null input", () => {
    expect(parseRemoteUrl("https://gitlab.com/foo/bar")).toBeNull();
    expect(parseRemoteUrl(null)).toBeNull();
  });
});

describe("generateChangelog", () => {
  it("groups commits by type in canonical section order", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({ sha: "1", subject: "fix: a bug", files: ["packages/core/x.ts"], additions: 5 }),
        makeRaw({
          sha: "2",
          subject: "feat: new thing",
          files: ["packages/cli/y.ts"],
          additions: 50,
        }),
        makeRaw({ sha: "3", subject: "docs: update guide", files: ["docs/a.md"], additions: 5 }),
        makeRaw({
          sha: "4",
          subject: "perf: faster",
          files: ["packages/core/z.ts"],
          additions: 10,
        }),
      ],
    });
    const g = await generateChangelog({}, runner);
    const md = renderMarkdown(g);
    const featIdx = md.indexOf("- feat:");
    const fixIdx = md.indexOf("- fix:");
    const perfIdx = md.indexOf("- perf:");
    const docsIdx = md.indexOf("- docs:");
    expect(featIdx).toBeGreaterThan(-1);
    expect(featIdx).toBeLessThan(fixIdx);
    expect(fixIdx).toBeLessThan(perfIdx);
    expect(perfIdx).toBeLessThan(docsIdx);
  });

  it("filters out chore/refactor/test/build/style from output", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({ sha: "1", subject: "chore: bump deps", files: ["package.json"] }),
        makeRaw({ sha: "2", subject: "test: add coverage", files: ["x.test.ts"] }),
        makeRaw({ sha: "3", subject: "feat: real feature", files: ["src/x.ts"], additions: 10 }),
      ],
    });
    const g = await generateChangelog({}, runner);
    expect(g.grouped["feat"]?.length).toBe(1);
    expect(g.grouped["chore"]).toBeUndefined();
    expect(g.grouped["test"]).toBeUndefined();
  });

  it("drops revert pairs entirely", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({ sha: "1", subject: "feat: add experimental flag", files: ["src/x.ts"] }),
        makeRaw({ sha: "2", subject: 'Revert "feat: add experimental flag"', files: ["src/x.ts"] }),
        makeRaw({ sha: "3", subject: "fix: real fix", files: ["src/y.ts"], additions: 1 }),
      ],
    });
    const g = await generateChangelog({}, runner);
    expect(g.grouped["feat"]).toBeUndefined();
    expect(g.grouped["fix"]?.length).toBe(1);
  });

  it("drops fixup commits from output", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({ sha: "1", subject: "feat: real thing", files: ["src/x.ts"], additions: 10 }),
        makeRaw({ sha: "2", subject: "fix typo", files: ["src/x.ts"] }),
        makeRaw({ sha: "3", subject: "wip address review", files: ["src/x.ts"] }),
      ],
    });
    const g = await generateChangelog({}, runner);
    const featCommits = g.grouped["feat"] ?? [];
    expect(featCommits.length).toBe(1);
  });

  it("clusters two commits sharing a file path", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({
          sha: "1",
          subject: "feat: alpha",
          files: ["packages/cli/src/commands/completion.ts"],
          additions: 30,
        }),
        makeRaw({
          sha: "2",
          subject: "fix: beta",
          files: ["packages/cli/src/commands/completion.ts"],
          additions: 5,
        }),
      ],
    });
    const g = await generateChangelog({}, runner);
    expect(g.clusters.length).toBe(1);
    expect(g.clusters[0]?.commits.length).toBe(2);
  });

  it("clusters two commits via Jaccard keyword overlap when files differ", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({
          sha: "1",
          subject: "feat: shell completion walker",
          files: ["a.ts"],
          additions: 10,
        }),
        makeRaw({
          sha: "2",
          subject: "fix: shell completion walker bug",
          files: ["b.ts"],
          additions: 3,
        }),
      ],
    });
    const g = await generateChangelog({}, runner);
    expect(g.clusters.length).toBe(1);
  });

  it("scores headlines by weight desc with feat-over-fix tie-break", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({ sha: "1", subject: "fix: small thing", files: ["x.ts"], additions: 100 }),
        makeRaw({ sha: "2", subject: "feat: same weight", files: ["y.ts"], additions: 100 }),
      ],
    });
    const g = await generateChangelog({}, runner);
    expect(g.headlineCandidates[0]?.primaryType).toBe("feat");
  });

  it("emits scope-leak warning once", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({ sha: "1", subject: "feat(cli): something", files: ["x.ts"], additions: 10 }),
      ],
    });
    const g = await generateChangelog({}, runner);
    expect(g.warnings.some((w) => w.startsWith("scope:"))).toBe(true);
  });

  it("emits jargon warning for banned word", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({
          sha: "1",
          subject: "feat: cached homedir at module level",
          files: ["x.ts"],
          additions: 10,
        }),
      ],
    });
    const g = await generateChangelog({}, runner);
    expect(g.warnings.some((w) => w.startsWith("jargon:"))).toBe(true);
  });

  it("returns empty render when no commits", async () => {
    const runner = makeRunner({ log: async () => [] });
    const g = await generateChangelog({}, runner);
    expect(g.commits.length).toBe(0);
    expect(renderMarkdown(g)).toContain("_No notable changes._");
  });

  it("throws CHANGELOG_NO_TAG when no tags and no --from", async () => {
    const runner = makeRunner({ describeLatestTag: async () => null });
    await expect(generateChangelog({}, runner)).rejects.toMatchObject({
      code: "CHANGELOG_NO_TAG",
    });
  });

  it("throws CHANGELOG_BAD_REF when --from is invalid", async () => {
    const runner = makeRunner({ verifyRef: async (ref) => ref !== "bogus" });
    await expect(generateChangelog({ from: "bogus" }, runner)).rejects.toMatchObject({
      code: "CHANGELOG_BAD_REF",
    });
  });

  it("throws CHANGELOG_BAD_REF when --to is invalid", async () => {
    const runner = makeRunner({ verifyRef: async (ref) => ref !== "bogus" });
    await expect(generateChangelog({ to: "bogus" }, runner)).rejects.toMatchObject({
      code: "CHANGELOG_BAD_REF",
    });
  });

  it("opts.repo override bypasses git remote detection", async () => {
    let remoteCalled = false;
    const runner = makeRunner({
      remoteUrl: async () => {
        remoteCalled = true;
        return "git@github.com:should-not-be-used/x.git";
      },
      log: async () => [makeRaw({ sha: "1", subject: "feat: x", files: ["a.ts"], additions: 1 })],
    });
    const g = await generateChangelog({ repo: "manual/override" }, runner);
    expect(g.repo).toBe("manual/override");
    expect(remoteCalled).toBe(false);
  });

  it("release type round-trips through SECTION_ORDER between ci and other", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({ sha: "1", subject: "feat: a feature", files: ["a.ts"], additions: 5 }),
        makeRaw({
          sha: "2",
          subject: "release: v0.9.61 — Smarter Changelog Generation",
          files: ["CHANGELOG.md"],
          additions: 50,
        }),
        makeRaw({ sha: "3", subject: "ci: bump action", files: [".github/x.yml"], additions: 1 }),
      ],
    });
    const g = await generateChangelog({}, runner);
    expect(g.grouped["release"]?.length).toBe(1);
    expect(g.grouped["release"]?.[0]?.subject).toContain("Smarter Changelog Generation");
    const md = renderMarkdown(g);
    const ciIdx = md.indexOf("- ci:");
    const releaseIdx = md.indexOf("- release:");
    expect(ciIdx).toBeLessThan(releaseIdx);
  });

  it("strips newlines from commit subjects in markdown output", async () => {
    const runner = makeRunner({
      log: async () => [
        makeRaw({ sha: "1", subject: "feat: line one\nline two\n## fake header", files: ["a.ts"] }),
      ],
    });
    const g = await generateChangelog({}, runner);
    const md = renderMarkdown(g);
    expect(md).not.toContain("\n## fake header");
    expect(md).toContain("line one line two");
  });

  it("renders Full Changelog link when repo is parsed", async () => {
    const runner = makeRunner({
      remoteUrl: async () => "git@github.com:yasserstudio/gpc.git",
      log: async () => [makeRaw({ sha: "1", subject: "feat: x", files: ["a.ts"], additions: 1 })],
    });
    const g = await generateChangelog({ to: "v0.9.61" }, runner);
    const md = renderMarkdown(g);
    expect(md).toContain("https://github.com/yasserstudio/gpc/compare/v0.0.1...v0.9.61");
  });

  it("RENDERERS.json produces valid JSON", async () => {
    const runner = makeRunner({
      log: async () => [makeRaw({ sha: "1", subject: "feat: x", files: ["a.ts"], additions: 1 })],
    });
    const g = await generateChangelog({}, runner);
    const out = RENDERERS.json(g);
    expect(() => JSON.parse(out)).not.toThrow();
  });
});

describe("generateChangelog (integration with real git)", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "gpc-changelog-"));
    await execFile("git", ["init", "--initial-branch=main"], { cwd: dir });
    await execFile("git", ["config", "user.email", "test@example.com"], { cwd: dir });
    await execFile("git", ["config", "user.name", "Test"], { cwd: dir });
    await execFile("git", ["config", "commit.gpgsign", "false"], { cwd: dir });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function commit(file: string, content: string, message: string) {
    const fp = join(dir, file);
    await mkdir(join(dir, file, ".."), { recursive: true });
    await writeFile(fp, content);
    await execFile("git", ["add", file], { cwd: dir });
    await execFile("git", ["commit", "-m", message], { cwd: dir });
  }

  it("walks a real temp repo end-to-end", async () => {
    await commit("src/a.ts", "// initial", "feat: initial scaffold");
    await execFile("git", ["tag", "v0.0.1"], { cwd: dir });
    await commit("src/a.ts", "// added\n", "feat: add second feature");
    await commit("src/b.ts", "// new\n", "fix: something broken");

    const g = await generateChangelog({ from: "v0.0.1", to: "HEAD", cwd: dir }, defaultGitRunner);
    expect(g.rawCommitCount).toBe(2);
    expect(g.grouped["feat"]?.length).toBe(1);
    expect(g.grouped["fix"]?.length).toBe(1);
    expect(g.repo).toBeNull();

    const md = renderMarkdown(g);
    expect(md).toContain("- feat:");
    expect(md).toContain("- fix:");
  });
});
