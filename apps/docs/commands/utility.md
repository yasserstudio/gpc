---
outline: deep
---

# doctor / docs / completion

Utility commands for environment verification, documentation access, and shell completions.

## Commands

| Command                               | Description                   |
| ------------------------------------- | ----------------------------- |
| [`doctor`](#gpc-doctor)               | Verify setup and connectivity |
| [`docs`](#gpc-docs)                   | Open documentation in browser |
| [`completion bash`](#completion-bash) | Generate bash completions     |
| [`completion zsh`](#completion-zsh)   | Generate zsh completions      |
| [`completion fish`](#completion-fish) | Generate fish completions     |

## `gpc doctor`

Run diagnostic checks to verify your GPC setup end-to-end.

### Synopsis

```bash
gpc doctor [--json]
```

### Options

| Flag | Description |
| --- | --- |
| `--json` | Output results as machine-readable JSON |

### Checks performed

| Check | What it verifies |
| --- | --- |
| `node` | Node.js ≥ 20 |
| `config` | Config file loads without errors |
| `default-app` | A default package name is configured |
| `package-name` | Package name matches Android naming rules |
| `config-dir` | Config directory is readable and writable |
| `cache-dir` | Cache directory is readable and writable |
| `service-account-file` | SA key file exists and is readable (if configured) |
| `service-account-permissions` | SA key file is not group/world-readable (Unix) |
| `profile` | `GPC_PROFILE` env var points to a known profile |
| `proxy` | Proxy URL is valid (if `HTTPS_PROXY` etc. are set) |
| `ca-cert` | CA cert file exists (if `GPC_CA_CERT` is set) |
| `dns` | Both API endpoints resolve: `androidpublisher.googleapis.com` and `playdeveloperreporting.googleapis.com` |
| `auth` | Credentials load and authenticate successfully |
| `api-connectivity` | Access token can be obtained from Google |

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

---

## `gpc docs`

Open the GPC documentation in your default browser. Optionally navigate directly to a specific topic page.

### Synopsis

```bash
gpc docs [topic] [--list]
```

### Options

| Flag | Description |
| --- | --- |
| `[topic]` | Topic name to open directly (see list below) |
| `--list` | Print all available topics and exit |

### Available Topics

| Topic | Opens |
| --- | --- |
| `releases` | commands/releases |
| `status` | commands/status |
| `vitals` | commands/vitals |
| `reviews` | commands/reviews |
| `listings` | commands/listings |
| `subscriptions` | commands/subscriptions |
| `bundle` | commands/bundle |
| `users` | commands/users |
| `audit` | commands/audit |
| `config` | commands/config |
| `doctor` | commands/doctor |
| `publish` | commands/publish |

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
