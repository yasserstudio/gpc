---
title: "What We Actually Did About npm Supply Chain Attacks"
date: 2026-05-30
description: "npm supply chain attacks compromised hundreds of packages in 2025-2026. Here is every concrete protection a small CLI project shipped, and how you can adopt the same patterns."
author: Yasser Berrehail
tags: [security, supply-chain, npm, ci-cd, oidc]
image: ./npm-supply-chain-cover.png
---

<BlogPost />

# What We Actually Did About npm Supply Chain Attacks

In May 2026, attackers compromised 42 TanStack packages by poisoning a GitHub Actions build cache through a pull request. The malicious code exfiltrated AWS credentials, GCP tokens, Kubernetes secrets, and SSH keys from every developer who installed the affected versions. This was not an isolated incident. Hundreds of npm packages were compromised through similar vectors throughout 2025 and 2026.

GPC is a TypeScript CLI for the Google Play Developer API. It handles service account credentials, access tokens, and publish workflows for Android apps. If an attacker compromised our npm packages, they could steal every credential that passes through the tool.

This article covers every concrete protection we shipped across v0.9.50 through v0.9.80. Not theory. Not recommendations. What we actually changed, and what you can copy.

**Key Takeaways**

- Delete your long-lived NPM_TOKEN and switch to Trusted Publisher (OIDC). It takes 10 minutes.
- Add `ignore-scripts=true` to your `.npmrc` and explicitly allowlist packages that need postinstall hooks.
- Pin every GitHub Action to a commit SHA, not a tag. Tags are mutable.
- Staged Publishing adds a human approval gate before packages go live on npm. One compromised CI run cannot silently publish.
- `min-release-age=7` in `.npmrc` blocks freshly-published malicious packages from entering your dependency tree.
- Isolate secret-dependent CI jobs from PR workflows. A fork PR should never see your credentials.

## The npm Supply Chain Attack That Changed Our Approach

The TanStack attack (May 12, 2026, campaign name "Mini Shai-Hulud") worked like this:

1. Attacker opened a normal-looking PR on the TanStack repo
2. GitHub Actions ran CI tests on that PR automatically
3. Code inside the PR stole the workflow's GitHub Actions cache write token
4. Attacker used that token to plant poisoned files in the shared build cache
5. The official release workflow later pulled from the poisoned cache, signed the malicious build, and published 84 compromised versions to npm

A git-resolved `optionalDependency` delivered the payload: its `prepare` script ran a 2.3 MB credential exfiltrator. Once the cache token was stolen, the PR could be closed. The poisoned cache persisted.

This attack vector is relevant to any project that:

- Runs CI on pull requests from forks
- Shares build caches between PR and release workflows
- Uses `npm publish` with a long-lived token

GPC did all three before we hardened.

## Layer 1: Kill the NPM_TOKEN

**What we did:** Switched from a stored `NPM_TOKEN` secret to npm Trusted Publisher (OIDC). Then deleted the token from GitHub Secrets entirely.

**How it works:** Your GitHub Actions workflow requests a short-lived OIDC token from npm at publish time. npm verifies the token came from your specific repository, branch, and workflow. No stored secret. Nothing to steal.

```yaml
# .github/workflows/release.yml
permissions:
  id-token: write # Required for OIDC token exchange with npm

steps:
  - uses: actions/setup-node@48b55a... # v6 (SHA-pinned)
    with:
      registry-url: "https://registry.npmjs.org"

  # npm authenticates via OIDC. No NPM_TOKEN needed.
  - run: pnpm release-staged
    env:
      NODE_AUTH_TOKEN: "" # Explicitly empty. OIDC handles auth.
```

**Setup:** Go to npmjs.com, navigate to each package's settings, and configure Trusted Publisher with your GitHub repo, branch, and workflow file. Takes about 2 minutes per package.

After our first successful OIDC publish (v0.9.77, May 22, 2026), we deleted the `NPM_TOKEN` from GitHub Secrets. It no longer exists anywhere.

## Layer 2: Staged Publishing

**What we did:** Added a human approval gate between CI and npm.

Even with OIDC, a compromised CI pipeline could publish malicious code. Staged Publishing splits the process: CI stages packages to npm's holding area, then a maintainer reviews and approves each package with 2FA before it goes live.

```bash
# scripts/stage-publish.js (simplified)
for (const pkg of PACKAGES) {
  const { name, version } = pkgJson;
  const registryVersion = execFileSync("npm", ["view", name, "version"]);
  if (registryVersion === version) continue; // already published
  execSync("npm stage publish", { cwd: pkg });
}
```

After CI runs, nothing is live yet. The maintainer goes to `npmjs.com/settings/gpc-cli/staged-packages`, reviews the staged packages, and approves with 2FA. Only then do packages appear on the registry.

A single compromised CI run cannot silently push malicious code to npm.

## Layer 3: Block Install Scripts

**What we did:** Blocked all install scripts in CI, then allowlisted the two packages that genuinely need postinstall hooks.

Most npm supply chain attacks run during `npm install` via postinstall scripts. Block them by default and the vector disappears.

```yaml
# Every CI workflow (ci.yml, release.yml, binary.yml, docs.yml, codeql.yml, bundle-size.yml)
- run: pnpm install --frozen-lockfile --ignore-scripts
```

```json
// package.json
{
  "pnpm": {
    "onlyBuiltDependencies": ["turbo", "esbuild"]
  }
}
```

Only `turbo` and `esbuild` are allowed to run install hooks. Every other dependency's lifecycle scripts are blocked. This is in all 6 CI workflows.

Starting with v0.9.80, the CI templates that `gpc init` generates for users also include `--ignore-scripts`.

## Layer 4: Pin Actions to Commit SHAs

**What we did:** Pinned every GitHub Action to a full commit SHA instead of a mutable tag.

Git tags are mutable. An attacker who gains write access to a popular GitHub Action can move the `v4` tag to point at malicious code. Every workflow that uses `@v4` would then run the attacker's code.

```yaml
# Before (vulnerable to tag-swap)
- uses: actions/checkout@v6

# After (immutable)
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6
```

We pinned all action references across all workflows. The comment after the SHA records which version it corresponds to, so Dependabot can still propose updates.

## Layer 5: Isolate PR Secrets

**What we did:** Moved secret-dependent CI jobs to push events and added explicit fork-PR guards.

The TanStack attack worked because the PR workflow had access to secret environment variables. We restructured our CI so that:

- PR workflows run tests with `--ignore-scripts` and no secrets
- The dependency review job only runs on PRs (read-only, no secrets)
- Security scanning (deepsec) runs on push to main only, not on PRs
- Secret-dependent steps check `github.event.pull_request.head.repo.full_name == github.repository` to block fork PRs

```yaml
# ci.yml: dependency review (read-only, safe on PRs)
dependency-review:
  if: github.event_name == 'pull_request'
  permissions:
    contents: read

# ci.yml: deepsec scan (needs API key, restricted to push)
deepsec:
  if: github.event_name == 'push'
  permissions:
    contents: read
```

## Layer 6: Block Freshly-Published Packages

**What we did:** Set `min-release-age=7` in `.npmrc`.

```ini
# .npmrc
min-release-age=7
```

pnpm rejects any package version published less than 7 days ago. A malicious version of a dependency cannot enter your tree for a week, giving the community time to detect and revert it.

This is a blunt instrument with a real tradeoff: you cannot adopt urgent security patches within the first week. For a CLI tool with 4 runtime dependencies, we decided the supply chain protection outweighs the patch delay.

## Layer 7: Automated Scanning

**What we did:** Added Socket.dev, CodeQL, `pnpm audit`, and deepsec to the CI pipeline.

| Tool              | Trigger            | What it catches                                       |
| ----------------- | ------------------ | ----------------------------------------------------- |
| Socket.dev        | Every PR           | Malicious packages, typosquatting, obfuscated code    |
| `pnpm audit`      | Every PR           | Known CVEs in production dependencies                 |
| CodeQL            | Every push         | Static analysis (injection, auth bypass)              |
| deepsec           | Every push to main | AI-powered security audit (RCE, SSRF, path traversal) |
| Dependency Review | Every PR           | License issues, new dependency risks                  |

Socket.dev is particularly effective against the TanStack-style attack because it detects git-resolved dependencies and obfuscated install scripts, which are the two primary delivery mechanisms.

## Layer 8: Provenance and SBOM

**What we did:** Automatic provenance attestation via Trusted Publisher, plus CycloneDX SBOM on every release.

When you install `@gpc-cli/cli`, npm can verify that the package was built by our specific GitHub repository, on a specific commit, using a specific workflow. This is automatic with Trusted Publisher.

```bash
# Verify provenance of any @gpc-cli package
npm audit signatures
```

We also generate a CycloneDX Software Bill of Materials on every release, archived as a CI artifact. If a dependency is later found to be compromised, the SBOM tells you exactly which GPC versions included it.

## The Full Stack

Here is every layer in one table:

| #   | Protection                                 | What it prevents                                      |
| --- | ------------------------------------------ | ----------------------------------------------------- |
| 1   | Trusted Publisher (OIDC)                   | Stolen NPM_TOKEN publishing malicious packages        |
| 2   | Staged Publishing (2FA)                    | Compromised CI silently publishing                    |
| 3   | `ignore-scripts` + allowlist               | Malicious postinstall scripts during install          |
| 4   | SHA-pinned Actions                         | Tag-swap attacks on GitHub Actions                    |
| 5   | PR secret isolation                        | Fork PRs stealing CI secrets                          |
| 6   | `min-release-age=7`                        | Freshly-published malicious dependency versions       |
| 7   | Socket.dev + pnpm audit + CodeQL + deepsec | Known vulnerabilities and malicious patterns          |
| 8   | Provenance + SBOM                          | Verifying package origin; tracking dependency history |

No single layer is sufficient. The TanStack attack would have bypassed layers 1, 3, 6, 7, and 8. It specifically exploited the gap between layers 4 and 5 (cache poisoning via a PR that had access to write tokens). Defense in depth is not a cliche here. It is the only approach that works.

## What You Can Do Today

If you maintain an npm package:

1. **Set up Trusted Publisher.** Go to npmjs.com, configure OIDC for your repo. Delete your NPM_TOKEN.
2. **Add `ignore-scripts=true` to `.npmrc`.** Allowlist the packages that genuinely need install hooks.
3. **Pin your GitHub Actions to SHAs.** Run `npx pin-github-action .github/workflows/*.yml` to automate this.
4. **Add `min-release-age=7` to `.npmrc`.** Accept the tradeoff.
5. **Review your CI secrets exposure.** Does your PR workflow have access to publish tokens? Fix that today.

If you are a consumer of npm packages:

1. **Check provenance.** Run `npm audit signatures` on your project.
2. **Use a lockfile.** Always `--frozen-lockfile` in CI.
3. **Review dependency changes.** Use `actions/dependency-review-action` on PRs.

The npm ecosystem has a supply chain problem. Waiting for npm to solve it is not a strategy. Ship the protections yourself.

---

_GPC is a TypeScript CLI for the Google Play Developer API. 217 endpoints, 2,345 tests, free to use. [Install](../guide/installation) | [Security model](../advanced/security) | [GitHub](https://github.com/yasserstudio/gpc)_
