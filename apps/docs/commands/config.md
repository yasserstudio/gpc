---
outline: deep
---

<CommandHeader
  name="gpc config"
  description="Manage user-level CLI defaults: app, auth profiles, output format, and integrations."
  usage="gpc config <subcommand> [options]"
  :badges="['--profile', '--json']"
/>

## Commands

| Command                       | Description                    |
| ----------------------------- | ------------------------------ |
| [`config init`](#config-init) | Create a configuration file    |
| [`config show`](#config-show) | Display resolved configuration |
| [`config set`](#config-set)   | Set a configuration value      |
| [`config path`](#config-path) | Show configuration file path   |

## `config init`

Create the user configuration file at `~/.config/gpc/config.json` (or the XDG-equivalent path).
In interactive mode, prompts for common settings. To scaffold a project `.gpcrc.json`, use `gpc init`.

### Synopsis

```bash
gpc config init [options]
```

### Options

`--global` is accepted as a compatibility no-op; user config is always global to the current user.

### Example

Interactive init (prompts for app, output format, service account):

```bash
gpc config init
```

```
? Default package name (e.g. com.example.app, blank to skip): com.example.myapp
? Default output format: table
? Service account JSON path (blank to skip): ./service-account-key.json
Configuration file created at: /Users/you/.config/gpc/config.json
```

Non-interactive init:

```bash
gpc config init --no-interactive
```

Creates a minimal user configuration:

```json
{}
```

---

## `config show`

Display the fully resolved configuration, including values from the config file, environment variables, and defaults.

### Synopsis

```bash
gpc config show
```

### Options

No command-specific options.

### Example

```bash
gpc config show
```

```json
{
  "app": "com.example.myapp",
  "output": "table",
  "auth": {
    "serviceAccount": "./service-account-key.json"
  },
  "profile": "production",
  "plugins": ["@gpc-cli/plugin-ci"]
}
```

Output as YAML:

```bash
gpc config show --output yaml
```

```yaml
app: com.example.myapp
output: table
auth:
  serviceAccount: ./service-account-key.json
profile: production
plugins:
  - "@gpc-cli/plugin-ci"
```

---

## `config set`

Set a value in the user configuration. Project `.gpcrc.json` files remain explicit, reviewable files;
edit them directly or scaffold one with `gpc init`.

### Synopsis

```bash
gpc config set <key> <value>
```

### Options

No command-specific options. The key and value are positional arguments.

Common keys:

| Key                   | Description           | Example             |
| --------------------- | --------------------- | ------------------- |
| `app`                 | Default package name  | `com.example.myapp` |
| `profile`             | Default auth profile  | `production`        |
| `output`              | Default output format | `json`              |
| `auth.serviceAccount` | Service account path  | `./key.json`        |
| `developerId`         | Developer account ID  | `1234567890`        |

### Example

Set default app:

```bash
gpc config set app com.example.myapp
```

```
Set app = com.example.myapp
```

Set default profile:

```bash
gpc config set profile production
```

Set developer ID for user management:

```bash
gpc config set developerId 1234567890
```

---

## `config path`

Show the user configuration path written by `config init` and `config set`.

### Synopsis

```bash
gpc config path
```

### Options

No command-specific options.

### Example

```bash
gpc config path
```

```
/Users/you/.config/gpc/config.json
```

## User Configuration File Format

The user `config.json` file supports these fields:

```json
{
  "app": "com.example.myapp",
  "output": "table",
  "developerId": "1234567890",
  "profile": "production",
  "auth": {
    "serviceAccount": "./service-account-key.json"
  },
  "plugins": ["@gpc-cli/plugin-ci"],
  "profiles": {
    "production": {
      "auth": {
        "serviceAccount": "./production-key.json"
      }
    },
    "staging": {
      "auth": {
        "serviceAccount": "./staging-key.json"
      }
    }
  }
}
```

Plugin approvals also live only in this user config and cannot be set by a project `.gpcrc.json`. Use
`gpc plugins approve <name>` to add one safely. See the [Configuration Guide](/guide/configuration)
for project `.gpcrc.json` fields and precedence.

## Related

- [auth](./auth) -- Authentication and profiles
- [plugins](./plugins) -- Plugin configuration
- [Configuration Guide](/guide/configuration) -- Detailed configuration reference
