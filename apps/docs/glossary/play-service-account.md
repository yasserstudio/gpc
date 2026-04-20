---
outline: deep
---

# Google Play Service Account

A service account is a Google Cloud IAM identity that scripts and CI pipelines use to authenticate against the Google Play Developer API. It is not a human user and does not have a password. Instead, it has a JSON key file with a private key.

## Why it matters

Every programmatic interaction with Google Play (uploading an AAB, promoting a release, reading vitals, replying to reviews) authenticates as either a human user via OAuth or a service account via JSON key. For CI/CD, service accounts are the only workable option: they do not require interactive login and they do not expire every few weeks.

Setting a service account up correctly is the most common first-run blocker for Play Store automation tools. It requires creating the account in Google Cloud Console, granting it Play Developer API access, and inviting it as a user in Play Console with the right permissions.

## How GPC handles it

Authenticate with the JSON key file:

```bash
gpc auth login --service-account path/to/key.json
```

Verify the setup:

```bash
gpc doctor
```

`gpc doctor` runs 20 checks including service-account validity, Play Console permissions, API enablement, and account-level access. Failures come with fix suggestions and exit codes.

For CI, set the key via environment variable:

```bash
export GPC_SERVICE_ACCOUNT="$(cat path/to/key.json)"
gpc releases upload app.aab --track internal
```

## Common issues

- **"Invalid keyfile or passphrase"** — the JSON file is malformed or the env var value was truncated. `gpc doctor` catches this.
- **"The caller does not have permission"** — the service account exists but has not been invited in Play Console, or does not have the right permission scope. Invite in Play Console → Setup → API access.
- **"Play Android Developer API has not been used in project"** — the API is not enabled in the Cloud project. Enable it in Cloud Console → APIs & Services.
- **403 on specific endpoints** — service account needs both Play Console user access and specific Play API role assignments for some endpoints (e.g., reviews, reports). GPC's error messages surface the missing role.

## Related

- [Authentication Guide](/guide/authentication) — full setup walkthrough
- [`gpc doctor`](/commands/utility) — setup validation
- [`gpc auth`](/commands/auth) — login, profile management
- [Managed Google Play](/glossary/managed-google-play) — requires a dedicated service account with Custom App Publisher role
