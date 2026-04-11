# Publishing to Managed Google Play

A full walkthrough for publishing private apps to enterprise customers via Managed Google Play. GPC is the first Android publishing CLI to support the [Play Custom App Publishing API](https://developers.google.com/android/work/play/custom-app-api).

::: warning Permanently private
Apps created via this flow are **permanently private** and cannot be made public later. If you want a normal public Play Store app, use `gpc releases upload` against the public Play Store, not `gpc enterprise`.
:::

## What this is for

Managed Google Play is Google's app store for enterprise-managed Android devices. Apps published through it fall into two categories:

- **Public apps** — regular Play Store apps that enterprises can approve and distribute to their employees.
- **Private apps** — custom apps distributed exclusively to specific enterprise customers, invisible to the public Play Store.

`gpc enterprise` handles the second category: creating and publishing **private apps** to managed Google Play. Common use cases:

- An internal app your company ships to its own managed devices
- A vertical SaaS product with a private Android client per customer
- A line-of-business app distributed to a partner organization

If you're publishing a normal public app, you don't need this guide — use `gpc releases upload` instead.

## Prerequisites

You need:

1. **A Google Play developer account** — the parent account for the private app. The owner of this account must also be an admin of every enterprise customer you distribute to.
2. **A Google Cloud project** with the Play Custom App Publishing API enabled.
3. **A service account** in that project with a JSON key, configured via `gpc auth` or `GPC_SERVICE_ACCOUNT_KEY`.
4. **The "create and publish private apps" permission** granted to your service account in Play Console.
5. **Organization IDs** for the enterprise customers you're targeting (your customer's IT admin provides these).

## Step 1 — Enable the API in Google Cloud

The Play Custom App Publishing API is separate from the regular Android Publisher API. Enable it in the same Google Cloud project you use for GPC:

```
https://console.cloud.google.com/apis/library/playcustomapp.googleapis.com
```

Click **Enable**. No additional configuration required on the Google Cloud side.

## Step 2 — Grant the service account permission

Google Play Console and Google Cloud treat permissions separately. Enabling the API in Cloud is necessary but not sufficient — you also need to grant the service account the **"create and publish private apps"** permission inside Play Console.

1. Open Play Console
2. Navigate to **Users and permissions**
3. Find your service account (it appears as its email address, e.g. `gpc-bot@myproject.iam.gserviceaccount.com`)
4. Click the service account to open its permissions
5. Under **Account permissions** (not per-app permissions), enable **"Create and publish private apps"**
6. Save

::: tip Verify with gpc doctor
After granting the permission, run `gpc doctor`. It probes the Play Custom App API and reports whether the permission is in place:

```
✓ Play Custom App Publishing API is reachable
```

If the probe reports a missing permission or API-not-enabled, the message points to exactly which setup step is incomplete.
:::

## Step 3 — Find your developer account ID

Your `--account` argument is a long integer, not an email or organization ID. Read it from the Play Console URL:

```
https://play.google.com/console/developers/1234567890/...
                                             ^^^^^^^^^^
```

That number (`1234567890` in the example) is your developer account ID. Copy it.

## Step 4 — Get organization IDs from your customer

Each enterprise customer you publish to has a **managed Google Play organization ID**. These are opaque identifiers — neither you nor GPC can look them up. Your customer's IT admin (the person who manages their enterprise mobility setup) provides them.

The ID format looks like `abc-123-def` or similar. Ask your customer for it before running the publish step.

If you don't have organization IDs yet, you can still run `gpc enterprise publish` without them — the private app will be created, but you'll need to associate organizations later through the Play Console UI (there is no API for post-creation org assignment).

## Step 5 — Publish your first private app

```sh
gpc enterprise --account 1234567890 publish ./app.aab \
  --title "Acme Internal Tools" \
  --lang en_US \
  --org-id acme-prod-org
```

On success, you'll see output like:

```json
{
  "packageName": "com.google.customapp.A1B2C3D4E5",
  "title": "Acme Internal Tools",
  "languageCode": "en_US",
  "organizations": [{ "organizationId": "acme-prod-org" }]
}
```

The `packageName` is assigned by Google — you can't influence it, and it always starts with `com.google.customapp.`. Copy it down; you'll need it for every subsequent operation.

::: warning Confirmation prompt
`publish` prints a warning block and waits for `y` before proceeding. In CI or non-interactive environments, pass `--yes` to skip the prompt. The warning is intentional — private apps are permanent.
:::

## Step 6 — Publishing updates from CI/CD

Once the private app exists, it's a regular app in your developer account. New versions go through the standard release flow, using the assigned package name:

```sh
# From CI, after a build produces app-v2.aab
gpc --app com.google.customapp.A1B2C3D4E5 \
    releases upload ./app-v2.aab \
    --track production \
    --rollout 0.10
```

All standard GPC commands work: `releases`, `tracks`, `listings`, `reviews`, `vitals`. The only thing you can't do via the API is add or remove enterprise organizations after creation.

### Example: GitHub Actions workflow

```yaml
# .github/workflows/publish-private.yml
name: Publish private app
on:
  workflow_dispatch:
    inputs:
      initial_publish:
        description: "First publish (create custom app) or update (upload to existing)?"
        type: choice
        options: [update, initial]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm install -g @gpc-cli/cli
      - name: Write service account key
        run: echo '${{ secrets.GPC_SA_KEY }}' > /tmp/sa.json
        env:
          GPC_SERVICE_ACCOUNT_KEY: /tmp/sa.json

      - name: Initial publish
        if: inputs.initial_publish == 'initial'
        run: |
          gpc enterprise --account ${{ secrets.DEVELOPER_ACCOUNT_ID }} \
            publish ./app.aab \
            --title "Acme Internal Tools" \
            --org-id ${{ secrets.CUSTOMER_ORG_ID }} \
            --yes

      - name: Update existing
        if: inputs.initial_publish == 'update'
        run: |
          gpc --app com.google.customapp.A1B2C3D4E5 \
              releases upload ./app.aab --track production
```

## Troubleshooting

### "Service account is missing the 'create and publish private apps' permission"

You've enabled the API in Google Cloud but haven't granted the permission in Play Console. Re-read [Step 2](#step-2-grant-the-service-account-permission).

### "Play Custom App Publishing API is not enabled for this project"

You're missing [Step 1](#step-1-enable-the-api-in-google-cloud). Enable the API in your Google Cloud project and wait a minute before retrying.

### "Developer account ID must be numeric"

You passed something that isn't an integer to `--account`. Re-read [Step 3](#step-3-find-your-developer-account-id) — it must be the number from the Play Console URL, not an email, organization ID, or Workspace identifier.

### "Bundle file not found"

The path you passed to `publish <bundle>` or `--bundle` doesn't exist. Double-check the path and verify the AAB/APK was built before running GPC.

### I accidentally created a private app I didn't want

There's no undo. Private apps cannot be deleted through the API — open a case with Play Console support if you need it removed.

## Limitations

- **One-way door.** Private apps cannot be made public.
- **No list API.** There's no programmatic way to enumerate your custom apps — use `gpc apps list` or the Play Console UI.
- **No post-creation organization management.** You can't add or remove target organizations via the API after the initial create call. Use Play Console UI.
- **Can't influence package name.** Google assigns `com.google.customapp.<random>`. You cannot claim a specific package name.
- **Can't test end-to-end without a real enterprise.** The only way to fully validate a working setup is to create an actual private app in your real developer account. Plan for a one-time test with a clearly labeled test build.

## See also

- [`gpc enterprise` command reference](../commands/enterprise.md)
- [Google's Play Custom App Publishing API docs](https://developers.google.com/android/work/play/custom-app-api)
- [Android Enterprise overview](https://developers.google.com/android/work/overview)
- [Managed Google Play for enterprises](https://www.android.com/enterprise/)
