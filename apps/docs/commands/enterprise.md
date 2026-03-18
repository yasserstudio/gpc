# gpc enterprise

Manage private enterprise apps via Managed Google Play (Play Custom App API). Supports creating and listing private apps distributed to enterprise users.

## Synopsis

```sh
gpc enterprise --org <organization-id> <subcommand>
```

The `--org` flag is required for all subcommands.

## Subcommands

### `enterprise list`

List private enterprise apps for an organization.

```sh
gpc enterprise --org 123456789 list
gpc enterprise --org 123456789 list --output json
```

### `enterprise create`

Create a new private enterprise app.

```sh
gpc enterprise --org 123456789 create --title "My Private App"
gpc enterprise --org 123456789 create --title "My App" --lang en_US
```

**Options:**

| Option            | Description                      |
| ----------------- | -------------------------------- |
| `--title <title>` | App title (required)             |
| `--lang <code>`   | Language code (default: `en_US`) |

## Finding Your Organization ID

Your Google Workspace or Cloud Identity organization ID can be found in:

- Google Admin Console → Account → Profile
- Google Cloud Console → IAM & Admin → Settings

## See Also

- [Managed Google Play documentation](https://developers.google.com/android/work/play/custom-app-api)
