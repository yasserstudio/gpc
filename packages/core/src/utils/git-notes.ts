import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { GpcError } from "../errors.js";

const execFile = promisify(execFileCb);

export interface GitNotesOptions {
  since?: string;
  language?: string;
  maxLength?: number;
}

export interface GitReleaseNotes {
  language: string;
  text: string;
  commitCount: number;
  since: string;
  truncated: boolean;
}

interface ParsedCommit {
  type: string;
  message: string;
}

const COMMIT_TYPE_HEADERS: Record<string, string> = {
  feat: "New",
  fix: "Fixed",
  perf: "Improved",
};

const DEFAULT_MAX_LENGTH = 500;

function parseConventionalCommit(subject: string): ParsedCommit {
  const match = subject.match(/^(\w+)(?:\([^)]*\))?:\s*(.+)$/);
  if (match) {
    return { type: match[1]!, message: match[2]!.trim() };
  }
  return { type: "other", message: subject.trim() };
}

function formatNotes(commits: ParsedCommit[], maxLength: number): { text: string; truncated: boolean } {
  const groups = new Map<string, string[]>();

  for (const commit of commits) {
    const header = COMMIT_TYPE_HEADERS[commit.type] || "Changes";
    if (!groups.has(header)) {
      groups.set(header, []);
    }
    groups.get(header)!.push(commit.message);
  }

  // Order: New, Fixed, Improved, then Changes
  const order = ["New", "Fixed", "Improved", "Changes"];
  const sections: string[] = [];

  for (const header of order) {
    const items = groups.get(header);
    if (!items || items.length === 0) continue;
    const bullets = items.map((m) => `\u2022 ${m}`).join("\n");
    sections.push(`${header}:\n${bullets}`);
  }

  let text = sections.join("\n\n");
  let truncated = false;

  if (text.length > maxLength) {
    text = text.slice(0, maxLength - 3) + "...";
    truncated = true;
  }

  return { text, truncated };
}

async function gitExec(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFile("git", args);
    return stdout.trim();
  } catch (error: unknown) {
    const err = error as { code?: string; stderr?: string; message?: string };
    if (err.code === "ENOENT") {
      throw new GpcError(
        "git is not available on this system",
        "GIT_NOT_FOUND",
        1,
        "Install git and ensure it is in your PATH.",
      );
    }
    throw error;
  }
}

export async function generateNotesFromGit(
  options?: GitNotesOptions,
): Promise<GitReleaseNotes> {
  const language = options?.language || "en-US";
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  let since = options?.since;

  if (!since) {
    try {
      since = await gitExec(["describe", "--tags", "--abbrev=0"]);
    } catch (e) {
      if (e instanceof GpcError && e.code === "GIT_NOT_FOUND") throw e;
      throw new GpcError(
        "No git tags found. Cannot determine commit range for release notes.",
        "GIT_NO_TAGS",
        1,
        "Create a tag first (e.g., git tag v1.0.0) or use --since <ref> to specify a starting point.",
      );
    }
  }

  let logOutput: string;
  try {
    logOutput = await gitExec(["log", `${since}..HEAD`, "--format=%s"]);
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    const msg = err.stderr || err.message || String(error);
    throw new GpcError(
      `Failed to read git log from "${since}": ${msg}`,
      "GIT_LOG_FAILED",
      1,
      `Verify that "${since}" is a valid git ref (tag, branch, or SHA).`,
    );
  }

  if (!logOutput) {
    return {
      language,
      text: "No changes since last release.",
      commitCount: 0,
      since,
      truncated: false,
    };
  }

  const subjects = logOutput.split("\n").filter((line) => line.length > 0);
  const commits = subjects.map(parseConventionalCommit);
  const { text, truncated } = formatNotes(commits, maxLength);

  return {
    language,
    text,
    commitCount: subjects.length,
    since,
    truncated,
  };
}
