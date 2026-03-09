---
outline: deep
---

# Migrate from Play Console UI

Map common Google Play Console browser tasks to GPC CLI commands.

## Task Mapping

| Play Console UI Action | GPC Command |
|----------------------|-------------|
| Upload AAB | `gpc releases upload app.aab --track internal` |
| Create release | `gpc publish app.aab --track beta --notes "Bug fixes"` |
| Promote to production | `gpc releases promote --from beta --to production --rollout 10` |
| Increase rollout | `gpc releases rollout increase --track production --to 50` |
| Halt rollout | `gpc releases rollout halt --track production` |
| Complete rollout | `gpc releases rollout complete --track production` |
| View release status | `gpc status` |
| Edit store listing | `gpc listings push --dir metadata/` |
| Upload screenshots | `gpc listings images upload --lang en-US --type phoneScreenshots ./screens/*.png` |
| Download listings | `gpc listings pull --dir metadata/` |
| View reviews | `gpc reviews list` |
| Reply to review | `gpc reviews reply <review-id> "Thank you!"` |
| Check crash rate | `gpc vitals crashes` |
| Check ANR rate | `gpc vitals anr` |
| View app vitals | `gpc vitals overview` |
| Manage subscriptions | `gpc subscriptions list` |
| Create IAP | `gpc iap create --file product.json` |
| Download financial report | `gpc reports download financial --month 2026-02` |
| Invite team member | `gpc users invite user@co.com --developer-id <id> --role ADMIN` |
| Add beta tester | `gpc testers add user@co.com --track beta` |

## Benefits Over the UI

- **Automation** — Run any operation in CI/CD without a browser
- **Reproducibility** — Same commands, same results, every time
- **Speed** — Batch operations that would take 15 minutes of clicking
- **Auditability** — JSON output logs every operation with timestamps
- **Gating** — Automatically halt deployments on vitals thresholds
