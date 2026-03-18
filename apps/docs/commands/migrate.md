---
outline: deep
---

# migrate

Migrate from other tools to GPC.

## Commands

| Command                                       | Description                    |
| --------------------------------------------- | ------------------------------ |
| [`migrate fastlane`](#migrate-fastlane)       | Migrate from Fastlane to GPC  |

## `migrate fastlane`

Detect Fastlane configuration in your project and generate a migration plan with equivalent GPC commands.

The wizard scans for `Fastfile`, `Appfile`, `Gemfile`, and metadata directories. It maps Fastlane lanes to GPC equivalents, identifies metadata languages, and generates migration files with a checklist.

### Synopsis

```bash
gpc migrate fastlane [options]
```

### Options

| Flag        | Short | Type      | Default | Description                                       |
| ----------- | ----- | --------- | ------- | ------------------------------------------------- |
| `--dir`     |       | `string`  | `.`     | Directory containing Fastlane files               |
| `--output`  |       | `string`  | `.`     | Output directory for migration files              |
| `--dry-run` |       | `boolean` | `false` | Preview migration plan without writing any files  |
| `--yes`     | `-y`  | `boolean` | `false` | Overwrite existing `.gpcrc.json` without prompting|

::: warning Overwrite protection
If a `.gpcrc.json` already exists in the output directory, the command will abort with a warning unless `--yes` is passed. This prevents accidental overwrites of existing GPC configuration.
:::

### Example

Run the migration wizard:

```bash
gpc migrate fastlane
```

```
Fastlane Detection Results:
  Fastfile:  found
  Appfile:   found
  Metadata:  found
  Gemfile:   found
  Package:   com.example.myapp

  Lanes found: 3
    - deploy -> gpc releases upload
    - beta -> gpc releases upload --track beta
    - metadata -> gpc listings push

  Metadata languages: en-US, ja-JP, de-DE

Migration files written:
  ./gpc-migration.md
  ./gpc-commands.sh

Warnings:
  - Lane 'custom_notify' has no GPC equivalent — consider a plugin

Migration Checklist:
  [ ] Set up service account auth: gpc auth login
  [ ] Configure default app: gpc config set app com.example.myapp
  [ ] Test metadata sync: gpc listings push --dry-run
  [ ] Test release upload: gpc releases upload app.aab --track internal --dry-run
  [ ] Remove Fastlane after validation
```

Scan a specific directory:

```bash
gpc migrate fastlane --dir ./android --output ./migration
```

Get structured output for scripting:

```bash
gpc migrate fastlane --output json
```

```json
{
  "detection": {
    "hasFastfile": true,
    "hasAppfile": true,
    "hasMetadata": true,
    "hasGemfile": true,
    "packageName": "com.example.myapp",
    "lanes": [
      { "name": "deploy", "gpcEquivalent": "gpc releases upload" }
    ],
    "metadataLanguages": ["en-US", "ja-JP"]
  },
  "plan": {
    "warnings": [],
    "checklist": ["Set up service account auth", "Configure default app"]
  },
  "files": ["./gpc-migration.md", "./gpc-commands.sh"]
}
```

## Command Mapping

For a full mapping of Fastlane commands to GPC equivalents, see [Migrating from Fastlane](/migration/from-fastlane).

| Fastlane                              | GPC                                          |
| ------------------------------------- | --------------------------------------------- |
| `fastlane supply --aab app.aab`       | `gpc releases upload app.aab`                 |
| `fastlane supply --track beta`        | `gpc releases upload app.aab --track beta`    |
| `fastlane supply --rollout 0.1`       | `gpc releases upload app.aab --rollout 10`    |
| `fastlane supply metadata`            | `gpc listings push --dir metadata`             |
| `fastlane supply download_metadata`   | `gpc listings pull --dir metadata`             |
| `fastlane supply --skip_upload_metadata` | `gpc releases upload app.aab` (no metadata) |

::: tip Rollout Percentage
Fastlane uses decimal fractions (`0.1` = 10%), GPC uses percentages (`10` = 10%).
:::

## Related

- [Migrating from Fastlane](/migration/from-fastlane) -- Full migration guide
- [listings](./listings) -- Store listing management
- [releases](./releases) -- Release management
