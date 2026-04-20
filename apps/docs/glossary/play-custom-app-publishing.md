---
outline: deep
---

# Play Custom App Publishing

Play Custom App Publishing is the Google Play Developer API that ships private Android apps to specific enterprise organizations through Managed Google Play. It is a separate API from the main Google Play Developer API v3 and has its own enablement step.

## Why it matters

If you ship enterprise or white-labeled Android apps on a per-customer basis, this is the API that makes CI/CD publishing possible. It exposes endpoints for creating private app listings, publishing to specific organizations, and managing per-org distribution.

Before this API existed, per-customer private apps went through the Play Console UI. Two hours per release per customer, every time.

## How GPC handles it

GPC is the first publishing CLI to wrap the Play Custom App Publishing API. As of v0.9.56:

```bash
gpc enterprise publish ./app.aab \
  --account 1234567890 \
  --title "My Internal App" \
  --org-id customer-acme
```

One command replaces the full Console UI flow: create the app, assign to organization, upload AAB, commit the release.

For managing multiple customer orgs in one CI pipeline:

```bash
for org in $(cat customer-orgs.txt); do
  gpc enterprise publish ./app.aab --account 1234567890 --title "My App" --org-id "$org"
done
```

## Common issues

- **API not enabled** — Play Custom App Publishing API must be enabled separately from Play Developer API. Enable in Cloud Console.
- **Service account missing the Custom App Publisher role** — standard Play Developer role is not sufficient. Grant the dedicated role in Play Console.
- **Organization ID format confusion** — the `--org-id` is the customer's enterprise ID, not their domain. Get it from the customer's managed Google account.
- **Draft vs published state** — the API creates the app in a draft state; a separate commit step publishes it. GPC handles both in one command by default.

## Related

- [Managed Google Play](/glossary/managed-google-play) — the distribution model this API enables
- [`gpc enterprise`](/commands/enterprise) — all enterprise commands
- [Enterprise Publishing Guide](/guide/enterprise-publishing) — end-to-end workflow
- [`gpc doctor`](/commands/utility) — verifies API enablement and role grants
