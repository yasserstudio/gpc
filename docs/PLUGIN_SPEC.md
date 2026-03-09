# Plugin System

> Phase 8 — implemented in `@gpc-cli/plugin-sdk`, `@gpc-cli/core` (PluginManager), and `@gpc-cli/plugin-ci`.

---

## Overview

The plugin system allows extending GPC with custom commands, lifecycle hooks, and integrations — without forking the core. First-party plugins (`@gpc-cli/*`) are auto-trusted; third-party plugins require permission validation.

---

## Plugin Interface

```typescript
interface GpcPlugin {
  /** Unique plugin name (e.g., "@gpc-cli/plugin-ci" or "gpc-plugin-slack") */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Called once when the plugin is loaded. Register hooks here. */
  register(hooks: PluginHooks): void | Promise<void>;
}
```

## Lifecycle Hooks

```typescript
interface PluginHooks {
  /** Run before a command executes */
  beforeCommand(handler: BeforeCommandHandler): void;

  /** Run after a command completes successfully */
  afterCommand(handler: AfterCommandHandler): void;

  /** Run when a command fails with an error */
  onError(handler: ErrorHandler): void;

  /** Register additional CLI commands from the plugin */
  registerCommands(handler: CommandRegistrar): void;

  /** Run before an API request is sent */
  beforeRequest(handler: BeforeRequestHandler): void;

  /** Run after an API response is received */
  afterResponse(handler: AfterResponseHandler): void;
}

type BeforeCommandHandler = (ctx: CommandEvent) => void | Promise<void>;
type AfterCommandHandler = (ctx: CommandEvent, result: CommandResult) => void | Promise<void>;
type ErrorHandler = (ctx: CommandEvent, error: PluginError) => void | Promise<void>;
type CommandRegistrar = (registry: CommandRegistry) => void;
type BeforeRequestHandler = (event: RequestEvent) => void | Promise<void>;
type AfterResponseHandler = (event: ResponseEvent) => void | Promise<void>;
```

---

## Event Types

```typescript
interface CommandEvent {
  command: string;                    // e.g., "releases upload"
  args: Record<string, unknown>;     // Resolved arguments
  app?: string;                      // Package name (if available)
  startedAt: Date;                   // When the command started
}

interface CommandResult {
  success: boolean;
  data?: unknown;
  durationMs: number;
  exitCode: number;
}

interface PluginError {
  code: string;
  message: string;
  exitCode: number;
  cause?: Error;
}

interface RequestEvent {
  method: string;
  path: string;
  startedAt: Date;
}

interface ResponseEvent {
  status: number;
  durationMs: number;
  ok: boolean;
}
```

---

## Command Registration

Plugins can add new CLI commands:

```typescript
interface CommandRegistry {
  add(definition: PluginCommand): void;
}

interface PluginCommand {
  name: string;
  description: string;
  options?: PluginCommandOption[];
  arguments?: PluginCommandArgument[];
  action: (args: Record<string, unknown>, options: Record<string, unknown>) => void | Promise<void>;
}
```

---

## Permissions

```typescript
type PluginPermission =
  | "read:config"
  | "write:config"
  | "read:auth"
  | "api:read"
  | "api:write"
  | "commands:register"
  | "hooks:beforeCommand"
  | "hooks:afterCommand"
  | "hooks:onError"
  | "hooks:beforeRequest"
  | "hooks:afterResponse";
```

### Trust Model

| Plugin Type | Pattern | Trust | Permissions |
|-------------|---------|-------|-------------|
| First-party | `@gpc-cli/plugin-*` | Auto-trusted | No checks |
| Third-party | `gpc-plugin-*` | Untrusted | Validated against manifest |

Third-party plugins must declare permissions in their `PluginManifest`. Unknown permissions throw `PLUGIN_INVALID_PERMISSION` (exit code 10).

---

## Plugin Discovery

### Resolution Order

1. **Config file** — explicit plugin list
   ```json
   { "plugins": ["@gpc-cli/plugin-ci", "gpc-plugin-slack"] }
   ```

2. **node_modules** — auto-discover by naming convention
   - `@gpc-cli/plugin-*` (first-party, trusted)
   - `gpc-plugin-*` (third-party, permission-checked)

3. **Local file** — relative path
   ```json
   { "plugins": ["./plugins/custom.js"] }
   ```

### Module Resolution

Plugins are loaded via dynamic `import()`. The resolver checks:
1. Default export → `GpcPlugin`
2. Named `plugin` export → `GpcPlugin`
3. Module itself → duck-typed check for `name`, `version`, `register`

---

## PluginManager (Core)

The `PluginManager` class in `@gpc-cli/core` orchestrates the plugin lifecycle:

```typescript
class PluginManager {
  load(plugin: GpcPlugin, manifest?: PluginManifest): Promise<void>;
  runBeforeCommand(event: CommandEvent): Promise<void>;
  runAfterCommand(event: CommandEvent, result: CommandResult): Promise<void>;
  runOnError(event: CommandEvent, error: PluginError): Promise<void>;
  getRegisteredCommands(): PluginCommand[];
  getLoadedPlugins(): LoadedPlugin[];
  reset(): void;  // For testing
}
```

Key behaviors:
- `runOnError` swallows handler errors to prevent cascading failures
- Hooks run sequentially in registration order
- `reset()` clears all state (used in tests)

---

## First-Party Plugin: `@gpc-cli/plugin-ci`

CI/CD environment detection and GitHub Actions integration.

### CI Detection

Detects 5 CI providers + generic `CI=true`:

| Provider | Detection | Build ID | Branch | Step Summary |
|----------|-----------|----------|--------|-------------|
| GitHub Actions | `GITHUB_ACTIONS=true` | `GITHUB_RUN_ID` | `GITHUB_REF_NAME` | Yes |
| GitLab CI | `GITLAB_CI=true` | `CI_JOB_ID` | `CI_COMMIT_BRANCH` | No |
| Jenkins | `JENKINS_URL` set | `BUILD_NUMBER` | `BRANCH_NAME` | No |
| CircleCI | `CIRCLECI=true` | `CIRCLE_BUILD_NUM` | `CIRCLE_BRANCH` | No |
| Bitrise | `BITRISE_IO=true` | `BITRISE_BUILD_NUMBER` | `BITRISE_GIT_BRANCH` | No |
| Generic | `CI=true` | — | — | No |

### GitHub Actions Step Summary

When running in GitHub Actions with `$GITHUB_STEP_SUMMARY` available, the plugin:
- Writes a markdown table after each command (app, duration, exit code)
- Writes error details on command failure (error code, message)

---

## Example: Writing a Plugin

```typescript
import { definePlugin } from "@gpc-cli/plugin-sdk";

export const myPlugin = definePlugin({
  name: "gpc-plugin-slack",
  version: "1.0.0",

  register(hooks) {
    hooks.afterCommand(async (event, result) => {
      if (event.command.startsWith("releases") && result.success) {
        await notifySlack(`Released ${event.app} via gpc ${event.command}`);
      }
    });
  },
});
```

---

## Plugin SDK Exports

```typescript
// @gpc-cli/plugin-sdk

// Core interfaces
export type { GpcPlugin, PluginHooks, PluginManifest, PluginPermission };

// Hook handler types
export type { BeforeCommandHandler, AfterCommandHandler, ErrorHandler, CommandRegistrar };
export type { BeforeRequestHandler, AfterResponseHandler };

// Event types
export type { CommandEvent, CommandResult, PluginError, RequestEvent, ResponseEvent };

// Event types
export type { CommandEvent, CommandResult, PluginError };

// Command types
export type { CommandRegistry, PluginCommand, PluginCommandOption, PluginCommandArgument };

// Helpers
export { definePlugin };  // Type-safe plugin factory
```
