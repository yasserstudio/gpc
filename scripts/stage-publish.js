#!/usr/bin/env node
/**
 * Staged publish: submits changed packages to npm's staging area
 * instead of publishing directly. A maintainer must approve each
 * staged package (with 2FA) before it goes live.
 *
 * Replaces `changeset publish` in the release workflow.
 * Requires npm >= 11.15.0 and Trusted Publisher configured on npmjs.com.
 *
 * Before publishing, each package's pnpm `workspace:*` dependency
 * specifiers are resolved to concrete versions. npm does not understand
 * the `workspace:` protocol (only pnpm/changesets do), so publishing the
 * manifest verbatim leaks `"@gpc-cli/api": "workspace:*"` into the
 * registry and breaks `npm install` with EUNSUPPORTEDPROTOCOL. This was
 * the regression in 0.9.77-0.9.83 (GH #61); `changeset publish` used to
 * perform this rewrite for us. We rewrite the manifest in place, publish
 * from the package directory (preserving provenance/OIDC behavior), then
 * restore the original file.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGES = [
  "packages/auth",
  "packages/config",
  "packages/plugin-sdk",
  "packages/api",
  "packages/core",
  "packages/cli",
  "plugins/plugin-ci",
];

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

const WORKSPACE_PREFIX = "workspace:";

/** Build a map of `@scope/name` -> version across all workspace packages. */
export function buildVersionMap(packages) {
  const map = {};
  for (const pkg of packages) {
    const { name, version } = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"));
    map[name] = version;
  }
  return map;
}

/**
 * Return a copy of `pkgJson` with every `workspace:` specifier replaced by a
 * concrete version drawn from `versionMap`. Covers the forms GPC's manifests
 * use; mirrors changesets/pnpm for them:
 *   workspace:*  (or bare `workspace:`) -> <version>   (exact, matches changesets)
 *   workspace:^                         -> ^<version>
 *   workspace:~                         -> ~<version>
 * Any other form (explicit range, npm alias, etc.) throws rather than risk
 * shipping a wrong or invalid spec — GPC does not use them, so a new form is a
 * deliberate signal to extend this resolver. Also throws if a workspace
 * dependency is not a known workspace package.
 */
export function resolveWorkspaceDeps(pkgJson, versionMap) {
  const out = JSON.parse(JSON.stringify(pkgJson));
  for (const field of DEP_FIELDS) {
    const deps = out[field];
    if (!deps) continue;
    for (const [dep, spec] of Object.entries(deps)) {
      if (typeof spec !== "string" || !spec.startsWith(WORKSPACE_PREFIX)) continue;
      const rest = spec.slice(WORKSPACE_PREFIX.length);
      const version = versionMap[dep];
      if (!version) {
        throw new Error(
          `Cannot resolve workspace dependency "${dep}" (${spec}): not a known workspace package`,
        );
      }
      if (rest === "*" || rest === "") deps[dep] = version;
      else if (rest === "^") deps[dep] = `^${version}`;
      else if (rest === "~") deps[dep] = `~${version}`;
      else {
        throw new Error(
          `Unsupported workspace specifier for "${dep}" (${spec}). ` +
            `Extend resolveWorkspaceDeps() to handle it before publishing.`,
        );
      }
    }
  }
  return out;
}

/** Fail-closed backstop: throw if any `workspace:` specifier survived resolution. */
export function assertNoWorkspaceProtocol(pkgJson) {
  for (const field of DEP_FIELDS) {
    const deps = pkgJson[field];
    if (!deps) continue;
    for (const [dep, spec] of Object.entries(deps)) {
      if (typeof spec === "string" && spec.startsWith(WORKSPACE_PREFIX)) {
        throw new Error(
          `Refusing to publish: "${dep}" still uses the workspace protocol (${spec}). ` +
            `This would break npm install (EUNSUPPORTEDPROTOCOL).`,
        );
      }
    }
  }
  // Field-agnostic net: catch a `workspace:` specifier anywhere in the manifest,
  // including any field not enumerated in DEP_FIELDS.
  if (JSON.stringify(pkgJson).includes(`"${WORKSPACE_PREFIX}`)) {
    throw new Error(
      "Refusing to publish: a workspace: specifier remains in the manifest " +
        "(would break npm install with EUNSUPPORTEDPROTOCOL).",
    );
  }
}

function main() {
  const versionMap = buildVersionMap(PACKAGES);
  let staged = 0;
  let skipped = 0;

  for (const pkg of PACKAGES) {
    const pkgPath = join(pkg, "package.json");
    const original = readFileSync(pkgPath, "utf8");
    const pkgJson = JSON.parse(original);
    const { name, version } = pkgJson;

    let registryVersion;
    try {
      registryVersion = execFileSync("npm", ["view", name, "version"], {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
    } catch {
      registryVersion = null;
    }

    if (registryVersion === version) {
      console.log(`skip: ${name}@${version} (already published)`);
      skipped++;
      continue;
    }

    const resolved = resolveWorkspaceDeps(pkgJson, versionMap);
    assertNoWorkspaceProtocol(resolved);

    console.log(`staging: ${name}@${version} (registry: ${registryVersion ?? "unpublished"})`);

    // Write the resolved manifest so npm publishes concrete versions instead of
    // the workspace: protocol, then restore the original regardless of outcome.
    writeFileSync(pkgPath, `${JSON.stringify(resolved, null, 2)}\n`);
    let publishFailed = false;
    try {
      execFileSync("npm", ["stage", "publish"], { cwd: pkg, stdio: "inherit" });
      staged++;
    } catch {
      publishFailed = true;
    } finally {
      writeFileSync(pkgPath, original);
    }

    // The release must leave the tree clean; verify the restore is byte-exact.
    if (readFileSync(pkgPath, "utf8") !== original) {
      console.error(`Manifest restore mismatch for ${pkgPath}; aborting to avoid a dirty tree.`);
      process.exit(1);
    }

    if (publishFailed) {
      console.error(
        `FAILED to stage ${name}@${version} (${staged} package(s) staged before failure)`,
      );
      process.exit(1);
    }
  }

  console.log(`\nDone: ${staged} staged, ${skipped} skipped`);
  if (staged > 0) {
    console.log(
      "Approve staged packages at: https://www.npmjs.com/settings/gpc-cli/staged-packages",
    );
    console.log("Or run: npm stage list && npm stage approve <stage-id>");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
