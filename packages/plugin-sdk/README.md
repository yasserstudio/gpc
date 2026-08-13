# @gpc-cli/plugin-sdk

Plugin interface for extending [GPC](https://github.com/yasserstudio/gpc) with custom commands, lifecycle hooks, and integrations.

Add Slack notifications, custom release gates, internal dashboards, or any workflow GPC doesn't cover out of the box — without forking the CLI.

## Install

```bash
npm install @gpc-cli/plugin-sdk
```

## Create a Plugin

```typescript
import { definePlugin } from "@gpc-cli/plugin-sdk";
import type { GpcPlugin } from "@gpc-cli/plugin-sdk";

export const plugin: GpcPlugin = definePlugin({
  name: "gpc-plugin-slack",
  version: "1.0.0",

  register(hooks) {
    hooks.afterCommand((event, result) => {
      // Notify Slack after every command
      if (result.success) {
        postToSlack(`${event.command} completed successfully`);
      }
    });

    hooks.onError((_event, error) => {
      postToSlack(`GPC error: ${error.message}`);
    });

    hooks.registerCommands((registry) => {
      registry.add({
        name: "slack:notify",
        description: "Send a Slack notification",
        options: [{ flags: "--channel <channel>", description: "Slack channel" }],
        action: async (_args, options) => {
          await postToSlack(options.channel, "Manual notification from GPC");
        },
      });
    });
  },
});
```

## Lifecycle Hooks

| Hook               | When                        | Use Case                           |
| ------------------ | --------------------------- | ---------------------------------- |
| `beforeCommand`    | Before any CLI command      | Logging, validation, feature flags |
| `afterCommand`     | After a command succeeds    | Notifications, metrics, summaries  |
| `onError`          | When a command fails        | Error reporting, alerting          |
| `beforeRequest`    | Before each GPC API attempt | Request logging, timing            |
| `afterResponse`    | After each GPC API attempt  | Response logging, metrics          |
| `registerCommands` | Plugin initialization       | Add custom commands to the CLI     |

## Permissions

Third-party plugins declare required permissions in `package.json`:

```json
{
  "name": "gpc-plugin-slack",
  "gpc": {
    "permissions": ["hooks:afterCommand", "hooks:onError", "commands:register"]
  }
}
```

| Permission            | Grants                                    |
| --------------------- | ----------------------------------------- |
| `read:config`         | Reserved; no SDK capability yet           |
| `write:config`        | Reserved; no SDK capability yet           |
| `read:auth`           | Reserved; no SDK capability yet           |
| `api:read`            | Reserved; no SDK capability yet           |
| `api:write`           | Reserved; no SDK capability yet           |
| `commands:register`   | Register custom commands                  |
| `hooks:beforeCommand` | Run before any CLI command                |
| `hooks:afterCommand`  | Run after any CLI command                 |
| `hooks:onError`       | Run when a command fails                  |
| `hooks:beforeRequest` | Run before each GPC API transport attempt |
| `hooks:afterResponse` | Run after each GPC API transport attempt  |

Hook permissions are explicit — there is no wildcard. Declare only the hooks your plugin actually uses.

For plugin-defined commands, set `sensitive: true` on every credential-bearing option or positional
argument. GPC will redact those values from lifecycle events and webhook command metadata.

Permissions control registration of GPC-managed hooks and commands; they are not a JavaScript sandbox. Request hooks observe attempts made through `@gpc-cli/api` and do not intercept a plugin's own network calls. Because plugin modules run in the GPC process, only approve packages whose source and publisher you trust.

Third-party plugins require user approval before loading. New approvals require an explicit `gpc.permissions` list; already-approved legacy package names and stable file identities retain compatibility permissions with a deprecation warning. Historical relative paths must be reapproved once because the old approval format did not record their project.

```bash
gpc plugins approve gpc-plugin-slack
```

## Scaffold a Plugin

```bash
gpc plugins init my-plugin
```

Generates a complete plugin project with TypeScript config, tests, and example hooks.

## Part of the GPC Monorepo

See the [Plugin Development Guide](https://yasserstudio.github.io/gpc/advanced/plugins) for full documentation.

## Licensing

Free to use. Source code is on GitHub at [yasserstudio/gpc](https://github.com/yasserstudio/gpc).
