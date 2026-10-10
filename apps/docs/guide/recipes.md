---
outline: deep
---

# Recipes

Copy-pasteable command snippets for common GPC workflows. Each recipe is self-contained -- adjust the package name and options to fit your app.

For full flag documentation, see the [command reference](/commands/).

## Upload and Release

### Upload AAB to internal track

```bash
gpc releases upload app-release.aab --app com.example.app --track internal
```

### Upload with AI-translated release notes

```bash
gpc releases upload app-release.aab --app com.example.app --track internal \
  --changelog-ai \
  --locales auto
```

### Promote from internal to production with 10% rollout

```bash
gpc releases promote --app com.example.app --from internal --to production --rollout 10
```

### Halt a rollout

```bash
gpc releases rollout halt --app com.example.app --track production
```

### Resume a halted rollout

```bash
gpc releases rollout resume --app com.example.app --track production
```

## Monitor

### Check app health

```bash
gpc doctor --app com.example.app
```

### Watch a rollout with auto-halt on crash spike

```bash
gpc watch --app com.example.app --track production \
  --crash-threshold 0.02 --anr-threshold 0.005 --on-breach halt
```

Rate thresholds are fractions: `0.02` is 2%.

For an unattended multi-stage ramp, describe the stages in `.gpcrc-train.json` and run `gpc train start`:

```json
// .gpcrc-train.json
{
  "stages": [
    { "track": "production", "rollout": 1 },
    { "track": "production", "rollout": 5, "after": "1d" },
    { "track": "production", "rollout": 25, "after": "2d" },
    { "track": "production", "rollout": 100, "after": "4d" }
  ],
  "gates": {
    "crashes": { "max": 2 },
    "anr": { "max": 0.5 }
  }
}
```

```bash
gpc train start
```

### Get crash rate for last 7 days

```bash
gpc vitals crashes --app com.example.app --days 7
```

## Metadata

### Pull store listing to local files

```bash
gpc listings pull --app com.example.app --dir fastlane/metadata/android
```

### Push local metadata to Play Store

```bash
gpc listings push --app com.example.app --dir fastlane/metadata/android
```

### Sync screenshots

```bash
gpc listings images sync --app com.example.app --dir fastlane/metadata/android
```

## CI/CD Patterns

### GitHub Actions one-liner

```bash
npx @gpc-cli/cli releases upload app-release.aab \
  --app com.example.app --track internal --json
```

### Validate without uploading (dry-run)

```bash
gpc preflight app-release.aab
```

### Gate deployment on vitals threshold

```bash
gpc vitals crashes --app com.example.app --threshold 0.02
gpc vitals anr --app com.example.app --threshold 0.005
```

## Monetization

### List all subscriptions

```bash
gpc subscriptions list --app com.example.app
```

### Create an in-app product

```bash
gpc iap create --app com.example.app --file premium-upgrade.json
```

## Team

### Export testers to CSV

```bash
gpc testers list --app com.example.app --track internal --output csv > testers.csv
```

### Import testers from CSV

```bash
gpc testers import --app com.example.app --track internal --file testers.csv
```

---

Looking for detailed flag documentation? See the [full command reference](/commands/).
