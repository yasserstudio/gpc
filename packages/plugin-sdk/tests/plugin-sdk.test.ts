import { describe, it, expect } from "vitest";
import {
  PLUGIN_SDK_VERSION,
  definePlugin,
} from "../src/index";
import type {
  GpcPlugin,
  PluginHooks,
  CommandEvent,
  CommandResult,
  PluginError,
  PluginCommand,
  PluginPermission,
} from "../src/index";

describe("plugin-sdk", () => {
  it("exports PLUGIN_SDK_VERSION", () => {
    expect(PLUGIN_SDK_VERSION).toBe("0.8.0");
  });

  it("definePlugin returns the same plugin object", () => {
    const plugin: GpcPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      register() {},
    };
    const result = definePlugin(plugin);
    expect(result).toBe(plugin);
    expect(result.name).toBe("test-plugin");
    expect(result.version).toBe("1.0.0");
  });

  it("GpcPlugin interface accepts a register function", () => {
    const registered: string[] = [];
    const plugin = definePlugin({
      name: "hook-test",
      version: "0.1.0",
      register(hooks) {
        hooks.beforeCommand(async () => {
          registered.push("before");
        });
        hooks.afterCommand(async () => {
          registered.push("after");
        });
        hooks.onError(async () => {
          registered.push("error");
        });
        hooks.registerCommands((registry) => {
          registry.add({
            name: "custom",
            description: "A custom command",
            action: async () => {},
          });
        });
      },
    });
    expect(plugin.name).toBe("hook-test");
  });

  it("PluginPermission type accepts valid permission strings", () => {
    const perms: PluginPermission[] = [
      "read:config",
      "write:config",
      "read:auth",
      "api:read",
      "api:write",
      "commands:register",
      "hooks:beforeCommand",
      "hooks:afterCommand",
      "hooks:onError",
    ];
    expect(perms).toHaveLength(9);
  });

  it("PluginCommand interface works with options and arguments", () => {
    const cmd: PluginCommand = {
      name: "deploy",
      description: "Deploy the app",
      options: [
        { flags: "--env <env>", description: "Target environment" },
      ],
      arguments: [
        { name: "target", description: "Deploy target", required: true },
      ],
      action: async () => {},
    };
    expect(cmd.name).toBe("deploy");
    expect(cmd.options).toHaveLength(1);
    expect(cmd.arguments).toHaveLength(1);
  });

  it("CommandEvent and CommandResult interfaces are structurally valid", () => {
    const event: CommandEvent = {
      command: "releases upload",
      args: { file: "app.aab", track: "internal" },
      app: "com.example",
      startedAt: new Date(),
    };
    const result: CommandResult = {
      success: true,
      data: { versionCode: 42 },
      durationMs: 1234,
      exitCode: 0,
    };
    expect(event.command).toBe("releases upload");
    expect(result.success).toBe(true);
  });

  it("PluginError interface is structurally valid", () => {
    const error: PluginError = {
      code: "API_FORBIDDEN",
      message: "Permission denied",
      exitCode: 4,
      cause: new Error("original"),
    };
    expect(error.code).toBe("API_FORBIDDEN");
    expect(error.cause).toBeInstanceOf(Error);
  });
});
