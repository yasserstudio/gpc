# Managing Multiple Developer Accounts

A walkthrough for teams and individuals who manage more than one Google Play developer account with GPC: agencies, consultants, multi-customer SaaS vendors, and anyone juggling staging + production accounts. Covers the profile model, key management at scale, CI/CD patterns per customer, and the limits of the current implementation.

::: tip Prerequisites
This page assumes you've already set up basic auth for at least one account. For the single-account walkthrough, see [Authentication](./authentication.md). For the full config file format, see [Configuration](./configuration.md). For the per-command flag reference, see [`gpc auth`](../commands/auth.md).
:::

## The mental model

GPC's **profile** is a named bundle of three things:

1. An **auth context** (usually a service account JSON file path)
2. A **default app** (package name)
3. A **developer ID** (the int64 from the Play Console URL)

Each profile is independent. Switching profiles swaps all three at once. A profile does not inherit values from another profile — they're siblings, not a hierarchy.

**One profile per developer account** is the right unit of separation for most teams. If you manage three developer accounts, create three profiles. If you manage twenty customer accounts as an agency, create twenty profiles. The config file scales to however many you need.

If you only manage **multiple apps under the same developer account**, you don't need multiple profiles — use `--app <package>` per command instead. Profiles solve the account-switching problem, not the app-switching problem.

## When to use profiles

| Scenario | Pattern |
|---|---|
| One person, one developer account, many apps | Single profile + `--app` flag per command |
| One person, multiple developer accounts (staging + production) | Profile per account |
| Agency/consultant with N customer accounts | Profile per customer |
| Multi-customer SaaS shipping a per-customer build | Profile per customer, CI job per customer |
| One team, one account, multiple humans | Shared config file OR one profile per human (different service accounts for audit trail) |
| CI publishing to multiple accounts | Profile per account, `GPC_PROFILE` env var per job |

## Creating multiple profiles

Each profile is set up the same way as a single profile. You just run `gpc auth login` once per account with a different `--profile` flag:

```bash
# Your personal developer account
gpc auth login \
  --service-account ~/.config/gpc/keys/personal-sa.json \
  --profile personal

# A work account
gpc auth login \
  --service-account ~/.config/gpc/keys/work-sa.json \
  --profile work

# A customer account (for agencies/consultants)
gpc auth login \
  --service-account ~/.config/gpc/keys/acme-sa.json \
  --profile client-acme
```

Each command writes a new entry to `~/.config/gpc/config.json` under `profiles.<name>`. Afterwards, `gpc auth profiles` lists all of them:

```bash
gpc auth profiles
```

```
Profiles:

  * personal     you@personal-proj.iam.gserviceaccount.com  (active)
    work         gpc-bot@work-proj.iam.gserviceaccount.com
    client-acme  deploy@acme-proj.iam.gserviceaccount.com
```

## The three ways to select a profile

Ordered from most-specific (wins) to least-specific (default):

### 1. `--profile` flag on the command (per-command override)

```bash
gpc --profile client-acme releases upload app.aab --track production
```

Use this for one-off operations against a profile that isn't your active default. The flag is global — always put it **before** the subcommand, not after.

### 2. `GPC_PROFILE` environment variable (per-shell or per-CI-job)

```bash
export GPC_PROFILE=client-acme
gpc releases upload app.aab --track production
gpc vitals crashes --threshold 2.0
gpc reviews list --since 7d
```

Every command in the shell inherits the profile until you unset `GPC_PROFILE` or set a different value. This is the CI/CD pattern — each GitHub Actions job sets `GPC_PROFILE` in its `env:` block and every GPC step in the job uses it automatically.

### 3. Active profile in the config file (persistent default)

```bash
gpc auth switch client-acme
```

Writes `"profile": "client-acme"` to your config file. Every subsequent command uses this profile until you `auth switch` to a different one. Good for human-at-the-terminal workflows where you stay in one customer for an hour at a time.

### Precedence order

If more than one is set, GPC picks the most specific:

1. `--profile <name>` flag (highest priority — overrides everything)
2. `GPC_PROFILE` env var (overrides config)
3. `profile` key in config file (default)
4. Nothing — falls back to the top-level config fields (no profile override)

::: warning --profile requires v0.9.55+
Versions before v0.9.55 defined `--profile` as a flag but silently ignored it. The config loader never propagated the flag to the resolution layer. If you're on v0.9.54 or earlier and the flag appears to do nothing, that's the bug — upgrade to v0.9.55 or later.
:::

## Service account key management at scale

Each profile needs its own service account JSON key. Managing 2-3 keys is easy. Managing 20+ keys across customers needs a system.

### Directory convention

Store keys in `~/.config/gpc/keys/` with one file per account, named by profile:

```
~/.config/gpc/keys/
├── personal-sa.json
├── work-sa.json
├── client-acme-sa.json
├── client-beta-sa.json
└── client-gamma-sa.json
```

Lock the directory to your user only:

```bash
chmod 700 ~/.config/gpc/keys
chmod 600 ~/.config/gpc/keys/*.json
```

Each key file is a plain Google service account JSON (the one you download from Google Cloud when you create the account). GPC does not transform, encrypt, or re-serialize them.

### Never commit keys to git

Your `.gitignore` should always contain:

```
# GPC keys — never commit
*-sa.json
**/keys/
.gpcrc-cache.json
```

If a service account JSON ends up in a git repo, revoke it immediately via Google Cloud Console. Treat it as if a production secret leaked, because it is one.

### Key rotation

Rotate service account keys on a schedule (Google recommends every 90 days for high-value accounts). For each profile:

1. Generate a new key in Google Cloud Console for the service account
2. Download the JSON and save to `~/.config/gpc/keys/<profile>-sa.json` (overwriting the old file)
3. Delete the old key in Google Cloud Console (wait a few minutes after the new one is in place to avoid a race)
4. Run `gpc doctor --profile <name>` to verify the new key works
5. If anything's wrong, revert the file and investigate before deleting the old key

GPC does not currently automate rotation. If you have 20+ profiles, you'll want to script this or use a secret manager (see below).

### Secret manager integration

GPC reads service account keys from the filesystem at the path listed in the profile config. If your team uses a secret manager (1Password, AWS Secrets Manager, HashiCorp Vault, sops-encrypted files), write a wrapper that materializes the key to a temp path before invoking GPC:

```bash
#!/bin/bash
# gpc-with-vault — run GPC with a secret-manager-sourced key

set -euo pipefail

PROFILE=$1
shift

KEY_FILE=$(mktemp -t "gpc-sa-${PROFILE}.XXXXXX.json")
trap 'rm -f "$KEY_FILE"' EXIT

# Example: sops-encrypted files
sops --decrypt "$HOME/.config/gpc/keys/${PROFILE}-sa.enc.json" > "$KEY_FILE"

GPC_SERVICE_ACCOUNT="$KEY_FILE" gpc --profile "$PROFILE" "$@"
```

Then usage:

```bash
gpc-with-vault client-acme releases upload app.aab --track production
```

The `GPC_SERVICE_ACCOUNT` env var takes precedence over the profile's config-file path, so this pattern works without modifying any GPC config.

## CI/CD patterns for multi-account

### Pattern 1: One workflow per customer

Simplest. Each customer has its own workflow file and its own `GPC_PROFILE` in the job env. Service account JSON is pulled from a repository secret.

```yaml
# .github/workflows/publish-client-acme.yml
name: Publish (Client Acme)
on:
  workflow_dispatch:
  push:
    tags: ['client-acme-v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    env:
      GPC_PROFILE: client-acme
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - run: npm install -g @gpc-cli/cli

      - name: Write service account
        run: |
          mkdir -p ~/.config/gpc/keys
          echo '${{ secrets.GPC_SA_CLIENT_ACME }}' > ~/.config/gpc/keys/client-acme-sa.json
          chmod 600 ~/.config/gpc/keys/client-acme-sa.json

      - name: Write profile config
        run: |
          mkdir -p ~/.config/gpc
          cat > ~/.config/gpc/config.json <<EOF
          {
            "profiles": {
              "client-acme": {
                "auth": { "serviceAccount": "~/.config/gpc/keys/client-acme-sa.json" },
                "app": "com.clientacme.app"
              }
            }
          }
          EOF

      - run: gpc doctor
      - run: gpc releases upload app.aab --track production
```

Duplicate this file per customer. The GitHub secret `GPC_SA_CLIENT_ACME` holds the raw JSON string of the service account key.

### Pattern 2: One workflow, matrix of customers

If customers share a release cadence (or you run a nightly sync across all of them), use a matrix strategy. Each matrix entry becomes a separate job with its own profile.

```yaml
name: Nightly sync (all customers)
on:
  schedule:
    - cron: "0 2 * * *"

jobs:
  sync:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        customer:
          - { name: acme,  secret: GPC_SA_CLIENT_ACME,  app: com.clientacme.app }
          - { name: beta,  secret: GPC_SA_CLIENT_BETA,  app: com.clientbeta.app }
          - { name: gamma, secret: GPC_SA_CLIENT_GAMMA, app: com.clientgamma.app }
    env:
      GPC_PROFILE: client-${{ matrix.customer.name }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm install -g @gpc-cli/cli

      - name: Write service account
        run: |
          mkdir -p ~/.config/gpc/keys
          echo '${{ secrets[matrix.customer.secret] }}' > ~/.config/gpc/keys/current-sa.json
          chmod 600 ~/.config/gpc/keys/current-sa.json

      - name: Write profile config
        run: |
          mkdir -p ~/.config/gpc
          cat > ~/.config/gpc/config.json <<EOF
          {
            "profiles": {
              "client-${{ matrix.customer.name }}": {
                "auth": { "serviceAccount": "~/.config/gpc/keys/current-sa.json" },
                "app": "${{ matrix.customer.app }}"
              }
            }
          }
          EOF

      - name: Sync metadata
        run: gpc listings push --dir ./metadata/${{ matrix.customer.name }}

      - name: Check vitals
        run: gpc vitals crashes --threshold 2.0
```

`fail-fast: false` ensures one customer's failure doesn't abort the others. Each matrix job runs in its own runner with its own profile, so there's no cross-contamination of auth state.

### Pattern 3: Single job, loop over profiles

For long-running scheduled sweeps (audit logs, vitals reports, batch operations), run GPC in a loop inside one job. Each iteration switches profiles via the env var.

```yaml
name: Weekly vitals report (all customers)
on:
  schedule:
    - cron: "0 8 * * 1"

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm install -g @gpc-cli/cli

      - name: Write all service accounts
        run: |
          mkdir -p ~/.config/gpc/keys
          echo '${{ secrets.GPC_SA_CLIENT_ACME }}' > ~/.config/gpc/keys/client-acme-sa.json
          echo '${{ secrets.GPC_SA_CLIENT_BETA }}' > ~/.config/gpc/keys/client-beta-sa.json
          chmod 600 ~/.config/gpc/keys/*.json

      - name: Write multi-profile config
        run: |
          mkdir -p ~/.config/gpc
          cat > ~/.config/gpc/config.json <<'EOF'
          {
            "profiles": {
              "client-acme": {
                "auth": { "serviceAccount": "~/.config/gpc/keys/client-acme-sa.json" },
                "app": "com.clientacme.app"
              },
              "client-beta": {
                "auth": { "serviceAccount": "~/.config/gpc/keys/client-beta-sa.json" },
                "app": "com.clientbeta.app"
              }
            }
          }
          EOF

      - name: Run report for each customer
        run: |
          for profile in client-acme client-beta; do
            echo "=== $profile ==="
            GPC_PROFILE=$profile gpc vitals crashes --days 7 --output json > report-$profile.json
          done
```

This pattern is more efficient for small operations (no per-customer job overhead) but blocks the whole report on the slowest customer.

## Permission model — what each service account needs

Every service account needs access granted in **each developer account's Play Console** (not just Google Cloud IAM). Google Cloud IAM controls whether the service account itself exists; Play Console controls what that service account can do inside each developer account.

For each profile's service account:

1. Open **Play Console** → **Users and permissions**
2. Click **Invite new users**
3. Enter the service account's email (the one ending in `.iam.gserviceaccount.com`)
4. Grant **Account permissions** appropriate to what GPC needs to do:
   - **View app information and download bulk reports** — required for everything
   - **View financial data, orders, and cancellation survey responses** — required for `gpc reports download financial`
   - **Manage store presence (listings, pricing, distribution)** — required for `gpc listings push`, `gpc iap`, `gpc subscriptions`
   - **Release to production, exclude devices, and use Play App Signing** — required for `gpc releases promote --to production` and `gpc releases rollout`
   - **Release apps to testing tracks** — required for `gpc releases upload --track internal` / `alpha` / `beta`
   - **Reply to reviews** — required for `gpc reviews reply`
   - **Manage testers** — required for `gpc testers add` / `gpc testers remove`
   - **Create and publish private apps** (v0.9.56+) — required for `gpc enterprise publish` / `gpc enterprise create`
5. Optionally grant **App permissions** for specific apps in the account (more granular than Account permissions)
6. Save

**Per account, per service account.** If your service account needs access to three developer accounts, you invite it three times — once into each Play Console. The Google Cloud IAM side does not propagate.

Run `gpc doctor --profile <name>` after granting permissions to confirm each profile's service account has the access it needs. The doctor check surfaces specific missing permissions with a clear error message.

## Gotchas and limitations

### Token caching is per-profile

GPC caches OAuth tokens in `~/.config/gpc/cache/` with the profile name in the path. Switching profiles clears the in-memory token and the next API call fetches a new one. There's no shared token pool across profiles — which is the right behavior for isolation but means the first command after a profile switch has a ~200-500ms auth round trip.

### No "all profiles at once" command

There is no `gpc --profile a,b,c releases upload ...` that runs a command across multiple profiles in parallel. For bulk operations, use the CI matrix pattern or write a shell loop with `GPC_PROFILE=<name>` per iteration.

### Config file profile isolation is not strict

A profile's `auth`, `app`, and `developerId` override the top-level equivalents, but any config field NOT in `ProfileConfig` (plugins, webhooks, debug flag, output format, approvedPlugins) is shared across all profiles. If profile A needs a different plugin list from profile B, that's not supported today.

### No auto-discovery based on directory

GPC does not detect "you're in customer-acme/ so use profile client-acme" unless you commit a `.gpcrc.json` to that directory with `"profile": "client-acme"` set. There's no filesystem-walk-up-and-match convention.

### No profile inheritance

If you want 20 customer profiles that all share the same default track and output format, you can't set those once in a "base" profile and inherit. Each profile is independent. You'd either repeat the config or set the defaults at the top-level and omit them from individual profiles.

### Profile name conflicts with the reserved name `default`

Historically GPC used `default` as the implicit profile name when none was specified. If you create a profile named `default`, it works, but some docs and error messages may refer to "default" in both senses. Avoid naming profiles `default` to prevent confusion.

### Service account files referenced by `~/` paths

The config file supports `~/` in `serviceAccount` paths, and GPC expands it at load time. If you're sharing config files across machines with different home directories, prefer absolute paths or environment variable interpolation (set `GPC_SERVICE_ACCOUNT` per invocation instead of hardcoding a path).

## Quick reference

```bash
# Create a new profile from a service account key
gpc auth login --service-account /path/to/sa.json --profile <name>

# List all profiles
gpc auth profiles

# Switch active profile (persistent)
gpc auth switch <name>

# Run one command against a different profile
gpc --profile <name> <command>

# Run a shell session against a profile via env var
export GPC_PROFILE=<name>
gpc <command>           # uses <name>
gpc <command>           # also uses <name>

# Verify a profile's setup (auth, API access, app visibility)
gpc doctor --profile <name>

# Show current profile and identity
gpc auth whoami

# Full status (profile, identity, method, token validity, scopes)
gpc auth status

# Remove a profile
gpc auth logout --profile <name>
```

## Related

- [Authentication](./authentication.md) — single-profile setup, OAuth, ADC, per-profile commands
- [Configuration](./configuration.md) — config file format, environment variables, precedence
- [`gpc auth`](../commands/auth.md) — per-command flag reference for all auth subcommands
- [Enterprise Publishing](./enterprise-publishing.md) — multi-account is especially relevant for agencies that manage private apps for multiple enterprise customers
- [CI/CD recipes](../ci-cd/) — more automation patterns, some of which overlap with multi-account
- `gpc-multi-app` agent skill — AI-assisted walkthrough of these workflows (installed via `gpc install-skills`)
