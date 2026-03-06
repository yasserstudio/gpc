# CLI Commands Reference

## Command Structure

```
gpc <domain> <action> [options]
```

**Global Flags:**

| Flag | Short | Description |
|------|-------|-------------|
| `--output` | `-o` | Output format: `table` (default TTY), `json` (default pipe), `yaml`, `markdown` |
| `--quiet` | `-q` | Suppress non-essential output |
| `--verbose` | `-v` | Enable debug logging |
| `--profile` | `-p` | Use named auth profile |
| `--app` | `-a` | App package name (overrides config) |
| `--no-color` | | Disable colored output |
| `--no-interactive` | | Disable interactive prompts |
| `--limit` | | Max results per page |
| `--next-page` | | Pagination token for next page |
| `--retry-log` | | Log retry attempts to file |
| `--config` | | Path to config file |
| `--version` | `-V` | Show version |
| `--help` | `-h` | Show help |

**Output Behavior:**
- **TTY (terminal):** Defaults to `table` — human-readable formatted output
- **Non-TTY (pipe/CI):** Defaults to `json` — machine-parseable, auto-detected
- `--output` flag overrides auto-detection in both cases
- `markdown` format useful for GitHub Actions step summaries (`$GITHUB_STEP_SUMMARY`)

---

## Auth Commands

```bash
gpc auth login                        # Interactive OAuth login
gpc auth login --service-account key.json  # Service account setup
gpc auth logout                       # Revoke and clear credentials
gpc auth status                       # Show current auth state
gpc auth profiles                     # List configured profiles
gpc auth switch <profile>             # Switch active profile
gpc auth whoami                       # Show current identity
```

## App Commands

```bash
gpc apps list                         # List all apps in account
gpc apps info <package>               # Show app details
gpc apps info <package> --json        # JSON output for scripting
```

## Release Commands

```bash
# Upload
gpc releases upload <file>            # Upload AAB/APK
gpc releases upload <file> --track internal
gpc releases upload <file> --track production --rollout 10

# Status
gpc releases status                   # Current release status across tracks
gpc releases status --track production

# Promote
gpc releases promote --from internal --to beta
gpc releases promote --from beta --to production --rollout 5

# Rollout management
gpc releases rollout increase --track production --to 50
gpc releases rollout halt --track production
gpc releases rollout resume --track production
gpc releases rollout complete --track production

# Release notes
gpc releases notes set --track beta --lang en-US --notes "Bug fixes"
gpc releases notes set --track beta --file release-notes/
```

## Track Commands

```bash
gpc tracks list                       # List all tracks
gpc tracks get <track>                # Show track details + releases
gpc tracks create <name>              # Create custom track
```

## Listing / Metadata Commands

```bash
# View
gpc listings get                      # Default language listing
gpc listings get --lang ja-JP         # Specific language
gpc listings get --all-languages      # All languages

# Update
gpc listings update --lang en-US --title "My App" --short-desc "..."
gpc listings update --lang en-US --file metadata/en-US/

# Sync (bidirectional)
gpc listings pull --dir metadata/     # Download all listings to local
gpc listings push --dir metadata/     # Upload local listings to Play Console

# Images
gpc listings images list --lang en-US --type phoneScreenshots
gpc listings images upload --lang en-US --type phoneScreenshots ./screens/*.png
gpc listings images delete --lang en-US --type phoneScreenshots --id <id>
```

## Review Commands

```bash
gpc reviews list                      # Recent reviews
gpc reviews list --stars 1-2          # Filter by rating
gpc reviews list --lang en            # Filter by language
gpc reviews list --since 7d           # Filter by time
gpc reviews get <review-id>           # Single review details
gpc reviews reply <review-id> "Thank you for your feedback"
gpc reviews reply <review-id> --file reply.txt
gpc reviews export --format csv --output reviews.csv
```

## Subscription Commands

```bash
gpc subscriptions list
gpc subscriptions get <product-id>
gpc subscriptions create --file subscription.json
gpc subscriptions update <product-id> --file subscription.json
gpc subscriptions base-plans list <product-id>
gpc subscriptions offers list <product-id> <base-plan-id>
```

## In-App Product Commands

```bash
gpc iap list
gpc iap get <sku>
gpc iap create --file product.json
gpc iap update <sku> --file product.json
gpc iap delete <sku>
gpc iap sync --dir products/          # Bulk sync from local files
```

## Vitals Commands

```bash
gpc vitals overview                   # Summary dashboard
gpc vitals crashes                    # Crash rate and clusters
gpc vitals crashes --version 42       # Filter by version code
gpc vitals anr                        # ANR rate and clusters
gpc vitals startup                    # Cold/warm start times
gpc vitals rendering                  # Frame rate metrics
gpc vitals battery                    # Battery usage stats
gpc vitals size                       # App size metrics
gpc vitals permissions                # Permission denials
```

## Report Commands

```bash
gpc reports list                      # Available reports
gpc reports download financial --month 2026-02
gpc reports download stats --month 2026-02 --dimension country
gpc reports download stats --type installs --since 30d
```

## Testers Commands

```bash
gpc testers list --track internal
gpc testers add --track internal user@example.com
gpc testers add --track internal --file testers.csv
gpc testers remove --track internal user@example.com
gpc testers groups list
gpc testers groups create "Beta Team"
```

## User / Permission Commands

```bash
gpc users list                        # Developer account users
gpc users get <email>
gpc users invite <email> --role admin
gpc users update <email> --add-app com.example.app
gpc users remove <email>
```

## Config Commands

```bash
gpc config init                       # Create config file interactively
gpc config show                       # Display resolved config
gpc config set app com.example.app    # Set default app
gpc config set profile production     # Set default profile
gpc config path                       # Show config file location
```

## High-Level Workflow Commands

```bash
gpc publish <file>                    # End-to-end: upload + assign track + release notes + commit
gpc publish <file> --track beta --notes "Bug fixes"
gpc validate                          # Pre-submission checks (metadata, screenshots, bundle)
gpc status                            # Cross-track release overview for current app
gpc diff --from 141 --to 142         # Compare two version codes (track, rollout, notes)
```

## Utility Commands

```bash
gpc completion bash                   # Generate bash completions
gpc completion zsh                    # Generate zsh completions
gpc completion fish                   # Generate fish completions
gpc doctor                            # Verify setup and connectivity
gpc docs                              # Open documentation in browser
gpc update                            # Check for updates
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Usage error (bad arguments) |
| `3` | Authentication error |
| `4` | API error (rate limit, permission, etc.) |
| `5` | Network error |
| `10` | Plugin error |

## JSON Output Contract

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GPC_SERVICE_ACCOUNT` | Service account JSON string or file path | — |
| `GPC_APP` | Default package name | — |
| `GPC_PROFILE` | Auth profile name | — |
| `GPC_OUTPUT` | Default output format | `table` (TTY) / `json` (pipe) |
| `GPC_NO_COLOR` | Disable color output | — |
| `GPC_NO_INTERACTIVE` | Disable prompts | Auto in CI |
| `GPC_SKIP_KEYCHAIN` | Skip OS keychain, use file storage | — |
| `GPC_MAX_RETRIES` | Max retry attempts on transient errors | `3` |
| `GPC_TIMEOUT` | Request timeout in milliseconds | `30000` |
| `GPC_BASE_DELAY` | Base retry delay in milliseconds | `1000` |
| `GPC_MAX_DELAY` | Max retry delay in milliseconds | `60000` |
| `GPC_RATE_LIMIT` | Requests per second | `50` |
| `GPC_CA_CERT` | Custom CA certificate path | — |
| `HTTPS_PROXY` | HTTP proxy URL | — |

## Output Contract

All commands return structured output. Format depends on TTY detection or `--output` flag:

- **table** — human-readable tables and lists (TTY default)
- **json** — machine-parseable JSON (pipe default)
- **yaml** — YAML output
- **markdown** — Markdown tables (for `$GITHUB_STEP_SUMMARY`)

JSON output always follows this contract:

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "command": "releases status",
    "timestamp": "2026-03-06T12:00:00Z",
    "duration_ms": 342
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "Access token has expired",
    "suggestion": "Run 'gpc auth login' to re-authenticate"
  }
}
```
