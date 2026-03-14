# @gpc-cli/plugin-sdk

Plugin interface for extending [GPC](https://github.com/yasserstudio/gpc) with custom commands, lifecycle hooks, and integrations.

## Install

```bash
npm install @gpc-cli/plugin-sdk
```

## Create a Plugin

```typescript
import { definePlugin } from "@gpc-cli/plugin-sdk";
import type { GpcPlugin } from "@gpc-cli/plugin-sdk";

export const myPlugin: GpcPlugin = definePlugin({
  name: "gpc-plugin-slack",
  version: "1.0.0",

  hooks: {
    afterCommand({ command, result }) {
      // Notify Slack after every command
      if (result.success) {
        postToSlack(`${command} completed successfully`);
      }
    },

    onError({ error }) {
      postToSlack(`GPC error: ${error.message}`);
    },

    registerCommands(registry) {
      registry.addCommand({
        name: "slack:notify",
        description: "Send a Slack notification",
        options: [{ flags: "--channel <channel>", description: "Slack channel" }],
        action: async (opts) => {
          await postToSlack(opts.channel, "Manual notification from GPC");
        },
      });
    },
  },
});
```

## Lifecycle Hooks

| Hook               | When                    | Use Case                           |
| ------------------ | ----------------------- | ---------------------------------- |
| `beforeCommand`    | Before any CLI command  | Logging, validation, feature flags |
| `afterCommand`     | After command completes | Notifications, metrics, summaries  |
| `onError`          | When a command fails    | Error reporting, alerting          |
| `beforeRequest`    | Before each API call    | Request logging, headers           |
| `afterResponse`    | After each API response | Response logging, metrics          |
| `registerCommands` | Plugin initialization   | Add custom commands to the CLI     |

## Permissions

Plugins declare required permissions in their manifest:

```typescript
const plugin: GpcPlugin = {
  name: "my-plugin",
  version: "1.0.0",
  manifest: {
    permissions: ["api:read", "hooks:afterCommand"],
  },
  hooks: { ... },
};
```

| Permission          | Grants                      |
| ------------------- | --------------------------- |
| `read:config`       | Read GPC configuration      |
| `write:config`      | Modify GPC configuration    |
| `read:auth`         | Access auth credentials     |
| `api:read`          | Read-only API access        |
| `api:write`         | Write API access            |
| `commands:register` | Register custom commands    |
| `hooks:*`           | Subscribe to specific hooks |

Third-party plugins require user approval before loading:

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

## License

MIT
