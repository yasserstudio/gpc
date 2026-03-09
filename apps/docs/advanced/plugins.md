---
outline: deep
---

# Plugin Development

Extend GPC with custom commands, lifecycle hooks, and integrations -- without forking the core. Plugins can react to command execution, register new CLI commands, and intercept API requests.

## Plugin Interface

Every GPC plugin implements the `GpcPlugin` interface:

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

Six hooks are available. Register them in the `register()` method.

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
```

### Handler Signatures

```typescript
type BeforeCommandHandler = (ctx: CommandEvent) => void | Promise<void>;
type AfterCommandHandler = (ctx: CommandEvent, result: CommandResult) => void | Promise<void>;
type ErrorHandler = (ctx: CommandEvent, error: PluginError) => void | Promise<void>;
type CommandRegistrar = (registry: CommandRegistry) => void;
type BeforeRequestHandler = (event: RequestEvent) => void | Promise<void>;
type AfterResponseHandler = (event: ResponseEvent) => void | Promise<void>;
```

## Event Types

### CommandEvent

Passed to `beforeCommand`, `afterCommand`, and `onError` handlers.

```typescript
interface CommandEvent {
  command: string;                    // e.g., "releases upload"
  args: Record<string, unknown>;     // Resolved arguments
  app?: string;                      // Package name (if available)
  startedAt: Date;                   // When the command started
}
```

### CommandResult

Passed to `afterCommand` handlers.

```typescript
interface CommandResult {
  success: boolean;
  data?: unknown;
  durationMs: number;
  exitCode: number;
}
```

### PluginError

Passed to `onError` handlers.

```typescript
interface PluginError {
  code: string;
  message: string;
  exitCode: number;
  cause?: Error;
}
```

### RequestEvent

Passed to `beforeRequest` handlers.

```typescript
interface RequestEvent {
  method: string;
  path: string;
  startedAt: Date;
}
```

### ResponseEvent

Passed to `afterResponse` handlers.

```typescript
interface ResponseEvent {
  status: number;
  durationMs: number;
  ok: boolean;
}
```

## Command Registration

Plugins can add new CLI commands through the `registerCommands` hook.

```typescript
interface CommandRegistry {
  add(definition: PluginCommand): void;
}

interface PluginCommand {
  name: string;
  description: string;
  options?: PluginCommandOption[];
  arguments?: PluginCommandArgument[];
  action: (
    args: Record<string, unknown>,
    options: Record<string, unknown>
  ) => void | Promise<void>;
}
```

### Example: Adding a Custom Command

```typescript
hooks.registerCommands((registry) => {
  registry.add({
    name: "notify",
    description: "Send release notification to Slack",
    options: [
      { flags: "--channel <channel>", description: "Slack channel", required: true },
      { flags: "--message <message>", description: "Custom message" },
    ],
    action: async (args, options) => {
      const channel = options.channel as string;
      const message = options.message as string || "New release published";
      await sendSlackMessage(channel, message);
    },
  });
});
```

Registered commands appear under `gpc <command-name>` and show up in `gpc --help`.

## Permissions

Third-party plugins must declare required permissions in their `PluginManifest`.

```typescript
type PluginPermission =
  | "read:config"            // Read configuration values
  | "write:config"           // Modify configuration
  | "read:auth"              // Read authentication state
  | "api:read"               // Read data from Google Play API
  | "api:write"              // Write data to Google Play API
  | "commands:register"      // Register new CLI commands
  | "hooks:beforeCommand"    // Hook into pre-command execution
  | "hooks:afterCommand"     // Hook into post-command execution
  | "hooks:onError"          // Hook into error handling
  | "hooks:beforeRequest"    // Hook into pre-API-request
  | "hooks:afterResponse";   // Hook into post-API-response
```

### Trust Model

| Plugin Type | Name Pattern | Trust Level | Permission Check |
|-------------|-------------|-------------|-----------------|
| First-party | `@gpc-cli/plugin-*` | Auto-trusted | No checks |
| Third-party | `gpc-plugin-*` | Untrusted | Validated against manifest |

Third-party plugins that use hooks or APIs without declaring the corresponding permission throw `PLUGIN_INVALID_PERMISSION` (exit code 10).

### Manifest Declaration

```typescript
interface PluginManifest {
  name: string;
  version: string;
  permissions?: PluginPermission[];
  trusted?: boolean;  // Only true for @gpc-cli/* packages
}
```

## Plugin Discovery

Plugins are discovered in this order:

### 1. Config File (explicit)

```json
{
  "plugins": ["@gpc-cli/plugin-ci", "gpc-plugin-slack"]
}
```

### 2. node_modules (auto-discover by naming convention)

- `@gpc-cli/plugin-*` -- first-party, auto-trusted
- `gpc-plugin-*` -- third-party, permission-checked

### 3. Local File (relative path)

```json
{
  "plugins": ["./plugins/custom.js"]
}
```

### Module Resolution

Plugins are loaded via dynamic `import()`. The resolver checks for:

1. Default export implementing `GpcPlugin`
2. Named `plugin` export implementing `GpcPlugin`
3. Module itself -- duck-typed check for `name`, `version`, `register`

## PluginManager

The `PluginManager` class in `@gpc-cli/core` orchestrates the full plugin lifecycle.

```typescript
class PluginManager {
  load(plugin: GpcPlugin, manifest?: PluginManifest): Promise<void>;
  runBeforeCommand(event: CommandEvent): Promise<void>;
  runAfterCommand(event: CommandEvent, result: CommandResult): Promise<void>;
  runOnError(event: CommandEvent, error: PluginError): Promise<void>;
  getRegisteredCommands(): PluginCommand[];
  getLoadedPlugins(): LoadedPlugin[];
  reset(): void;
}
```

Key behaviors:

- `runOnError` swallows handler errors to prevent cascading failures
- Hooks run sequentially in registration order
- `reset()` clears all state (used in tests)

## @gpc-cli/plugin-ci

The built-in CI/CD plugin. Detects CI environments and writes GitHub Actions step summaries.

### CI Detection

| Provider | Detection | Build ID | Branch | Step Summary |
|----------|-----------|----------|--------|-------------|
| GitHub Actions | `GITHUB_ACTIONS=true` | `GITHUB_RUN_ID` | `GITHUB_REF_NAME` | Yes |
| GitLab CI | `GITLAB_CI=true` | `CI_JOB_ID` | `CI_COMMIT_BRANCH` | No |
| Jenkins | `JENKINS_URL` set | `BUILD_NUMBER` | `BRANCH_NAME` | No |
| CircleCI | `CIRCLECI=true` | `CIRCLE_BUILD_NUM` | `CIRCLE_BRANCH` | No |
| Bitrise | `BITRISE_IO=true` | `BITRISE_BUILD_NUMBER` | `BITRISE_GIT_BRANCH` | No |
| Generic | `CI=true` | -- | -- | No |

### GitHub Actions Step Summary

When running in GitHub Actions with `$GITHUB_STEP_SUMMARY` available, the plugin:

- Writes a markdown table after each command (app, duration, exit code)
- Writes error details on command failure (error code, message)

## Example: Slack Notification Plugin

A complete example plugin that sends Slack notifications on release commands.

```typescript
// gpc-plugin-slack/src/index.ts
import { definePlugin } from "@gpc-cli/plugin-sdk";

export const plugin = definePlugin({
  name: "gpc-plugin-slack",
  version: "1.0.0",

  register(hooks) {
    // Notify on successful releases
    hooks.afterCommand(async (event, result) => {
      if (!event.command.startsWith("releases") || !result.success) {
        return;
      }

      const webhook = process.env.SLACK_WEBHOOK_URL;
      if (!webhook) {
        return;
      }

      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Released ${event.app} via \`gpc ${event.command}\` (${result.durationMs}ms)`,
        }),
      });
    });

    // Alert on errors
    hooks.onError(async (event, error) => {
      const webhook = process.env.SLACK_WEBHOOK_URL;
      if (!webhook) {
        return;
      }

      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `GPC error in \`gpc ${event.command}\`: ${error.code} - ${error.message}`,
        }),
      });
    });
  },
});
```

### Manifest for the Slack Plugin

```json
{
  "name": "gpc-plugin-slack",
  "version": "1.0.0",
  "gpc": {
    "permissions": [
      "hooks:afterCommand",
      "hooks:onError"
    ]
  }
}
```

## Example: Audit Log Plugin

A plugin that logs all command executions to a file.

```typescript
import { definePlugin } from "@gpc-cli/plugin-sdk";
import { appendFileSync } from "node:fs";

export const plugin = definePlugin({
  name: "gpc-plugin-audit",
  version: "1.0.0",

  register(hooks) {
    const logFile = process.env.GPC_AUDIT_LOG || "gpc-audit.jsonl";

    hooks.afterCommand(async (event, result) => {
      const entry = {
        timestamp: new Date().toISOString(),
        command: event.command,
        app: event.app,
        success: result.success,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      };
      appendFileSync(logFile, JSON.stringify(entry) + "\n");
    });

    hooks.onError(async (event, error) => {
      const entry = {
        timestamp: new Date().toISOString(),
        command: event.command,
        app: event.app,
        error: error.code,
        message: error.message,
      };
      appendFileSync(logFile, JSON.stringify(entry) + "\n");
    });
  },
});
```

## Plugin SDK Exports

Everything you need to build a plugin is exported from `@gpc-cli/plugin-sdk`:

```typescript
// Core interfaces
export type { GpcPlugin, PluginHooks, PluginManifest, PluginPermission };

// Hook handler types
export type { BeforeCommandHandler, AfterCommandHandler, ErrorHandler, CommandRegistrar };
export type { BeforeRequestHandler, AfterResponseHandler };

// Event types
export type { CommandEvent, CommandResult, PluginError, RequestEvent, ResponseEvent };

// Command types
export type { CommandRegistry, PluginCommand, PluginCommandOption, PluginCommandArgument };

// Helpers
export { definePlugin };  // Type-safe plugin factory
```

## Scaffolding a New Plugin

Use the built-in generator to create a plugin project:

```bash
gpc plugins init my-plugin
```

This creates a directory with:
- `package.json` with `@gpc-cli/plugin-sdk` peer dependency
- `tsconfig.json` configured for ESM
- `src/index.ts` with a plugin skeleton using `definePlugin()`
- Basic test file

## Plugin CLI Commands

```bash
gpc plugins list                # Show loaded plugins and their status
gpc plugins init <name>         # Scaffold a new plugin project
gpc plugins approve <name>      # Approve a third-party plugin (first-run prompt)
gpc plugins revoke <name>       # Revoke plugin approval
```
