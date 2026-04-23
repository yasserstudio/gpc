# @gpc-cli/cli

**Ship Android apps from your terminal.** The complete CLI for the Google Play Developer API.

217 API endpoints. No Ruby. No browser. No ceremony. First publishing CLI with Managed Google Play support and AI-assisted Play Store release notes in 80+ locales.

```bash
npm install -g @gpc-cli/cli
```

## What it does

```bash
gpc status                                    # Releases + vitals + reviews in 3 seconds
gpc releases upload app.aab --track beta      # Upload to any track
gpc releases promote --from beta --to production --rollout 10
gpc publish app.aab --track beta --notes "Bug fixes"                # One-shot upload + release
gpc preflight app.aab                         # 9 offline policy scanners
gpc vitals crashes --threshold 2.0            # Exit code 6 if breached
gpc reviews list --stars 1-2 --since 7d       # Filter reviews
gpc reviews reply <review-id> --text "Thanks for the feedback!"
gpc listings push --dir metadata/             # Sync store metadata (Fastlane-compatible)
gpc changelog generate --target play-store --locales auto --ai      # AI-translated "What's new" in every locale
gpc enterprise publish app.aab --account 123 --title "Private App"  # Managed Google Play
gpc doctor                                    # 20 setup checks
```

## Why this over Fastlane?

|                                 | **GPC**                        | Fastlane supply |
| ------------------------------- | ------------------------------ | --------------- |
| API coverage                    | **217 endpoints**              | ~20             |
| Runtime                         | Node.js or binary              | Ruby + Bundler  |
| Cold start                      | <500ms                         | 2-3s            |
| Reviews & Vitals                | Yes                            | No              |
| Subscriptions                   | Yes                            | No              |
| **Managed Google Play**         | **Yes (Play Custom App API)**  | No              |
| **AI-translated release notes** | **Yes (80+ locales, BYO key)** | No              |
| Preflight scanner               | 9 offline checks               | No              |
| CI/CD native                    | JSON + exit codes              | Partial         |

[Migration guide](https://yasserstudio.github.io/gpc/migration/from-fastlane) with one-to-one command mapping.

## CI/CD

JSON output when piped. Semantic exit codes your pipeline can react to.

```yaml
- name: Ship to Play Store
  env:
    GPC_SERVICE_ACCOUNT: ${{ secrets.GPC_SERVICE_ACCOUNT }}
    GPC_APP: com.example.myapp
  run: |
    npm install -g @gpc-cli/cli
    gpc preflight app.aab --fail-on error
    gpc releases upload app.aab --track internal
```

| Exit code | Meaning            |
| --------- | ------------------ |
| `0`       | Success            |
| `3`       | Auth failure       |
| `4`       | API error          |
| `6`       | Threshold breached |

## Also available as

```bash
# Homebrew
brew install yasserstudio/tap/gpc

# Standalone binary (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

## Related packages

| Package                                                                  | What it does                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------ |
| [@gpc-cli/api](https://www.npmjs.com/package/@gpc-cli/api)               | Typed Google Play API v3 client (standalone SDK) |
| [@gpc-cli/auth](https://www.npmjs.com/package/@gpc-cli/auth)             | Authentication (service account, OAuth, ADC)     |
| [@gpc-cli/core](https://www.npmjs.com/package/@gpc-cli/core)             | Business logic and orchestration                 |
| [@gpc-cli/config](https://www.npmjs.com/package/@gpc-cli/config)         | Configuration and profiles                       |
| [@gpc-cli/plugin-sdk](https://www.npmjs.com/package/@gpc-cli/plugin-sdk) | Plugin interface                                 |
| [@gpc-cli/plugin-ci](https://www.npmjs.com/package/@gpc-cli/plugin-ci)   | CI/CD helpers                                    |

## Links

- [Documentation](https://yasserstudio.github.io/gpc/)
- [GitHub](https://github.com/yasserstudio/gpc)
- [Commands reference](https://yasserstudio.github.io/gpc/commands/)
- [CI/CD recipes](https://yasserstudio.github.io/gpc/ci-cd/)

Free to use. 2,093 tests. 90%+ coverage. Every write operation supports `--dry-run`.

## Licensing

Free to use. Source code is on GitHub at [yasserstudio/gpc](https://github.com/yasserstudio/gpc).
