---
outline: deep
---

# config

Manage CLI configuration. GPC looks for `.gpcrc.json` in the current directory, parent directories, and the user config directory (`~/.config/gpc/`).

## Commands

| Command | Description |
|---------|-------------|
| [`config init`](#config-init) | Create a configuration file |
| [`config show`](#config-show) | Display resolved configuration |
| [`config set`](#config-set) | Set a configuration value |
| [`config path`](#config-path) | Show configuration file path |

## `config init`

Create a new `.gpcrc.json` configuration file. In interactive mode, prompts for common settings.

### Synopsis

```bash
gpc config init [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--global` | | `boolean` | `false` | Create in user config directory (`~/.config/gpc/`) |

### Example

Interactive init (prompts for app, output format, service account):

```bash
gpc config init
```

```
? Default package name (e.g. com.example.app, blank to skip): com.example.myapp
? Default output format: table
? Service account JSON path (blank to skip): ./service-account-key.json
Configuration file created at: .gpcrc.json
```

Non-interactive init:

```bash
gpc config init --no-interactive
```

Creates a minimal `.gpcrc.json`:

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
  "plugins": ["@gpc/plugin-ci"]
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
  - "@gpc/plugin-ci"
```

---

## `config set`

Set a configuration value in the `.gpcrc.json` file.

### Synopsis

```bash
gpc config set <key> <value>
```

### Options

No command-specific options. The key and value are positional arguments.

Common keys:

| Key | Description | Example |
|-----|-------------|---------|
| `app` | Default package name | `com.example.myapp` |
| `profile` | Default auth profile | `production` |
| `output` | Default output format | `json` |
| `auth.serviceAccount` | Service account path | `./key.json` |
| `developerId` | Developer account ID | `1234567890` |

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

Show the path to the active configuration file.

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
/Users/you/projects/my-app/.gpcrc.json
```

## Configuration File Format

The `.gpcrc.json` file supports these fields:

```json
{
  "app": "com.example.myapp",
  "output": "table",
  "developerId": "1234567890",
  "profile": "production",
  "auth": {
    "serviceAccount": "./service-account-key.json"
  },
  "plugins": [
    "@gpc/plugin-ci"
  ],
  "approvedPlugins": [
    "gpc-plugin-slack"
  ],
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

## Related

- [auth](./auth) -- Authentication and profiles
- [plugins](./plugins) -- Plugin configuration
- [Configuration Guide](/guide/configuration) -- Detailed configuration reference
