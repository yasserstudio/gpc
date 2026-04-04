const GITHUB_RELEASES_URL = "https://api.github.com/repos/yasserstudio/gpc/releases";

const DOCS_CHANGELOG_URL = "https://yasserstudio.github.io/gpc/reference/changelog";

export interface ChangelogEntry {
  version: string;
  title: string;
  date: string;
  body: string;
  url: string;
}

export interface FetchChangelogOptions {
  limit?: number;
  version?: string;
}

/**
 * Fetch release history from GitHub Releases API.
 * Public endpoint — no auth required (60 req/hour rate limit).
 */
export async function fetchChangelog(options?: FetchChangelogOptions): Promise<ChangelogEntry[]> {
  const limit = options?.limit ?? 5;

  const url = options?.version
    ? `${GITHUB_RELEASES_URL}/tags/${options.version.startsWith("v") ? options.version : `v${options.version}`}`
    : `${GITHUB_RELEASES_URL}?per_page=${Math.min(limit, 100)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "gpc-cli",
      },
      signal: controller.signal,
    });
  } catch {
    throw new Error(`Could not fetch changelog. View online: ${DOCS_CHANGELOG_URL}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 404 && options?.version) {
      throw new Error(`Version ${options.version} not found. Run: gpc changelog --limit 10`);
    }
    throw new Error(`GitHub API returned ${response.status}. View online: ${DOCS_CHANGELOG_URL}`);
  }

  const data = await response.json();
  const releases: Array<{
    tag_name: string;
    name: string;
    published_at: string;
    body: string;
    html_url: string;
  }> = Array.isArray(data) ? data : [data];

  return releases
    .filter((r) => r.tag_name.startsWith("v"))
    .map((r) => ({
      version: r.tag_name,
      title: r.name || r.tag_name,
      date: r.published_at ? r.published_at.split("T")[0]! : "unknown",
      body: r.body || "No release notes.",
      url: r.html_url,
    }));
}

/**
 * Format a changelog entry as readable terminal text.
 * Strips markdown formatting for clean terminal output.
 */
export function formatChangelogEntry(entry: ChangelogEntry): string {
  const lines: string[] = [];
  lines.push(`${entry.version} — ${entry.title}`);
  lines.push(`Released: ${entry.date}`);
  lines.push("");

  // Strip markdown formatting for terminal display
  const body = entry.body
    .replace(/^### /gm, "")
    .replace(/^## /gm, "")
    .replace(/^# /gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

  lines.push(body);
  lines.push("");
  lines.push(`Full notes: ${entry.url}`);

  return lines.join("\n");
}
