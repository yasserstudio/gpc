# @gpc-cli/config

Configuration loading and validation for GPC. Handles config files, environment variables, profiles, and XDG-compliant paths.

## Install

```bash
npm install @gpc-cli/config
```

## Usage

```typescript
import {
  loadConfig,
  findConfigFile,
  loadEnvConfig,
  getConfigDir,
  initConfig,
} from "@gpc-cli/config";

// Load config (merges file + env vars)
const config = await loadConfig();

// Find .gpcrc.json in cwd or parents
const configPath = findConfigFile();

// Load from environment variables only
const envConfig = loadEnvConfig();

// Get XDG-compliant paths
const configDir = getConfigDir(); // ~/.config/gpc
```

## Config Sources

Configuration is merged in priority order:

1. CLI flags (highest)
2. Environment variables (`GPC_*`)
3. Project config (`.gpcrc.json` in cwd or parents)
4. User config (`~/.config/gpc/config.json`)
5. Defaults (lowest)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GPC_SERVICE_ACCOUNT` | Service account JSON string or file path |
| `GPC_APP` | Default package name |
| `GPC_PROFILE` | Auth profile name |
| `GPC_OUTPUT` | Default output format |
| `GPC_NO_COLOR` | Disable color output |
| `GPC_NO_INTERACTIVE` | Disable prompts |

## Profiles

```typescript
import {
  setProfileConfig,
  listProfiles,
  deleteProfile,
} from "@gpc-cli/config";

// Create a profile
await setProfileConfig("production", {
  serviceAccount: "./keys/prod.json",
});

// List profiles
const profiles = await listProfiles();

// Delete a profile
await deleteProfile("staging");
```

## API

| Function | Description |
|----------|-------------|
| `loadConfig()` | Load merged config from all sources |
| `findConfigFile()` | Find `.gpcrc.json` in cwd or parent directories |
| `loadEnvConfig()` | Load config from `GPC_*` env vars |
| `initConfig()` | Create initial `.gpcrc.json` |
| `setConfigValue()` | Set a config key/value |
| `getConfigDir()` | XDG config directory (`~/.config/gpc`) |
| `getDataDir()` | XDG data directory (`~/.local/share/gpc`) |
| `getCacheDir()` | XDG cache directory (`~/.cache/gpc`) |
| `listProfiles()` | List saved auth profiles |
| `setProfileConfig()` | Create or update a profile |
| `deleteProfile()` | Delete a profile |
| `approvePlugin()` | Approve a third-party plugin |
| `revokePluginApproval()` | Revoke plugin approval |

## Part of the GPC Monorepo

This is the config layer for [GPC](https://github.com/yasserstudio/gpc).

## License

MIT
