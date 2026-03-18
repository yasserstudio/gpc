---
outline: deep
---

<CommandHeader
  name="gpc data-safety"
  description="Manage data safety declarations for your app's Play Store listing."
  usage="gpc data-safety <subcommand> [options]"
  :badges="['--json', '--dry-run']"
/>

## Commands

| Command                                     | Description                              |
| ------------------------------------------- | ---------------------------------------- |
| [`data-safety get`](#data-safety-get)       | View current data safety declarations    |
| [`data-safety update`](#data-safety-update) | Update declarations from a JSON file     |
| [`data-safety export`](#data-safety-export) | Export declarations to a local directory |

## `data-safety get`

View the current data safety declarations for the app. Shows all declared data types, their purposes, and sharing/collection status.

### Synopsis

```bash
gpc data-safety get [options]
```

### Options

| Flag     | Short | Type     | Default | Description      |
| -------- | ----- | -------- | ------- | ---------------- |
| `--app`  |       | `string` |         | App package name |
| `--json` |       | `flag`   |         | Output as JSON   |

### Example

View declarations in table format:

```bash
gpc data-safety get --app com.example.myapp
```

```
Data Safety Declarations

  Data Type          Collected   Shared   Purpose
  ─────────          ─────────   ──────   ───────
  Email address      Yes         No       Account management
  Crash logs         Yes         Yes      Analytics, App functionality
  Purchase history   Yes         No       App functionality
  Device ID          Yes         Yes      Analytics, Advertising

  Data deletion request URL: https://example.com/delete-data
  Security practices: Data encrypted in transit, Data can be deleted
```

View as JSON:

```bash
gpc data-safety get --app com.example.myapp --json
```

```json
{
  "dataSafety": {
    "dataTypes": [
      {
        "dataType": "EMAIL_ADDRESS",
        "dataCategory": "PERSONAL_INFO",
        "collected": true,
        "shared": false,
        "ephemeral": false,
        "required": true,
        "purposes": ["ACCOUNT_MANAGEMENT"]
      },
      {
        "dataType": "CRASH_LOGS",
        "dataCategory": "APP_INFO_AND_PERFORMANCE",
        "collected": true,
        "shared": true,
        "ephemeral": false,
        "required": true,
        "purposes": ["ANALYTICS", "APP_FUNCTIONALITY"]
      }
    ],
    "securityPractices": {
      "dataEncryptedInTransit": true,
      "canRequestDataDeletion": true,
      "dataDeletionRequestUrl": "https://example.com/delete-data"
    }
  }
}
```

---

## `data-safety update`

Update the data safety declarations from a JSON file. The file must follow the Google Play data safety schema. This replaces the entire declaration, so include all data types.

### Synopsis

```bash
gpc data-safety update --file <path> [options]
```

### Options

| Flag     | Short | Type     | Default        | Description                    |
| -------- | ----- | -------- | -------------- | ------------------------------ |
| `--file` | `-f`  | `string` | **(required)** | Path to JSON declarations file |
| `--app`  |       | `string` |                | App package name               |
| `--json` |       | `flag`   |                | Output as JSON                 |

### Example

Create a declarations file (`safety.json`):

```json
{
  "dataTypes": [
    {
      "dataType": "EMAIL_ADDRESS",
      "dataCategory": "PERSONAL_INFO",
      "collected": true,
      "shared": false,
      "ephemeral": false,
      "required": true,
      "purposes": ["ACCOUNT_MANAGEMENT"]
    },
    {
      "dataType": "CRASH_LOGS",
      "dataCategory": "APP_INFO_AND_PERFORMANCE",
      "collected": true,
      "shared": true,
      "ephemeral": false,
      "required": true,
      "purposes": ["ANALYTICS", "APP_FUNCTIONALITY"]
    }
  ],
  "securityPractices": {
    "dataEncryptedInTransit": true,
    "canRequestDataDeletion": true,
    "dataDeletionRequestUrl": "https://example.com/delete-data"
  }
}
```

Apply the update:

```bash
gpc data-safety update --file safety.json --app com.example.myapp
```

```
Data safety declarations updated
  2 data types declared
  Data deletion: enabled (https://example.com/delete-data)
  Encryption in transit: yes
```

---

## `data-safety export`

Export the current data safety declarations to a local directory as a JSON file. Useful for version-controlling your declarations alongside your app code.

### Synopsis

```bash
gpc data-safety export --dir <path> [options]
```

### Options

| Flag    | Short | Type     | Default        | Description      |
| ------- | ----- | -------- | -------------- | ---------------- |
| `--dir` | `-d`  | `string` | **(required)** | Output directory |
| `--app` |       | `string` |                | App package name |

### Example

```bash
gpc data-safety export --dir ./metadata --app com.example.myapp
```

```
Exported data safety declarations to ./metadata/data-safety.json
```

The exported file can be edited and re-applied with `data-safety update --file ./metadata/data-safety.json`.

## Errors

| Code                   | Exit | Description                                                                        |
| ---------------------- | ---- | ---------------------------------------------------------------------------------- |
| `VALIDATION_FAILED`    | 2    | The JSON file has invalid data types, missing required fields, or unknown purposes |
| `INVALID_DELETION_URL` | 2    | The data deletion request URL is malformed or unreachable                          |
| `API_ERROR`            | 4    | Google Play API rejected the update                                                |

## Related

- [listings](./listings) -- Store listing management (descriptions, screenshots, etc.)
