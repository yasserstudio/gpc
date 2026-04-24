---
outline: deep
---

<CommandHeader
  name="gpc doctor"
  description="Utility commands: doctor (diagnose setup), docs (open docs), version, cache, feedback, and shell completion."
  usage="gpc <doctor|docs|version|cache|feedback|completion> [options]"
  :badges="['--json', '--check']"
/>

## Commands

| Command                               | Description                            |
| ------------------------------------- | -------------------------------------- |
| [`doctor`](#gpc-doctor)               | Verify setup and connectivity          |
| [`docs`](#gpc-docs)                   | Open documentation in browser          |
| [`version --json`](#gpc-version)      | Print version and install info as JSON |
| [`cache`](#gpc-cache)                 | Manage status, token, and update cache |
| [`auth token`](#gpc-auth-token)       | Print current access token             |
| [`feedback`](#gpc-feedback)           | Open a pre-filled GitHub issue         |
| [`completion bash`](#completion-bash) | Generate bash completions              |
| [`completion zsh`](#completion-zsh)   | Generate zsh completions               |
| [`completion fish`](#completion-fish) | Generate fish completions              |
| [`changelog`](/commands/changelog)    | Show release history from GitHub       |

## `gpc doctor`

Run diagnostic checks to verify your GPC setup end-to-end.

### Synopsis

```bash
gpc doctor [--json] [--verify] [--keystore <path>] [--store-pass <password>] [--key-alias <alias>]
```

### Options

| Flag                       | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| `--json`                   | Output results as machine-readable JSON                                      |
| `--verify`                 | Run signing key verification checks (compares local keystore vs Play cert)   |
| `--keystore <path>`        | Path to Android keystore file (or set `GPC_KEYSTORE_PATH`)                   |
| `--store-pass <password>`  | Keystore password (or set `GPC_STORE_PASSWORD`)                              |
| `--key-alias <alias>`      | Key alias in keystore (defaults to first entry)                              |

### Checks performed

| Check                         | What it verifies                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `node`                        | Node.js ≥ 20                                                                                              |
| `config`                      | Config file loads without errors                                                                          |
| `default-app`                 | A default package name is configured                                                                      |
| `package-name`                | Package name matches Android naming rules                                                                 |
| `config-dir`                  | Config directory is readable and writable                                                                 |
| `cache-dir`                   | Cache directory is readable and writable                                                                  |
| `service-account-file`        | SA key file exists and is readable (if configured)                                                        |
| `service-account-permissions` | SA key file is not group/world-readable (Unix)                                                            |
| `profile`                     | `GPC_PROFILE` env var points to a known profile                                                           |
| `proxy`                       | Proxy URL is valid (if `HTTPS_PROXY` etc. are set)                                                        |
| `ca-cert`                     | CA cert file exists (if `GPC_CA_CERT` is set)                                                             |
| `dns`                         | Both API endpoints resolve: `androidpublisher.googleapis.com` and `playdeveloperreporting.googleapis.com` |
| `auth`                        | Credentials load and authenticate successfully                                                            |
| `api-connectivity`            | Access token can be obtained from Google                                                                  |
| `verification-deadline`       | Days remaining until Android developer verification enforcement (September 30, 2026)                      |
| `signing-api` *(--verify)*    | Fetches Play signing certificate fingerprint from generatedApks                                           |
| `signing-local` *(--verify)*  | Compares local keystore fingerprint against Play signing certificate                                      |

### Example

```bash
gpc doctor
```

All checks passing:

```
GPC Doctor

  ✓ Node.js 22.12.0
  ✓ Configuration loaded
  ✓ Default app: com.example.myapp
  ✓ Package name format OK: com.example.myapp
  ✓ Config directory: /Users/you/.config/gpc
  ✓ Cache directory: /Users/you/.cache/gpc
  ✓ Service account file: /path/to/key.json
  ✓ Service account file permissions OK (mode: 600)
  ✓ DNS: androidpublisher.googleapis.com
  ✓ DNS: playdeveloperreporting.googleapis.com
  ✓ Authenticated as play-api@my-project.iam.gserviceaccount.com
  ✓ API connectivity verified

  ✓ 12 passed  ⚠ 0 warnings  ✗ 0 failed

All checks passed!
```

With failures:

```
GPC Doctor

  ✓ Node.js 22.12.0
  ✗ Configuration could not be loaded
    Run gpc config init to create a config file, or check .gpcrc.json for syntax errors

  ✓ 1 passed  ⚠ 0 warnings  ✗ 1 failed

Some checks failed. Fix the issues above and run again.
```

### JSON output

```bash
gpc doctor --json
```

```json
{
  "success": true,
  "errors": 0,
  "warnings": 0,
  "checks": [
    { "name": "node", "status": "pass", "message": "Node.js 22.12.0" },
    { "name": "config", "status": "pass", "message": "Configuration loaded" }
  ]
}
```

Exits `0` if all checks pass, `1` if any check fails.

### Signing key verification

When `--verify` is passed, doctor fetches your Play signing certificate via the API and optionally compares it against a local keystore.

Show the Play signing certificate fingerprint:

```bash
gpc doctor --verify
```

```
  ✓ Play signing cert (v86): AB:CD:12:34:...
  ℹ No local keystore provided for comparison
    Provide --keystore <path> and --store-pass <password> to compare against Play signing cert
```

Full comparison against a local keystore:

```bash
gpc doctor --verify --keystore release.keystore --store-pass $STORE_PASSWORD
```

```
  ✓ Play signing cert (v86): AB:CD:12:34:...
  ✓ Local keystore (mykey) matches Play signing cert
```

If the fingerprints don't match:

```
  ✓ Play signing cert (v86): AB:CD:12:34:...
  ✗ Signing key mismatch: local EF:56:78:90:... vs Play AB:CD:12:34:...
    Your local keystore does not match the Play signing certificate. If you distribute
    outside Play with this key, register it in Play Console to avoid installation blocks
    after September 30, 2026.
```

Environment variable alternatives: `GPC_KEYSTORE_PATH` and `GPC_STORE_PASSWORD` can be used instead of `--keystore` and `--store-pass`.

---

## `gpc update`

Update GPC to the latest version. Automatically detects your install method (npm, Homebrew, or standalone binary) and delegates to the appropriate update mechanism.

### Synopsis

```bash
gpc update [--check] [--force] [--output json]
```

### Options

| Option          | Description                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--check`       | Check for updates without installing. Exits 0 always — communicate update availability via output or `--output json`. |
| `--force`       | Update even if already on the latest version.                                                                         |
| `--output json` | Emit structured JSON instead of human-readable output.                                                                |

### How it works

GPC detects the install method in priority order:

1. `__GPC_BINARY=1` env var (injected at compile time) → standalone binary in-place replace
2. `npm_config_prefix` env var → `npm install -g @gpc-cli/cli@latest`
3. Resolved binary path contains `cellar` or `homebrew` → `brew upgrade yasserstudio/tap/gpc`
4. Resolved binary path contains `node_modules` → npm
5. Fallback → manual instructions with exit code 1

Binary installs download the platform asset, verify its SHA-256 checksum against `checksums.txt` from the release, then atomically replace the running binary.

### Environment Variables

| Variable           | Description                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `GPC_GITHUB_TOKEN` | GitHub personal access token. Raises the API rate limit from 60 to 5,000 requests/hour. Useful on shared CI runner IPs. |

### Examples

```bash
# Check if an update is available (safe, no changes made)
gpc update --check

# Update to latest
gpc update

# Force reinstall even if already on latest
gpc update --force

# Check in CI — parse result as JSON
gpc update --check --output json | jq '.updateAvailable'
```

### Example output

**Update available:**

```
Update available: 0.9.65 → 0.9.66
Install method: homebrew
Release: https://github.com/yasserstudio/gpc/releases/tag/v0.9.66

Run: gpc update
```

**Already on latest:**

```
Already on latest version: v0.9.66
```

**`--output json` (update available):**

```json
{
  "current": "0.9.31",
  "latest": "0.9.32",
  "updateAvailable": true,
  "installMethod": "homebrew",
  "releaseUrl": "https://github.com/yasserstudio/gpc/releases/tag/v0.9.32"
}
```

### Exit codes

| Code | Meaning                                                                   |
| ---- | ------------------------------------------------------------------------- |
| `0`  | Success — `--check` always exits 0 regardless of whether an update exists |
| `1`  | Error — unknown install method, permission denied, checksum mismatch      |
| `4`  | GitHub API error (rate limited, HTTP error)                               |
| `5`  | Network error (no connectivity)                                           |

::: tip CI usage
Use `--check --output json` to gate on update availability without installing:

```bash
gpc update --check --output json | jq -e '.updateAvailable' && echo "Update required"
```

`jq -e` exits 1 if the value is false/null, making it composable with `&&`.
:::

---

## `gpc docs`

Open the GPC documentation in your default browser. Optionally navigate directly to a specific topic page.

### Synopsis

```bash
gpc docs [topic] [--list]
```

### Options

| Flag      | Description                                  |
| --------- | -------------------------------------------- |
| `[topic]` | Topic name to open directly (see list below) |
| `--list`  | Print all available topics and exit          |

### Available Topics

| Topic           | Opens                  |
| --------------- | ---------------------- |
| `releases`      | commands/releases      |
| `status`        | commands/status        |
| `vitals`        | commands/vitals        |
| `reviews`       | commands/reviews       |
| `listings`      | commands/listings      |
| `subscriptions` | commands/subscriptions |
| `bundle`        | commands/bundle        |
| `users`         | commands/users         |
| `audit`         | commands/audit         |
| `config`        | commands/config        |
| `doctor`        | commands/doctor        |
| `publish`       | commands/publish       |

### Example

Open the docs home:

```bash
gpc docs
```

Open a specific topic:

```bash
gpc docs releases
gpc docs vitals
```

List all available topics:

```bash
gpc docs --list
```

```
Available topics:
  gpc docs releases
  gpc docs status
  gpc docs vitals
  ...
```

If an unknown topic is passed, the command exits code 2 with a suggestion to run `gpc docs --list`.

Opens `https://yasserstudio.github.io/gpc/` (or the topic-specific page) in the default browser. If the browser cannot be opened, prints the URL to stdout.

---

## `gpc version`

Print the current GPC version. Add `--json` to get structured output including install method and platform info.

### Synopsis

```bash
gpc version [--json]
```

### Options

| Flag     | Description                                  |
| -------- | -------------------------------------------- |
| `--json` | Output version info as machine-readable JSON |

### Example

```bash
gpc version
# v0.9.32

gpc version --json
```

```json
{
  "version": "0.9.32",
  "installMethod": "homebrew",
  "platform": "darwin-arm64",
  "node": "22.12.0"
}
```

---

## `gpc cache`

Manage the local GPC cache. GPC caches app status snapshots, OAuth access tokens, and update-check results to reduce API calls and improve responsiveness.

### Synopsis

```bash
gpc cache list
gpc cache clear [--type <status|token|update-check>]
```

### Subcommands

| Subcommand | Description                                      |
| ---------- | ------------------------------------------------ |
| `list`     | Show all cached entries with type, age, and size |
| `clear`    | Clear all cache entries or a specific type       |

### Options

| Flag            | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `--type <type>` | Clear only entries of the given type: `status`, `token`, or `update-check` |

### Examples

```bash
# List all cache entries
gpc cache list

# Clear everything
gpc cache clear

# Clear only the access token cache (forces re-auth on next command)
gpc cache clear --type token

# Clear only status snapshots
gpc cache clear --type status
```

---

## `gpc auth token`

Print the current Google API access token to stdout. Useful for scripting, debugging, or passing to other tools that call the Google Play API directly.

### Synopsis

```bash
gpc auth token
```

### Example

```bash
gpc auth token
# ya29.a0ARrdaM...

# Use in a curl call
curl -H "Authorization: Bearer $(gpc auth token)" \
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.app/tracks"
```

The token is fetched using your configured credentials (service account, OAuth, or ADC). It is cached for its remaining lifetime.

---

## `gpc feedback`

Open a pre-filled GitHub issue in your default browser with system diagnostics attached. The issue template includes your GPC version, install method, platform, Node.js version, and the output of `gpc doctor`.

### Synopsis

```bash
gpc feedback
```

### Example

```bash
gpc feedback
# Opening GitHub issue in browser...
# https://github.com/yasserstudio/gpc/issues/new?...
```

If the browser cannot be opened, the URL is printed to stdout so you can copy it manually.

---

## Shell completion

`gpc completion` generates shell scripts by **introspecting Commander's registered command tree at runtime**. That means:

- New commands (including plugin-registered ones) complete automatically — no generator edits required.
- Flags with a defined set of valid values (e.g. `.choices(["table", "json", ...])`) surface those values via TAB.
- Global flags (`--app`, `--profile`, `--output`, `--ci`, `--json`, etc.) complete in every context.

### Dynamic values (v0.9.60+)

The generated bash, zsh, and fish scripts shell out to a hidden `gpc __complete` subcommand at TAB time to populate four flag slots with live values:

| Flag                      | Values                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `--profile` / `-p`        | Profile names defined in your config                                                   |
| `--app` / `-a` / `--apps` | App packages from your config + cached `gpc status` data                               |
| `--track`                 | `production`, `beta`, `alpha`, `internal` plus any custom tracks seen in cached status |

The handler is lazy-loaded and reads only filesystem config (no API calls, no auth). If you've never run `gpc status` for an app, cache-backed values are empty and completion falls back silently — no errors, no delay.

### Homebrew auto-install

`brew install yasserstudio/tap/gpc` installs completion files for bash, zsh, and fish automatically. No `eval` step required. Restart your shell (or run `compinit` / `exec zsh`) to pick them up.

### Manual install

Regenerate your completion file after upgrading GPC so the script matches the installed version.

---

## `completion bash`

Generate bash shell completions. Pipe the output to your bash completions directory or source it directly.

### Synopsis

```bash
gpc completion bash
```

### Options

No command-specific options.

### Example

Add to your `.bashrc`:

```bash
eval "$(gpc completion bash)"
```

Or save to completions directory:

```bash
gpc completion bash > /etc/bash_completion.d/gpc
```

Or for user-local completions:

```bash
mkdir -p ~/.local/share/bash-completion/completions
gpc completion bash > ~/.local/share/bash-completion/completions/gpc
```

---

## `completion zsh`

Generate zsh shell completions.

### Synopsis

```bash
gpc completion zsh
```

### Options

No command-specific options.

### Example

Add to your `.zshrc`:

```bash
eval "$(gpc completion zsh)"
```

Or save to your fpath:

```bash
gpc completion zsh > "${fpath[1]}/_gpc"
```

Or for Oh My Zsh users:

```bash
gpc completion zsh > ~/.oh-my-zsh/completions/_gpc
```

---

## `completion fish`

Generate fish shell completions.

### Synopsis

```bash
gpc completion fish
```

### Options

No command-specific options.

### Example

Save to fish completions directory:

```bash
gpc completion fish > ~/.config/fish/completions/gpc.fish
```

Or load for the current session:

```bash
gpc completion fish | source
```

## Related

- [auth](./auth) -- Fix authentication issues flagged by doctor
- [config](./config) -- Fix configuration issues flagged by doctor
- [Installation Guide](/guide/installation) -- Initial setup
