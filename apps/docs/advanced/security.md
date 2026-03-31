---
outline: deep
---

# Security

GPC handles sensitive credentials (service account keys, OAuth tokens) and interacts with production app releases. This page documents the threat model, security controls, and best practices.

## Threat Model

### Assets to Protect

| Asset                | Sensitivity | Risk if Compromised                        |
| -------------------- | ----------- | ------------------------------------------ |
| Service account keys | Critical    | Full API access to all apps in the account |
| OAuth tokens         | High        | User-scoped access, time-limited           |
| API responses        | Medium      | May contain PII (reviews, user emails)     |
| Upload artifacts     | Medium      | AAB/APK files (intellectual property)      |
| Configuration files  | Low         | May reference credential paths             |

### Attack Vectors

| Vector                       | Risk   | Mitigation                                    |
| ---------------------------- | ------ | --------------------------------------------- |
| Credential committed to repo | High   | `.gitignore` templates, `gpc doctor` warnings |
| Credential leaked in logs    | High   | Redaction in verbose/debug output             |
| Token theft from disk        | Medium | OS keychain storage, file permissions (0600)  |
| Man-in-the-middle            | Low    | TLS-only, custom CA certificate support       |
| Malicious plugin             | Medium | Plugin permission scoping, approval flow      |
| Dependency supply chain      | Medium | Lockfile, audit, 4 runtime deps, `min-release-age=7`, Socket.dev CI + GitHub App |

## Credential Storage

### Service Account Keys

Service account keys grant full API access and are long-lived. GPC never copies, moves, or embeds key content.

| Environment | Storage Method                         | Notes                                            |
| ----------- | -------------------------------------- | ------------------------------------------------ |
| CI/CD       | Environment variable or mounted secret | `GPC_SERVICE_ACCOUNT` (JSON string or file path) |
| Local dev   | File path reference in config          | Never copied into GPC storage                    |
| Docker      | Mounted volume or env var              | Never baked into image                           |

**Rules enforced by GPC:**

- Config stores only the _path_ to the key file, never the key content
- `gpc doctor` warns if the key file has overly permissive permissions (>0600)
- `gpc doctor` warns if the key file is inside a git repository

### Token Cache Security

Service account access tokens are cached in two layers:

1. **In-memory cache** -- fastest lookup, cleared when the process exits
2. **Filesystem cache** -- `~/.cache/gpc/token-cache.json` with `0600` permissions in a `0700` directory

Security properties:

- Atomic writes via temp file + rename (no partial reads)
- Promise-based mutex prevents race conditions in concurrent requests
- Cache key validation enforces email format only -- prevents path traversal
- 5-minute safety margin before expiry triggers proactive refresh

### OAuth Tokens

| Platform    | Storage Location                                        |
| ----------- | ------------------------------------------------------- |
| macOS       | Keychain (`security` CLI)                               |
| Linux       | `libsecret` / `gnome-keyring` / encrypted file fallback |
| Windows     | Windows Credential Manager                              |
| CI/headless | Not applicable -- use service account                   |

**Fallback:** If no OS keychain is available, tokens are stored in `~/.config/gpc/credentials.json` with `0600` permissions and a warning on first use.

**Token lifecycle:**

1. OAuth device flow produces access + refresh tokens
2. Access token cached (1-hour TTL)
3. On expiry, auto-refreshed using refresh token
4. On `gpc auth logout`, token is revoked and deleted from storage
5. Refresh token rotation enforced when supported

## Secrets Redaction

All output layers (human, JSON, YAML, debug logs) pass through a redaction filter before reaching any output destination.

### Redacted Patterns

| Pattern                | Example Input                      | Redacted Output                  |
| ---------------------- | ---------------------------------- | -------------------------------- |
| Service account key ID | `"private_key_id": "abc123..."`    | `"private_key_id": "[REDACTED]"` |
| Private key content    | `-----BEGIN PRIVATE KEY-----`      | `[REDACTED_KEY]`                 |
| OAuth access tokens    | `ya29.a0AfH6SM...`                 | `ya29.[REDACTED]`                |
| Refresh tokens         | `1//0eXy...`                       | `1//[REDACTED]`                  |
| Client secret          | `"client_secret": "GOCSPX-..."`    | `"client_secret": "[REDACTED]"`  |
| Client email           | `"client_email": "sa@proj.iam..."` | Shown (needed for debugging)     |

### Redaction Architecture

```
┌─────────────────────┐
│   Command Output    │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │  Redaction   │  <- Applied before ANY output
    │   Filter     │     (console, file, JSON)
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Formatter   │  <- Human / JSON / YAML
    └─────────────┘
```

Redaction is applied before formatting and cannot be disabled.

### Debug Mode

- `--verbose` shows request URLs and response headers (auth header redacted)
- Request/response bodies containing credentials are never logged
- `GPC_DEBUG=1` enables full debug output but still applies redaction

## File Permissions

### Files Created by GPC

| File                             | Permissions | Contents                         |
| -------------------------------- | ----------- | -------------------------------- |
| `~/.config/gpc/config.json`      | `0644`      | Non-sensitive configuration      |
| `~/.config/gpc/credentials.json` | `0600`      | OAuth tokens (keychain fallback) |
| `~/.config/gpc/profiles/`        | `0700`      | Profile directories              |
| `~/.config/gpc/audit.log`        | `0600`      | Audit log (JSON Lines)           |

### Files Validated by GPC

| File                | Expected Permissions | Action if Wrong          |
| ------------------- | -------------------- | ------------------------ |
| Service account key | `0600`               | Warning via `gpc doctor` |
| Credentials file    | `0600`               | Auto-fix + warning       |
| Config directory    | `0700`               | Warning via `gpc doctor` |

## Network Security

### TLS

- All API communication is over HTTPS (enforced by the googleapis client library)
- No HTTP fallback exists
- Custom CA certificates are supported via `GPC_CA_CERT` or `NODE_EXTRA_CA_CERTS`

### Proxy Support

| Configuration        | Method                             |
| -------------------- | ---------------------------------- |
| Environment variable | `HTTPS_PROXY` or `https_proxy`     |
| Exclusions           | `NO_PROXY` for bypass rules        |
| Config file          | `proxy: "https://proxy.corp:8080"` |
| With authentication  | `https://user:pass@proxy:8080`     |

### Client-Side Rate Limiting

| Bucket        | Default Limit | Protects Against             |
| ------------- | ------------- | ---------------------------- |
| General API   | 200 req/s     | Exceeding 3,000/min quota    |
| Reviews GET   | 200 req/hr    | Exceeding 200/hour quota     |
| Reviews POST  | 2,000 req/day | Exceeding 2,000/day quota    |
| Voided burst  | 30 req/30s    | Exceeding 30/30s burst quota |
| Voided daily  | 6,000 req/day | Exceeding 6,000/day quota    |
| Reporting API | 10 req/s      | Exceeding 10/sec quota       |

## Input Validation

### CLI Arguments

| Input          | Validation                                                        | Reject Example          |
| -------------- | ----------------------------------------------------------------- | ----------------------- |
| Package names  | Android format: `[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+` | `invalid`               |
| File paths     | Existence, type, ZIP magic bytes, size (2 GB AAB / 1 GB APK)      | `/nonexistent/file.aab` |
| Track names    | Known tracks + custom track format                                | `unknown-track`         |
| Language codes | BCP 47 validation                                                 | `xx-YY`                 |
| Arguments      | No shell expansion passed to API                                  | --                      |

### File Uploads

| Check         | Validation                             | Limit           |
| ------------- | -------------------------------------- | --------------- |
| File type     | Magic bytes validation (AAB/APK)       | --              |
| File size     | Size check against Play Console limits | 150MB (APK/AAB) |
| Mapping files | ProGuard/R8 format validation          | --              |

### Config Files

- Schema validation on load with clear error messages
- Unknown keys trigger warnings (not errors) for forward compatibility
- Environment variable values are validated the same as config values
- Prototype pollution prevention -- `__proto__`, `constructor`, and `prototype` are rejected as config keys
- Unsafe keys are fully deleted from parsed config (not set to `undefined`)

### Filesystem Operations

- Fastlane metadata directory reads validate language folder names against `^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$` to prevent path traversal
- Upload responses are validated before use -- null/missing data from the API triggers a clear error

## Plugin Security

### Trust Model

| Plugin Type | Pattern                       | Trust Level                        |
| ----------- | ----------------------------- | ---------------------------------- |
| First-party | `@gpc-cli/plugin-*`           | Auto-trusted, no permission checks |
| Third-party | `gpc-plugin-*` or config path | Untrusted, permissions validated   |

### Permission Enforcement

Third-party plugins declare required permissions in `PluginManifest`:

```typescript
type PluginPermission =
  | "read:config"
  | "write:config"
  | "read:auth"
  | "api:read"
  | "api:write"
  | "commands:register"
  | "hooks:beforeCommand"
  | "hooks:afterCommand"
  | "hooks:onError"
  | "hooks:beforeRequest"
  | "hooks:afterResponse";
```

**Rules:**

1. Plugins cannot access credentials directly
2. Third-party plugins require explicit user approval on first run
3. Unknown permissions throw `PLUGIN_INVALID_PERMISSION` (exit code 10)
4. Error handlers in plugins are wrapped -- a failing handler cannot crash GPC
5. Plugin approval can be revoked: `gpc plugins revoke <name>`

## Repository Security

### Branch Protection

The `main` branch is protected with the following rules:

| Rule                    | Setting  | Why                                        |
| ----------------------- | -------- | ------------------------------------------ |
| Required status checks  | `check`, `analyze`, `Socket Security` | CI + CodeQL + Socket must pass before merge |
| Strict status checks    | Enabled  | Branch must be up-to-date with `main`      |
| Force pushes            | Disabled | Prevents history rewriting                 |
| Deletions               | Disabled | Prevents accidental branch deletion        |
| Enforce admins          | Disabled | Repo owner can bypass for emergencies      |

### Secret Scanning

GitHub secret scanning is enabled on the repository. It monitors all pushes for 200+ secret patterns including:

- Google API keys (`AIza...`)
- AWS access keys (`AKIA...`)
- Stripe keys (`sk_live_...`, `sk_test_...`)
- npm tokens (`npm_...`)
- GitHub tokens (`ghp_...`, `gho_...`, `github_pat_...`)
- Private keys (PEM format)

Push protection blocks any commit containing a detected secret before it reaches the remote.

### Automated Security

| Tool         | Trigger             | What it checks                          |
| ------------ | ------------------- | --------------------------------------- |
| Socket.dev   | Every PR            | Supply chain alerts, malware, typosquats, license risks |
| `pnpm audit` | Every PR (`check` job) | Known CVEs in dependency tree (moderate+) |
| CodeQL       | Every push and PR   | Static analysis for JS/TS vulnerabilities |
| Dependabot   | Weekly              | Dependency version and security updates (direct deps only) |
| Secret scan  | Every push          | 200+ secret patterns in code            |
| SBOM         | Every release       | CycloneDX bill of materials archived per release |

### History Hygiene

- Private strategy documents are never committed to the repository
- Internal docs live in `.dev/` (gitignored) — never tracked by git
- Machine-specific files (`.vscode/`, `AGENTS.md`, agent skills) are gitignored
- Benchmark results are gitignored (only scripts are tracked)

### What's Tracked vs Gitignored

| Tracked (visible on GitHub)          | Gitignored (local only)                |
| ------------------------------------ | -------------------------------------- |
| `.github/` (workflows, templates)    | `.dev/` (private docs, strategy)       |
| `.changeset/` (versioning config)    | `.agents/`, `.claude/skills` (AI tools)|
| `.gitignore`, `.npmrc`               | `.vscode/` (editor settings)           |
| `CLAUDE.md` (project instructions)   | `AGENTS.md` (agent skill metadata)     |
| `SECURITY.md` (disclosure policy)    | `.turbo/` (build cache)                |
| Source code, tests, docs             | `node_modules/`, `dist/`, `.env`       |

## CI/CD Security Guidelines

### Secrets Management

```yaml
# GitHub Actions -- recommended pattern
env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
```

::: danger Do NOT

- Hardcode credentials in workflow files
- Echo or print credential values in CI logs
- Store credentials as build artifacts
- Use credentials from forks in pull request workflows
  :::

### Least Privilege

- Create dedicated service accounts per CI environment (staging vs production)
- Grant only required Play Console permissions (e.g., "Release manager" not "Admin")
- Rotate service account keys on a regular schedule
- Use short-lived credentials where possible (Workload Identity Federation)

### Audit Trail

- `--json` output includes command name, timestamp, and auth identity
- CI plugins can emit structured logs for SIEM ingestion
- All write operations are logged with before/after state
- Use `--dry-run` in PR checks to validate without modifying state

## Supply Chain Protection

GPC takes a defense-in-depth approach to supply chain security. The [axios supply chain attack](https://socket.dev/blog/axios-npm-package-compromised) (March 2026, 100M+ weekly downloads compromised) demonstrated why this matters for every npm project.

### Why GPC has minimal exposure

GPC uses only **4 runtime dependencies** (everything else is dev-only or workspace-internal):

| Package               | Purpose              | Weekly Downloads | Risk |
| --------------------- | -------------------- | --------------- | ---- |
| `google-auth-library` | Google's official auth | 15M+            | Low  |
| `commander`           | CLI framework         | 150M+           | Low  |
| `protobufjs`          | AAB manifest parsing  | 25M+            | Low  |
| `yauzl`               | ZIP/AAB extraction    | 10M+            | Low  |

GPC does **not** depend on `axios`, `node-fetch`, `got`, or any HTTP client library. All API calls use Node.js 20+ built-in `fetch`.

### Protections in place

| Layer | What it does |
| ----- | ------------ |
| `min-release-age=7` in `.npmrc` | Blocks packages published less than 7 days ago. Would have prevented the axios attack. |
| `pnpm-lock.yaml` | Exact version pinning. No unexpected upgrades on install. |
| Socket.dev CI scan | Runs `socket ci` on every PR. Blocks merges when critical supply chain alerts are detected. |
| Socket.dev GitHub App | Inline PR comments when risky dependencies are added. Configured via `socket.yml`. |
| `pnpm audit` in CI | Checks for known CVEs (moderate+) on every pull request. |
| GitHub Actions SHA pins | All action references pinned to commit hashes, not mutable version tags. |
| SBOM (CycloneDX) | Software bill of materials generated and archived on every npm release. |
| CODEOWNERS | Security-sensitive paths (workflows, auth, .npmrc) require explicit review. |
| Dependabot | Weekly security update PRs (direct dependencies only, actions grouped). |
| Socket CLI wrapper | Scans every local `npm install` and `npx` for malware, typosquats, and suspicious behavior. |
| CodeQL | Static analysis on every push for JS/TS vulnerabilities. |
| GitHub secret scanning | Blocks pushes containing 200+ secret patterns. |

### Socket.dev security score

As of v0.9.50, [Socket.dev reports](https://socket.dev/npm/package/@gpc-cli/cli) for `@gpc-cli/cli`:

| Category | Self Score | Transitive (46 deps) |
| -------- | ---------- | -------------------- |
| Vulnerability | 100 | 100 |
| License | 100 | 100 |
| Quality | 99 | 65 |
| Maintenance | 95 | 50 |
| Supply Chain | 71 | 66 |
| Overall | 71 | 50 |

Zero critical or high alerts. The transitive overall score is pulled down by `node-domexception` (deprecated, transitive dep of `google-auth-library`). No malware, no supply chain compromise.

## Dependency Policy

### Rules

1. Minimize dependency count. Prefer Node.js built-ins (`fetch`, `crypto`, `fs`, `child_process`)
2. Pin major versions in `package.json`
3. `pnpm audit` runs in CI on every pull request
4. Dependabot enabled for security updates
5. No `postinstall` scripts in production dependencies
6. `min-release-age=7` in `.npmrc` blocks newly published packages
7. Socket.dev CI scan on every PR (blocks on critical alerts)
8. Socket.dev GitHub App for inline PR comments on risky deps
9. Socket CLI wrapper scans all local installs

### Approved Runtime Dependencies

| Package               | Purpose              | Justification                           |
| --------------------- | -------------------- | --------------------------------------- |
| `google-auth-library` | Auth strategies      | Official Google library, required for API access |
| `commander`           | CLI framework        | Industry standard, 150M+ weekly downloads |
| `protobufjs`          | Protocol Buffers     | Required for AAB manifest parsing        |
| `yauzl`               | ZIP extraction       | Required for AAB file reading            |

New dependencies are reviewed for: maintenance status, download count, transitive dependency count, license compatibility (MIT, Apache-2.0, BSD preferred), and [Socket.dev security score](https://socket.dev).

## Security Checklist

### Before Release

- [ ] No credentials in source code or test fixtures
- [ ] All user inputs validated before API calls
- [ ] Secrets redacted in all output modes (human, JSON, YAML, debug)
- [ ] File permissions set correctly on credential files
- [ ] `pnpm audit` shows no high/critical vulnerabilities
- [ ] Socket.dev score reviewed for new dependencies
- [ ] Plugin permission model enforced
- [ ] Error messages do not leak sensitive information
- [ ] TLS enforced for all network communication

### For Contributors

- [ ] Never commit real service account keys (use fixtures with fake data)
- [ ] Test fixtures use obviously fake credentials
- [ ] New dependencies reviewed for security posture
- [ ] No `eval()`, `Function()`, or dynamic `require()` of user input
- [ ] No shell command construction from user input
