import { resolve, normalize } from "node:path";

/**
 * Normalize and resolve a user-supplied path.
 * Prevents path traversal by normalizing `.` and `..` components.
 */
export function safePath(userPath: string): string {
  return resolve(normalize(userPath));
}

/**
 * Validate that a resolved path is within an expected base directory.
 * Returns the resolved path or throws if it escapes the base.
 */
export function safePathWithin(userPath: string, baseDir: string): string {
  const resolved = safePath(userPath);
  const base = safePath(baseDir);

  if (!resolved.startsWith(base + "/") && resolved !== base) {
    throw new Error(`Path "${userPath}" resolves outside the expected directory "${baseDir}"`);
  }

  return resolved;
}
