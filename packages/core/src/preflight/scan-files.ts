// Named exports only. No default export.

import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const DEFAULT_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "build",
  "dist",
  ".gradle",
  "__pycache__",
  ".idea",
  ".vscode",
  "vendor",
]);

/**
 * Recursively collect files matching the given extensions.
 * Skips common non-source directories (node_modules, build, .git, etc.).
 */
export async function collectSourceFiles(
  dir: string,
  extensions: Set<string>,
  skipDirs: Set<string> = DEFAULT_SKIP_DIRS,
  maxDepth: number = 10,
): Promise<string[]> {
  if (maxDepth <= 0) return [];
  const files: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (skipDirs.has(entry)) continue;

    const fullPath = join(dir, entry);
    const s = await stat(fullPath).catch(() => null);
    if (!s) continue;

    if (s.isDirectory()) {
      const sub = await collectSourceFiles(fullPath, extensions, skipDirs, maxDepth - 1);
      files.push(...sub);
    } else if (s.isFile()) {
      const ext = extname(entry).toLowerCase();
      // Also match compound extensions like .gradle.kts
      if (extensions.has(ext) || entry.endsWith(".gradle.kts")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}
