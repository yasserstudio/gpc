# gpc enterprise

Publish private apps to Managed Google Play via the [Play Custom App Publishing API](https://developers.google.com/android/work/play/custom-app-api). Private apps are distributed exclusively to specific enterprise customers and never appear on the public Play Store.

::: warning Permanently private
Apps created through this API are **permanently private** and cannot be converted to public apps later. The GPC CLI prints a confirmation prompt before running `create` or `publish` to make sure you meant it. Pass `--yes` to skip the prompt in CI.
:::

## Synopsis

```sh
gpc enterprise --account <developer-account-id> <subcommand>
```

`--account` is required. It is the **developer account ID** — a long integer you read from your Play Console URL:

```
https://play.google.com/console/developers/[ACCOUNT_ID]
                                             ^^^^^^^^^^
                                             this number
```

It is **not** a Google Workspace organization ID, nor a Cloud Identity organization ID.

## Subcommands

### `enterprise publish <bundle>`

One-shot publish. Creates a new private custom app, uploads the bundle, and returns the assigned package name.

```sh
gpc enterprise --account 1234567890 publish ./app.aab \
  --title "My Internal App" \
  --lang en_US \
  --org-id org-acme-corp

gpc enterprise --account 1234567890 publish ./app.aab \
  --title "My Internal App" \
  --org-id org-acme --org-name "Acme Corp" \
  --org-id org-beta --org-name "Beta Inc" \
  --yes                               # skip confirmation prompt (CI)
```

**Positional:**

| Argument   | Description                       |
| ---------- | --------------------------------- |
| `<bundle>` | Path to the AAB or APK to upload. |

**Options:**

| Option              | Description                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `--title <title>`   | App title (required).                                                                       |
| `--lang <code>`     | Default listing language in BCP 47 format. Default: `en_US`.                                |
| `--org-id <id>`     | Target enterprise organization ID. Repeatable — use the flag once per organization.         |
| `--org-name <name>` | Optional human-readable organization name. Repeatable, matched by position with `--org-id`. |

### `enterprise create`

Explicit-arg version of `publish`. Functionally equivalent — `publish` is the shorter form with a positional bundle path.

```sh
gpc enterprise --account 1234567890 create \
  --title "My Internal App" \
  --bundle ./app.aab \
  --org-id org-acme-corp
```

**Options:**

| Option              | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `--title <title>`   | App title (required).                                               |
| `--bundle <path>`   | Path to AAB or APK (required).                                      |
| `--lang <code>`     | Default listing language. Default: `en_US`.                         |
| `--org-id <id>`     | Target organization ID (repeatable).                                |
| `--org-name <name>` | Human-readable organization name (repeatable, matched by position). |

### `enterprise list`

**Removed in v0.9.56.** Google's Play Custom App Publishing API exposes no list method — private apps created via this API appear in your regular developer account alongside public apps. Use `gpc apps list` to find them.

## Required setup

Before running `gpc enterprise`, you need four things:

1. **A Google Play developer account** — the one whose ID you'll pass as `--account`.
2. **A Google Cloud project with the Play Custom App Publishing API enabled.** Enable it at [console.cloud.google.com/apis/library/playcustomapp.googleapis.com](https://console.cloud.google.com/apis/library/playcustomapp.googleapis.com).
3. **A service account** with a JSON key configured via `gpc auth` or `GPC_SERVICE_ACCOUNT_KEY`.
4. **The "create and publish private apps" permission** granted to your service account in Play Console → **Users and permissions** → select the service account → **Account permissions**.

Running `gpc doctor` probes the Play Custom App API and flags missing permissions. See the [Enterprise publishing guide](../guide/enterprise-publishing.md) for step-by-step setup.

## Updating a private app

Once a private app is created, it becomes a regular app in your developer account. Subsequent version uploads, track management, listing updates, rollouts, and everything else happen through the standard GPC commands against the `packageName` returned by `gpc enterprise publish`:

```sh
# v1 of com.google.customapp.xyz already exists via `gpc enterprise publish`
# Ship v2 like any other release:
gpc --app com.google.customapp.xyz releases upload ./app-v2.aab --track production --rollout 0.10
```

## Adding organizations later

`--org-id` at create time is the only way to associate enterprise organizations with a private app via the API. If you need to add or remove organizations **after** creation, you must use the Play Console UI — there is no API for this.

## Output

On success:

```json
{
  "packageName": "com.google.customapp.A1B2C3D4E5",
  "title": "My Internal App",
  "languageCode": "en_US",
  "organizations": [{ "organizationId": "org-acme-corp" }]
}
```

The `packageName` is assigned by Google and starts with `com.google.customapp.` — you cannot influence it.

## Deprecated flag

| Flag    | Status                                                  | Replacement              |
| ------- | ------------------------------------------------------- | ------------------------ |
| `--org` | **Deprecated** in v0.9.56, removed in a future version. | Use `--account` instead. |

`--org` still works in v0.9.56 but prints a warning on every use. The name was historically misleading — it was always a developer account ID, never an organization ID.

## See also

- [Publishing to Managed Google Play from CI/CD](../guide/enterprise-publishing.md) — full walkthrough
- [Android Enterprise overview](https://developers.google.com/android/work/overview) — product context
- [Play Custom App Publishing API reference](https://developers.google.com/android/work/play/custom-app-api) — Google's upstream docs
