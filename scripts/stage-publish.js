#!/usr/bin/env node
/**
 * Staged publish: submits changed packages to npm's staging area
 * instead of publishing directly. A maintainer must approve each
 * staged package (with 2FA) before it goes live.
 *
 * Replaces `changeset publish` in the release workflow.
 * Requires npm >= 11.15.0 and Trusted Publisher configured on npmjs.com.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = [
  "packages/auth",
  "packages/config",
  "packages/plugin-sdk",
  "packages/api",
  "packages/core",
  "packages/cli",
  "plugins/plugin-ci",
];

let staged = 0;
let skipped = 0;

for (const pkg of PACKAGES) {
  const pkgJson = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"));
  const { name, version } = pkgJson;

  let registryVersion;
  try {
    registryVersion = execSync(`npm view ${name} version 2>/dev/null`, {
      encoding: "utf8",
    }).trim();
  } catch {
    registryVersion = null;
  }

  if (registryVersion === version) {
    console.log(`skip: ${name}@${version} (already published)`);
    skipped++;
    continue;
  }

  console.log(`staging: ${name}@${version} (registry: ${registryVersion ?? "unpublished"})`);
  try {
    execSync("npm stage publish", { cwd: pkg, stdio: "inherit" });
    staged++;
  } catch (err) {
    console.error(`FAILED to stage ${name}@${version}`);
    process.exit(1);
  }
}

console.log(`\nDone: ${staged} staged, ${skipped} skipped`);
if (staged > 0) {
  console.log("Approve staged packages at: https://www.npmjs.com/settings/gpc-cli/staged-packages");
  console.log("Or run: npm stage list && npm stage approve <stage-id>");
}
