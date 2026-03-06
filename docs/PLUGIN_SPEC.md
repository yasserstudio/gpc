# Plugin System Specification

> Phase 7 — designed now, implemented later.

---

## Overview

The plugin system allows third-party developers to extend GPC with custom commands, output formats, integrations, and workflow hooks — without forking the core.

---

## Plugin Interface

```typescript
interface GpcPlugin {
  /** Unique plugin name (npm package name) */
  name: string;

  /** Semver version */
  version: string;

  /** Minimum GPC version required */
  gpcVersion: string;

  /** Required permissions */
  permissions: PluginPermission[];

  /** Called once when plugin is loaded */
  activate(ctx: PluginContext): Promise<void>;

  /** Called when GPC shuts down */
  deactivate?(): Promise<void>;
}
```

## Plugin Context

```typescript
interface PluginContext {
  /** Register new CLI commands */
  commands: CommandRegistry;

  /** Subscribe to lifecycle events */
  hooks: HookRegistry;

  /** GPC logger (respects --verbose, --quiet, --json) */
  logger: Logger;

  /** Read-only access to resolved config */
  config: ResolvedConfig;

  /** Make authenticated API calls (permission-checked) */
  api: ScopedApiClient;
}
```

---

## Lifecycle Hooks

```typescript
interface HookRegistry {
  /** Before any command executes */
  beforeCommand(handler: BeforeCommandHandler): void;

  /** After any command completes successfully */
  afterCommand(handler: AfterCommandHandler): void;

  /** When any command fails */
  onError(handler: ErrorHandler): void;

  /** Before an API request is sent */
  beforeRequest(handler: BeforeRequestHandler): void;

  /** After an API response is received */
  afterResponse(handler: AfterResponseHandler): void;

  /** When output is being formatted */
  formatOutput(handler: OutputFormatter): void;
}

type BeforeCommandHandler = (ctx: {
  command: string;
  args: Record<string, unknown>;
  flags: Record<string, unknown>;
}) => Promise<void | { skip: true; reason: string }>;

type AfterCommandHandler = (ctx: {
  command: string;
  result: CommandResult;
  duration: number;
}) => Promise<void>;

type ErrorHandler = (ctx: {
  command: string;
  error: GpcError;
}) => Promise<void | { handled: true }>;
```

---

## Command Registration

```typescript
interface CommandRegistry {
  /** Register a new top-level command group */
  addGroup(group: CommandGroup): void;

  /** Add a subcommand to an existing group */
  addCommand(group: string, command: CommandDefinition): void;
}

interface CommandGroup {
  name: string;
  description: string;
}

interface CommandDefinition {
  name: string;
  description: string;
  arguments?: ArgumentDef[];
  options?: OptionDef[];
  examples?: string[];
  execute(args: ParsedArgs, ctx: CommandContext): Promise<CommandResult>;
}
```

---

## Permissions

```typescript
type PluginPermission =
  // API scopes
  | "api:apps:read"
  | "api:apps:write"
  | "api:releases:read"
  | "api:releases:write"
  | "api:listings:read"
  | "api:listings:write"
  | "api:reviews:read"
  | "api:reviews:write"
  | "api:vitals:read"
  | "api:subscriptions:read"
  | "api:subscriptions:write"
  | "api:financial:read"
  | "api:users:read"
  | "api:users:write"

  // System scopes
  | "system:network"       // Make arbitrary HTTP requests
  | "system:filesystem"    // Read/write local files
  | "system:exec"          // Execute shell commands
  | "system:env"           // Read environment variables
```

### Permission Enforcement

```
Plugin calls api.releases.list()
        │
        ▼
  Check plugin has "api:releases:read"
        │
   ┌────┴────┐
   │ Allowed  │──► Execute API call
   └─────────┘
   │ Denied   │──► Throw PluginPermissionError
   └─────────┘
```

### First-Run Approval

When a third-party plugin is loaded for the first time:

```
$ gpc releases status

Plugin "gpc-plugin-slack" requests the following permissions:
  - api:releases:read    (read release information)
  - system:network       (send HTTP requests to external services)

Allow? [y/N/always]
```

- `y` — allow for this session
- `always` — save approval to config
- `N` — deny and skip plugin

---

## Plugin Discovery

### Resolution Order

1. **Config file** — explicit plugin list
   ```json
   { "plugins": ["gpc-plugin-slack", "@myorg/gpc-plugin-deploy"] }
   ```

2. **node_modules** — auto-discover by naming convention
   - `@gpc/plugin-*` (first-party, trusted)
   - `gpc-plugin-*` (third-party, permission-checked)

3. **Local file** — relative path
   ```json
   { "plugins": ["./plugins/custom.js"] }
   ```

### Package Convention

Third-party plugins should:
- Name: `gpc-plugin-<name>` or `@scope/gpc-plugin-<name>`
- Export default: `GpcPlugin` implementation
- Declare `gpc` in `peerDependencies`
- Include `keywords: ["gpc-plugin"]` in package.json

---

## Example Plugins

### Slack Notifications

```typescript
import type { GpcPlugin, PluginContext } from "@gpc/plugin-sdk";

const plugin: GpcPlugin = {
  name: "gpc-plugin-slack",
  version: "1.0.0",
  gpcVersion: ">=1.0.0",
  permissions: ["api:releases:read", "system:network"],

  async activate(ctx: PluginContext) {
    ctx.hooks.afterCommand(async ({ command, result }) => {
      if (command.startsWith("releases") && result.success) {
        await sendSlackMessage({
          text: `Release ${result.data.versionName} deployed to ${result.data.track}`,
        });
      }
    });
  },
};

export default plugin;
```

### CI Summary (First-Party)

```typescript
import type { GpcPlugin, PluginContext } from "@gpc/plugin-sdk";

const plugin: GpcPlugin = {
  name: "@gpc/plugin-ci",
  version: "1.0.0",
  gpcVersion: ">=1.0.0",
  permissions: ["api:releases:read", "api:vitals:read", "system:env"],

  async activate(ctx: PluginContext) {
    // Detect CI environment
    const isGitHubActions = !!process.env.GITHUB_ACTIONS;

    if (isGitHubActions) {
      ctx.hooks.afterCommand(async ({ command, result }) => {
        // Write GitHub Actions job summary
        const summary = formatSummary(command, result);
        await appendFile(process.env.GITHUB_STEP_SUMMARY!, summary);
      });
    }
  },
};

export default plugin;
```

### Custom Deploy Gate

```typescript
import type { GpcPlugin, PluginContext } from "@gpc/plugin-sdk";

const plugin: GpcPlugin = {
  name: "gpc-plugin-deploy-gate",
  version: "1.0.0",
  gpcVersion: ">=1.0.0",
  permissions: ["api:releases:read", "api:vitals:read"],

  async activate(ctx: PluginContext) {
    ctx.hooks.beforeCommand(async ({ command, args }) => {
      // Block production releases if vitals are bad
      if (command === "releases promote" && args.to === "production") {
        const vitals = await ctx.api.vitals.overview();
        if (vitals.crashRate > 2.0) {
          return {
            skip: true,
            reason: `Crash rate ${vitals.crashRate}% exceeds 2% threshold`,
          };
        }
      }
    });
  },
};

export default plugin;
```

---

## Plugin Development Workflow

```bash
# Scaffold a new plugin
mkdir gpc-plugin-myname && cd gpc-plugin-myname
npm init -y
npm install @gpc/plugin-sdk --save-peer

# Develop
npm link
cd /path/to/my-app
echo '{"plugins": ["gpc-plugin-myname"]}' > .gpcrc.json
gpc --verbose <command>       # Plugin loads and logs lifecycle

# Test
npm test

# Publish
npm publish
```

---

## Plugin SDK Package Exports

```typescript
// @gpc/plugin-sdk

// Core interfaces
export type { GpcPlugin, PluginContext, PluginPermission };

// Hook types
export type {
  HookRegistry,
  BeforeCommandHandler,
  AfterCommandHandler,
  ErrorHandler,
};

// Command types
export type { CommandRegistry, CommandDefinition, CommandResult };

// Utilities
export { definePlugin };     // Type-safe plugin factory
export { createTestContext }; // Testing helper
```
