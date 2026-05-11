---
outline: deep
---

# Recipes

Copy-pasteable command snippets for common GPC workflows. Each recipe is self-contained -- adjust the package name and options to fit your app.

For full flag documentation, see the [command reference](/commands/).

## Upload and Release

### Upload AAB to internal track

```bash
gpc upload --package com.example.app --track internal --aab app-release.aab
```

### Upload with AI-translated release notes

```bash
gpc upload --package com.example.app --track internal --aab app-release.aab \
  --notes-dir fastlane/metadata/android \
  --locales auto --ai
```

### Promote from internal to production with 10% rollout

```bash
gpc promote --package com.example.app --from internal --to production --rollout 0.1
```

### Halt a rollout

```bash
gpc rollout halt --package com.example.app --track production
```

### Resume a halted rollout

```bash
gpc rollout resume --package com.example.app --track production --rollout 0.5
```

## Monitor

### Check app health

```bash
gpc doctor --package com.example.app
```

### Watch a rollout with auto-halt on crash spike

```bash
gpc train --package com.example.app --track production \
  --crash-threshold 2.0 --stages 1%,5%,25%,50%,100%
```

### Get crash rate for last 7 days

```bash
gpc vitals crashes --package com.example.app --days 7
```

## Metadata

### Pull store listing to local files

```bash
gpc listings pull --package com.example.app --out fastlane/metadata/android
```

### Push local metadata to Play Store

```bash
gpc listings push --package com.example.app --dir fastlane/metadata/android
```

### Sync screenshots

```bash
gpc images push --package com.example.app --dir fastlane/metadata/android
```

## CI/CD Patterns

### GitHub Actions one-liner

```bash
npx @gpc-cli/cli upload --package com.example.app --track internal \
  --aab app-release.aab --json
```

### Validate without uploading (dry-run)

```bash
gpc preflight --aab app-release.aab
```

### Gate deployment on vitals threshold

```bash
gpc vitals check --package com.example.app \
  --crash-rate-max 2.0 --anr-rate-max 0.5
```

## Monetization

### List all subscriptions

```bash
gpc subscriptions list --package com.example.app
```

### Create an in-app product

```bash
gpc inapp create --package com.example.app \
  --sku premium_upgrade --price 4.99 --currency USD
```

## Team

### Export testers to CSV

```bash
gpc testers list --package com.example.app --track internal --format csv > testers.csv
```

### Import testers from CSV

```bash
gpc testers add --package com.example.app --track internal --csv testers.csv
```

---

Looking for detailed flag documentation? See the [full command reference](/commands/).
