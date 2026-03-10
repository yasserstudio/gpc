# Security Design

## Threat Model

### Assets to Protect

1. **Service account keys** — Full API access, long-lived
2. **OAuth tokens** — User-scoped access, refreshable
3. **API responses** — May contain PII (reviews, user emails)
4. **Upload artifacts** — AAB/APK files (intellectual property)
5. **Configuration files** — May reference credential paths

### Attack Vectors

| Vector                  | Risk   | Mitigation                                    |
| ----------------------- | ------ | --------------------------------------------- |
| Credential in repo      | High   | `.gitignore` templates, `gpc doctor` warnings |
| Credential in logs      | High   | Redaction in verbose/debug output             |
| Token theft from disk   | Medium | OS keychain storage, file permissions         |
| Man-in-the-middle       | Low    | TLS-only, certificate pinning option          |
| Malicious plugin        | Medium | Plugin permission scoping, sandboxing         |
| Dependency supply chain | Medium | Lockfile, audit, minimal dependencies         |

---

## Credential Storage

### Service Account Keys

```
Priority: highest security — grants full API access
```

| Environment   | Storage                                | Notes                                            |
| ------------- | -------------------------------------- | ------------------------------------------------ |
| **CI/CD**     | Environment variable or mounted secret | `GPC_SERVICE_ACCOUNT` (JSON string or file path) |
| **Local dev** | File path reference in config          | Never copied into GPC storage                    |
| **Docker**    | Mounted volume or env var              | Never baked into image                           |

**Rules:**

- GPC never copies, moves, or embeds service account key content
- Config stores only the _path_ to the key file, never the key itself
- `gpc doctor` warns if key file has overly permissive file permissions (>0600)
- `gpc doctor` warns if key file is inside a git repository

### Token Cache Security

Service account access tokens are cached in two layers:

1. **In-memory cache** — fastest lookup, cleared when the process exits
2. **Filesystem cache** — `~/.cache/gpc/token-cache.json` with `0600` permissions in a `0700` directory

Token writes use atomic rename (`write tmp → rename`) to prevent partial reads. A promise-based mutex ensures only one JWT signing operation runs at a time per service account, preventing race conditions in concurrent requests.

Cache key validation enforces email-format-only keys (`/^[a-zA-Z0-9._%+@-]+$/`) to prevent path traversal attacks via malicious cache keys.

### OAuth Tokens

```
Priority: medium — user-scoped, short-lived, refreshable
```

| Platform    | Storage Location                                        |
| ----------- | ------------------------------------------------------- |
| macOS       | Keychain (`security` CLI)                               |
| Linux       | `libsecret` / `gnome-keyring` / encrypted file fallback |
| Windows     | Windows Credential Manager                              |
| CI/headless | Not applicable — use service account                    |

**Fallback:** If no OS keychain is available, tokens are stored in `~/.config/gpc/credentials.json` with `0600` permissions and a warning on first use.

**Token lifecycle:**

1. OAuth device flow → receive access + refresh token
2. Access token cached (1h TTL)
3. On expiry → auto-refresh using refresh token
4. On `gpc auth logout` → revoke token + delete from storage
5. Refresh token rotation enforced when supported

---

## Secrets Redaction

### What Gets Redacted

All output layers (human, JSON, debug logs) redact:

| Pattern                | Example                            | Replacement                      |
| ---------------------- | ---------------------------------- | -------------------------------- |
| Service account key ID | `"private_key_id": "abc123..."`    | `"private_key_id": "[REDACTED]"` |
| Private key content    | `-----BEGIN PRIVATE KEY-----`      | `[REDACTED_KEY]`                 |
| OAuth tokens           | `ya29.a0AfH6SM...`                 | `ya29.[REDACTED]`                |
| Refresh tokens         | `1//0eXy...`                       | `1//[REDACTED]`                  |
| Email in key file      | `"client_email": "sa@proj.iam..."` | Shown (needed for debugging)     |

### Implementation

```
┌─────────────────────┐
│   Command Output    │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │  Redaction   │  ← Applied before ANY output
    │   Filter     │     (console, file, JSON)
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Formatter   │  ← Human / JSON / YAML
    └─────────────┘
```

### Debug/Verbose Mode

- `--verbose` shows request URLs, headers (auth header redacted), response status
- Never logs request/response bodies containing credentials
- `GPC_DEBUG=1` enables full debug but still redacts secrets

---

## File Permissions

### Created by GPC

| File                             | Permissions | Contents                     |
| -------------------------------- | ----------- | ---------------------------- |
| `~/.config/gpc/config.json`      | `0644`      | Non-sensitive config         |
| `~/.config/gpc/credentials.json` | `0600`      | OAuth tokens (fallback only) |
| `~/.config/gpc/profiles/`        | `0700`      | Profile directories          |

### Validated by GPC

| File                | Expected | Action if Wrong          |
| ------------------- | -------- | ------------------------ |
| Service account key | `0600`   | Warning via `gpc doctor` |
| Credentials file    | `0600`   | Auto-fix + warning       |
| Config directory    | `0700`   | Warning                  |

---

## Network Security

### TLS

- All API communication over HTTPS (enforced by googleapis client)
- No HTTP fallback
- Custom CA certificate support via `GPC_CA_CERT` or `NODE_EXTRA_CA_CERTS`

### Proxy Support

- `HTTPS_PROXY` / `https_proxy` environment variables
- `NO_PROXY` for exclusions
- Config file: `proxy: "https://proxy.corp:8080"`
- Proxy authentication via URL: `https://user:pass@proxy:8080`

### Rate Limiting (Client-Side)

- Token bucket algorithm respecting Google API quotas
- Default: 10 requests/second
- Configurable via `GPC_RATE_LIMIT` or config
- Automatic backoff on 429 responses (exponential with jitter)

---

## Input Validation

### CLI Arguments

- Package names validated against Android format: `[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+`
- File paths validated for existence and type before upload
- Track names validated against known tracks + custom track format
- Language codes validated against BCP 47
- No shell expansion in arguments passed to API

### File Uploads

- AAB/APK validated by magic bytes before upload
- File size checked against Google Play limits (150MB APK, 150MB AAB)
- Mapping files validated as valid ProGuard/R8 format

### Config Files

- Schema validation on load with clear error messages
- Unknown keys trigger warnings (not errors) for forward compatibility
- Environment variable values validated same as config values

---

## Plugin Security

### Trust Model

| Plugin Type | Pattern                       | Trust Level                         |
| ----------- | ----------------------------- | ----------------------------------- |
| First-party | `@gpc-cli/plugin-*`           | Auto-trusted — no permission checks |
| Third-party | `gpc-plugin-*` or config path | Untrusted — permissions validated   |

### Permission Model

Third-party plugins declare required permissions in their `PluginManifest`:

```typescript
interface PluginManifest {
  name: string;
  version: string;
  permissions?: PluginPermission[];
  trusted?: boolean;
}

type PluginPermission =
  | "read:config" // Read configuration
  | "write:config" // Modify configuration
  | "read:auth" // Read auth state
  | "api:read" // Read API data
  | "api:write" // Write API data
  | "commands:register" // Register new CLI commands
  | "hooks:beforeCommand" // Hook into pre-command
  | "hooks:afterCommand" // Hook into post-command
  | "hooks:onError"; // Hook into error handling
```

### Rules

1. Plugins cannot access credentials directly
2. First-party plugins (`@gpc-cli/plugin-*`) are auto-trusted via name prefix
3. Third-party plugins have permissions validated before loading
4. Unknown permissions throw `PLUGIN_INVALID_PERMISSION` (exit code 10)
5. Error handlers in plugins are wrapped — a failing handler cannot crash GPC

---

## CI/CD Security Guidelines

### Secrets Management

```yaml
# GitHub Actions — recommended pattern
env:
  GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}

# Do NOT:
# - Hardcode credentials in workflow files
# - Echo/print credential values
# - Store credentials as artifacts
```

### Least Privilege

- Create dedicated service accounts per CI environment
- Grant only required permissions (e.g., "Release manager" not "Admin")
- Rotate service account keys on a schedule
- Use short-lived credentials where possible (Workload Identity Federation)

### Audit Trail

- `--json` output includes command, timestamp, and auth identity
- CI plugins can emit structured logs for SIEM ingestion
- All write operations logged with before/after state

---

## Dependency Policy

### Rules

1. Minimize dependency count — prefer Node.js built-ins
2. Pin major versions in `package.json`
3. `pnpm audit` runs in CI on every PR
4. Dependabot enabled for security updates
5. No `postinstall` scripts in production dependencies
6. Review new dependencies for:
   - Maintenance status (last commit, open issues)
   - Download count and community trust
   - Transitive dependency count
   - License compatibility (MIT, Apache-2.0, BSD preferred)

### Approved External Dependencies

| Package               | Purpose           | Why Not Built-In                 |
| --------------------- | ----------------- | -------------------------------- |
| `googleapis`          | Google API client | Official, maintained by Google   |
| `google-auth-library` | Auth strategies   | Official, maintained by Google   |
| `commander`           | CLI framework     | Industry standard, battle-tested |
| `cosmiconfig`         | Config loading    | Complex file discovery logic     |
| `chalk`               | Terminal colors   | Cross-platform color support     |
| `ora`                 | Spinners          | Terminal animation handling      |
| `cli-table3`          | Table output      | Column alignment, wrapping       |
| `keytar`              | OS keychain       | Native keychain bindings         |

---

## Security Checklist

### Before Release

- [ ] No credentials in source code or test fixtures
- [ ] All user inputs validated before API calls
- [ ] Secrets redacted in all output modes
- [ ] File permissions set correctly on credential files
- [ ] `pnpm audit` shows no high/critical vulnerabilities
- [ ] Plugin permission model enforced
- [ ] Error messages don't leak sensitive information
- [ ] TLS enforced for all network communication

### For Contributors

- [ ] Never commit real service account keys (use fixtures)
- [ ] Test fixtures use obviously fake credentials
- [ ] New dependencies reviewed for security
- [ ] No `eval()`, `Function()`, or dynamic `require()` of user input
- [ ] No shell command construction from user input
