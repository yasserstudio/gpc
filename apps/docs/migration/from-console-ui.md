---
outline: deep
---

# Migrate from Play Console UI

Map common Google Play Console browser tasks to GPC CLI commands. Every operation you do in the Play Console web UI has a CLI equivalent that can be automated, scripted, and version-controlled.

## Why Use the CLI?

|                 | Play Console UI                       | GPC CLI                     |
| --------------- | ------------------------------------- | --------------------------- |
| Automation      | Manual, browser-based                 | Scriptable, CI/CD native    |
| Reproducibility | Click-by-click, error-prone           | Same commands, same results |
| Speed           | 15+ minutes for multi-step operations | Seconds                     |
| Audit trail     | Limited browser history               | JSON logs with timestamps   |
| Quality gates   | Manual review                         | Automated threshold checks  |
| Multi-app       | Switch apps manually                  | Loop with `--app` flag      |
| Review          | No preview                            | `--dry-run` before applying |

## Task Mapping

### Releases

| Play Console UI                     | GPC Command                                                            | Notes                                       |
| ----------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| Upload AAB in "Create new release"  | `gpc releases upload app.aab --track internal`                         | Specify track with `--track`                |
| Create release with notes           | `gpc publish app.aab --track beta --notes "Bug fixes"`                 | End-to-end: upload + track + notes + commit |
| View release status                 | `gpc status`                                                           | Cross-track overview                        |
| View specific track                 | `gpc releases status --track production`                               | Single track details                        |
| Promote internal to beta            | `gpc releases promote --from internal --to beta`                       |                                             |
| Promote beta to production (staged) | `gpc releases promote --from beta --to production --rollout 10`        | Starts at 10%                               |
| Increase rollout percentage         | `gpc releases rollout increase --track production --to 50`             |                                             |
| Halt rollout                        | `gpc releases rollout halt --track production`                         | Stops serving new installs                  |
| Resume halted rollout               | `gpc releases rollout resume --track production`                       |                                             |
| Complete rollout to 100%            | `gpc releases rollout complete --track production`                     |                                             |
| Add release notes                   | `gpc releases notes set --track beta --lang en-US --notes "Bug fixes"` | Per-language                                |
| Add multi-language notes            | `gpc releases notes set --track beta --file release-notes/`            | Directory of lang files                     |

### Store Listing and Metadata

| Play Console UI                         | GPC Command                                                                       | Notes                      |
| --------------------------------------- | --------------------------------------------------------------------------------- | -------------------------- |
| Edit store listing (title, description) | `gpc listings update --lang en-US --title "My App" --short-desc "..."`            |                            |
| Edit listing from files                 | `gpc listings update --lang en-US --file metadata/en-US/`                         | Reads title.txt, etc.      |
| View current listing                    | `gpc listings get`                                                                | Default language           |
| View all language listings              | `gpc listings get --all-languages`                                                |                            |
| Download all listings to files          | `gpc listings pull --dir metadata/`                                               | Fastlane-compatible format |
| Upload listings from files              | `gpc listings push --dir metadata/`                                               |                            |
| Preview listing changes                 | `gpc listings push --dir metadata/ --dry-run`                                     | Diff without applying      |
| Upload screenshots                      | `gpc listings images upload --lang en-US --type phoneScreenshots ./screens/*.png` |                            |
| View screenshots                        | `gpc listings images list --lang en-US --type phoneScreenshots`                   |                            |
| Delete screenshot                       | `gpc listings images delete --lang en-US --type phoneScreenshots --id <id>`       |                            |

### Reviews

| Play Console UI    | GPC Command                                                   | Notes              |
| ------------------ | ------------------------------------------------------------- | ------------------ |
| View reviews       | `gpc reviews list`                                            | All recent reviews |
| Filter by rating   | `gpc reviews list --stars 1-2`                                | Low ratings only   |
| Filter by date     | `gpc reviews list --since 7d`                                 | Last 7 days        |
| View single review | `gpc reviews get <review-id>`                                 | Full details       |
| Reply to review    | `gpc reviews reply <review-id> "Thank you for your feedback"` | 350 char limit     |
| Export reviews     | `gpc reviews export --format csv --output reviews.csv`        | CSV or JSON        |

### App Vitals

| Play Console UI       | GPC Command                           | Notes                   |
| --------------------- | ------------------------------------- | ----------------------- |
| View vitals overview  | `gpc vitals overview`                 | Dashboard summary       |
| Check crash rate      | `gpc vitals crashes`                  | Rate and clusters       |
| Check ANR rate        | `gpc vitals anr`                      |                         |
| Check startup time    | `gpc vitals startup`                  | Cold and warm start     |
| Check frame rendering | `gpc vitals rendering`                | Slow frames             |
| Check battery impact  | `gpc vitals battery`                  | Wakeups and wakelocks   |
| Check memory issues   | `gpc vitals memory`                   | Low memory killer rate  |
| View anomalies        | `gpc vitals anomalies`                | Detected anomalies      |
| Compare weeks         | `gpc vitals compare crashes --days 7` | This week vs last       |
| CI quality gate       | `gpc vitals crashes --threshold 2.0`  | Exit code 6 if breached |

### Monetization

| Play Console UI       | GPC Command                                              | Notes            |
| --------------------- | -------------------------------------------------------- | ---------------- |
| View subscriptions    | `gpc subscriptions list`                                 |                  |
| Create subscription   | `gpc subscriptions create --file subscription.json`      |                  |
| Edit subscription     | `gpc subscriptions update <id> --file subscription.json` |                  |
| View base plans       | `gpc subscriptions base-plans list <id>`                 |                  |
| View offers           | `gpc subscriptions offers list <id> <plan-id>`           |                  |
| View in-app products  | `gpc iap list`                                           |                  |
| Create in-app product | `gpc iap create --file product.json`                     |                  |
| Bulk sync products    | `gpc iap sync --dir products/`                           | From local files |
| Convert pricing       | `gpc pricing convert --from USD --amount 9.99`           | Regional prices  |

### Purchases and Orders

| Play Console UI            | GPC Command                                 | Notes                |
| -------------------------- | ------------------------------------------- | -------------------- |
| View order details         | `gpc purchases get <token>`                 | Product purchase     |
| View subscription purchase | `gpc purchases subscription get <token>`    | Subscription details |
| Refund order               | `gpc orders refund <order-id>`              |                      |
| View voided purchases      | `gpc purchases voided list`                 | Last 30 days         |
| Cancel subscription        | `gpc purchases subscription cancel <token>` |                      |

### Financial Reports

| Play Console UI          | GPC Command                                                  | Notes |
| ------------------------ | ------------------------------------------------------------ | ----- |
| Download earnings report | `gpc reports download financial --month 2026-02`             |       |
| Download install stats   | `gpc reports download stats --month 2026-02 --type installs` |       |
| Download crash stats     | `gpc reports download stats --month 2026-02 --type crashes`  |       |

### Users and Testers

| Play Console UI       | GPC Command                                                                            | Notes    |
| --------------------- | -------------------------------------------------------------------------------------- | -------- |
| View team members     | `gpc users list --developer-id <id>`                                                   |          |
| Invite team member    | `gpc users invite user@example.com --developer-id <id> --role ADMIN`                   |          |
| Update permissions    | `gpc users update user@example.com --developer-id <id> --role CAN_VIEW_FINANCIAL_DATA` |          |
| Remove team member    | `gpc users remove user@example.com --developer-id <id>`                                |          |
| View testers on track | `gpc testers list --track internal`                                                    |          |
| Add testers           | `gpc testers add user@example.com --track internal`                                    |          |
| Remove testers        | `gpc testers remove user@example.com --track internal`                                 |          |
| Bulk add testers      | `gpc testers import --track internal --file testers.csv`                               | From CSV |

### App Overview

| Play Console UI    | GPC Command                       | Notes |
| ------------------ | --------------------------------- | ----- |
| View all apps      | `gpc apps list`                   |       |
| View app details   | `gpc apps info com.example.myapp` |       |
| View all tracks    | `gpc tracks list`                 |       |
| View track details | `gpc tracks get production`       |       |

## Common Workflows

### Weekly Release (UI workflow automated)

Instead of clicking through the Console every week:

```bash
#!/bin/bash
# weekly-release.sh — Automates the weekly release workflow
set -euo pipefail

APP="com.example.myapp"

# Build
./gradlew bundleRelease

# Upload to internal
gpc releases upload \
  app/build/outputs/bundle/release/app-release.aab \
  --app $APP \
  --track internal \
  --notes "Weekly build $(date +%Y-%m-%d)" \
  --json

# Promote to beta after internal testing
gpc releases promote --app $APP --from internal --to beta --json

echo "Release uploaded to internal and promoted to beta."
```

### Review Triage (daily task automated)

Instead of manually checking reviews:

```bash
#!/bin/bash
# review-triage.sh — Daily review check
set -euo pipefail

echo "=== Low-rated reviews (last 24h) ==="
gpc reviews list --stars 1-2 --since 24h --json | \
  jq -r '.data.reviews[] | "[\(.stars)] \(.text[:120])..."'

echo ""
echo "=== Vitals summary ==="
gpc vitals overview --json | \
  jq -r '.data | to_entries[] | "  \(.key): \(.value)"'
```

### Multi-App Release

Instead of switching between apps in the Console:

```bash
#!/bin/bash
# release-all.sh
APPS=("com.example.app1" "com.example.app2" "com.example.app3")

for app in "${APPS[@]}"; do
  echo "Releasing $app..."
  gpc releases upload "builds/${app}/app-release.aab" \
    --app "$app" \
    --track internal \
    --json
done
```

## Getting Started

1. **Install GPC**

   ```bash
   npm install -g @gpc-cli/cli
   ```

2. **Authenticate**

   ```bash
   # With a service account key (recommended for CI)
   gpc auth login --service-account path/to/key.json

   # Or set via environment variable
   export GPC_SERVICE_ACCOUNT=path/to/key.json
   ```

3. **Set your default app**

   ```bash
   gpc config set app com.example.myapp
   ```

4. **Verify setup**

   ```bash
   gpc doctor
   ```

5. **Try a read-only command**

   ```bash
   gpc apps list
   gpc status
   gpc reviews list
   ```

6. **Try a safe write command**

   ```bash
   # Preview metadata changes without pushing
   gpc listings push --dir metadata/ --dry-run
   ```
