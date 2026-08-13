---
outline: deep
---

<CommandHeader
  name="gpc plugins"
  description="Manage GPC plugins — install, remove, and inspect plugin lifecycle hooks and custom commands."
  usage="gpc plugins <subcommand> [options]"
  :badges="['--json']"
/>

## Commands

| Command                               | Description                              |
| ------------------------------------- | ---------------------------------------- |
| [`plugins list`](#plugins-list)       | List loaded plugins                      |
| [`plugins init`](#plugins-init)       | Scaffold a new plugin project            |
| [`plugins approve`](#plugins-approve) | Approve a third-party plugin for loading |
| [`plugins revoke`](#plugins-revoke)   | Revoke approval for a third-party plugin |

## Plugin Trust Model

- **First-party plugins** are limited to GPC's explicit allowlist (currently `@gpc-cli/plugin-ci`) and are trusted only when configured and their resolved package-manifest identity exactly matches the specifier.
- **Third-party plugins** must be explicitly approved before they are loaded. This prevents untrusted code from running automatically.

## `plugins list`

List all currently loaded plugins, their version, trust status, and any registered commands.

### Synopsis

```bash
gpc plugins list
```

### Options

No command-specific options.

### Example

```bash
gpc plugins list
```

```
Loaded plugins:

  @gpc-cli/plugin-ci@0.8.0 (trusted)

Plugin commands:

  gpc ci-summary — Generate CI summary report
```

With JSON output:

```bash
gpc plugins list --output json
```

```json
[
  {
    "name": "@gpc-cli/plugin-ci",
    "version": "0.8.0",
    "trusted": true
  }
]
```

When no plugins are loaded:

```
No plugins loaded.

Configure plugins in .gpcrc.json: { "plugins": ["@gpc-cli/plugin-ci"] }
```

---

## `plugins init`

Scaffold a new plugin project with all required files (package.json, source, tests, tsconfig).

### Synopsis

```bash
gpc plugins init <name> [options]
```

### Options

| Flag            | Short | Type     | Default               | Description        |
| --------------- | ----- | -------- | --------------------- | ------------------ |
| `--dir`         | `-d`  | `string` | `./gpc-plugin-<name>` | Output directory   |
| `--description` |       | `string` |                       | Plugin description |

### Example

Scaffold a new plugin:

```bash
gpc plugins init slack
```

```
Plugin scaffolded at gpc-plugin-slack/

Files created:
  package.json
  tsconfig.json
  src/index.ts
  tests/index.test.ts
  README.md

Next steps:
  cd gpc-plugin-slack
  npm install
  npm run build
  npm test
```

With custom directory and description:

```bash
gpc plugins init notifications \
  --dir ./my-plugins/gpc-plugin-notifications \
  --description "Send release notifications to Slack and Discord"
```

---

## `plugins approve`

Approve a third-party plugin for loading. GPC validates its declared permissions and records the canonical package or file identity in the user config at `~/.config/gpc/config.json` (or the platform's XDG config directory).

### Synopsis

```bash
gpc plugins approve <name>
```

### Options

No command-specific options.

### Example

```bash
gpc plugins approve gpc-plugin-slack
```

```
Plugin "gpc-plugin-slack" approved. It will be loaded on next run.
```

This adds to your user config:

```json
{
  "approvedPlugins": ["gpc-plugin-slack"]
}
```

---

## `plugins revoke`

Revoke approval for a third-party plugin. Removes its identity from the user-level approval records. The plugin will no longer be loaded.

### Synopsis

```bash
gpc plugins revoke <name>
```

### Options

No command-specific options.

### Example

```bash
gpc plugins revoke gpc-plugin-slack
```

```
Plugin "gpc-plugin-slack" approval revoked.
```

If the plugin was not in the approved list:

```
Plugin "gpc-plugin-slack" was not in the approved list.
```

## Plugin Configuration

Plugins are configured in `.gpcrc.json`:

```json
{
  "plugins": ["@gpc-cli/plugin-ci", "gpc-plugin-slack"]
}
```

Third-party approvals are deliberately stored only in the user config. A project `.gpcrc.json` cannot approve its own plugin code.

GPC loads plugins from:

1. Installed package names listed in the `plugins` config array
2. Local file paths listed in the `plugins` config array, resolved from the project directory

GPC does not scan `node_modules` automatically. New third-party approvals must declare `gpc.permissions`; plugins approved before that metadata existed retain compatibility permissions with a warning. Old relative-path approvals must be reapproved once because their original project was not recorded; the replacement approval is stored as an absolute file identity.

## Related

- [config](./config) -- Plugin configuration
- [Plugin Development Guide](/advanced/plugins) -- Build your own plugin
