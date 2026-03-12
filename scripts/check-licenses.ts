#!/usr/bin/env tsx

/**
 * License Compatibility Checker
 *
 * Scans production dependencies and verifies all licenses are compatible
 * with the project's MIT license.
 *
 * Usage:
 *   tsx scripts/check-licenses.ts
 */

import { execSync } from "node:child_process";

const ALLOWED_LICENSES = new Set([
  "MIT",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "Apache-2.0",
  "0BSD",
  "CC0-1.0",
  "Unlicense",
  "BlueOak-1.0.0",
  "Python-2.0",
]);

const REJECTED_PATTERNS = [/^GPL/i, /^AGPL/i, /^SSPL/i, /^EUPL/i];

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  path?: string;
}

function isRejected(license: string): boolean {
  return REJECTED_PATTERNS.some((pattern) => pattern.test(license));
}

function isAllowed(license: string): boolean {
  // Handle SPDX expressions like "MIT OR Apache-2.0"
  const parts = license.split(/\s+OR\s+/i);
  return parts.some((part) => ALLOWED_LICENSES.has(part.trim()));
}

function parseLicenses(jsonOutput: string): LicenseEntry[] {
  const entries: LicenseEntry[] = [];

  try {
    const parsed = JSON.parse(jsonOutput);

    // pnpm licenses list --json returns a map of license -> packages[]
    if (typeof parsed === "object" && parsed !== null) {
      for (const [license, packages] of Object.entries(parsed)) {
        if (Array.isArray(packages)) {
          for (const pkg of packages) {
            entries.push({
              name: (pkg as Record<string, string>).name || "unknown",
              version: (pkg as Record<string, string>).version || "unknown",
              license,
              path: (pkg as Record<string, string>).path,
            });
          }
        }
      }
    }
  } catch {
    console.error("Error: Failed to parse pnpm licenses output.");
    process.exit(1);
  }

  return entries;
}

console.log("Checking production dependency licenses...\n");

let jsonOutput: string;
try {
  jsonOutput = execSync("pnpm licenses list --json --prod", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    cwd: process.cwd(),
    timeout: 60_000,
  });
} catch (err) {
  const error = err as { stdout?: string; stderr?: string };
  // pnpm licenses may write to stdout even on non-zero exit
  if (error.stdout) {
    jsonOutput = error.stdout;
  } else {
    console.error("Error: Failed to run 'pnpm licenses list --json --prod'.");
    console.error(error.stderr || "");
    process.exit(1);
  }
}

const entries = parseLicenses(jsonOutput);

if (entries.length === 0) {
  console.log("No production dependencies found.");
  process.exit(0);
}

const compatible: LicenseEntry[] = [];
const incompatible: LicenseEntry[] = [];
const unknown: LicenseEntry[] = [];

for (const entry of entries) {
  if (isRejected(entry.license)) {
    incompatible.push(entry);
  } else if (isAllowed(entry.license)) {
    compatible.push(entry);
  } else {
    unknown.push(entry);
  }
}

// Summary
console.log(`Total packages scanned: ${entries.length}`);
console.log(`  Compatible:    ${compatible.length}`);
console.log(`  Incompatible:  ${incompatible.length}`);
console.log(`  Unknown:       ${unknown.length}`);
console.log("");

if (incompatible.length > 0) {
  console.log("INCOMPATIBLE LICENSES (rejected):");
  for (const entry of incompatible) {
    console.log(`  - ${entry.name}@${entry.version} — ${entry.license}`);
  }
  console.log("");
}

if (unknown.length > 0) {
  console.log("UNKNOWN LICENSES (review manually):");
  for (const entry of unknown) {
    console.log(`  - ${entry.name}@${entry.version} — ${entry.license}`);
  }
  console.log("");
}

if (incompatible.length > 0) {
  console.error("FAIL: Incompatible licenses detected. See above for details.");
  process.exit(1);
} else if (unknown.length > 0) {
  console.log("WARN: Some licenses could not be classified. Review manually.");
  console.log("PASS: No incompatible licenses found.");
  process.exit(0);
} else {
  console.log("PASS: All production dependency licenses are compatible.");
  process.exit(0);
}
