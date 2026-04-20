---
outline: deep
---

# Managed Google Play

Managed Google Play is Google's enterprise app distribution model for managed Android devices. Admins push approved apps to specific employees or customers via their MDM (mobile device management) system, bypassing the public Play Store.

## Why it matters

For enterprise software vendors, Managed Google Play is how you deliver a "private" Android app to specific customer organizations without listing it publicly. The app only appears in the managed Play Store for users in the customer's organization. It is invisible to everyone else on the Play Store.

This is the only supported distribution path for:

- White-labeled enterprise apps shipped per customer
- Per-organization internal apps where Play Store publication would leak customer identity
- Apps with contractual distribution restrictions

Until v0.9.56, no publishing CLI supported Managed Google Play. Every workflow ran through the Play Console UI at two hours per release per customer.

## How GPC handles it

Publish a private app to a specific enterprise customer:

```bash
gpc enterprise publish ./app.aab \
  --account 1234567890 \
  --title "My Internal App" \
  --org-id customer-acme
```

`--account` is the developer account ID hosting the app; `--org-id` is the customer organization's enterprise ID from their managed Google account.

Verify service-account permissions for the Custom App Publisher role:

```bash
gpc doctor
```

## Common issues

- **Custom App Publisher role not granted** — the service account needs a specific role beyond standard Play Developer. Grant it in Play Console → Users and permissions.
- **Play Custom App Publishing API not enabled** — separate API from the standard Play Developer API. Enable in Cloud Console.
- **Organization ID not found** — the customer must have completed their enterprise enrollment and given you their organization ID.
- **Private app stuck in review** — managed Play apps still go through Google review, but typically faster than public apps.

## Related

- [Play Custom App Publishing](/glossary/play-custom-app-publishing) — the underlying API
- [`gpc enterprise`](/commands/enterprise) — all enterprise commands
- [Enterprise Publishing Guide](/guide/enterprise-publishing) — end-to-end workflow
- [Google Play Service Account](/glossary/play-service-account) — authentication setup
