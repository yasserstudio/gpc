import { dirname } from "node:path";

import type { Command } from "commander";

import { setDefaultApiLifecycleHooks } from "@gpc-cli/api";
import { PluginManager, discoverPluginEntries } from "@gpc-cli/core";

import { registerSensitivePluginCommand } from "./webhook-args.js";

/**
 * Load and initialize all plugins.
 * Explicitly allowlisted first-party packages are trusted only when their resolved
 * manifest identity exactly matches the configured package specifier.
 * Third-party plugins require prior approval stored in config.
 * Plugin loading is disabled in standalone binary mode.
 */
export async function loadPlugins(): Promise<PluginManager> {
  const manager = new PluginManager();

  // Standalone binary cannot resolve external npm packages at runtime
  if (process.env["__GPC_BINARY"] === "1") {
    setDefaultApiLifecycleHooks(undefined);
    return manager;
  }

  try {
    const { ensurePluginApprovalPolicy, loadConfig } = await import("@gpc-cli/config");
    await ensurePluginApprovalPolicy();
    const config = await loadConfig();
    const projectDir = config.configPath ? dirname(config.configPath) : process.cwd();
    const plugins = await discoverPluginEntries({
      configPlugins: config.plugins,
      approvedPlugins: config.approvedPlugins,
      legacyApprovedPlugins: config.legacyApprovedPlugins,
      cwd: projectDir,
    });

    for (const { plugin, manifest, legacyPermissions } of plugins) {
      try {
        if (legacyPermissions) {
          console.warn(
            `[gpc] Plugin "${plugin.name}" uses legacy broad permissions. Add gpc.permissions to its package.json.`,
          );
        }
        await manager.load(plugin, manifest);
      } catch (error) {
        // Skip plugins that fail to load — don't block the CLI
        const code = (error as { code?: unknown })?.code;
        if (typeof code === "string" && code.startsWith("PLUGIN_")) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[gpc] Skipping plugin "${plugin.name}": ${message}`);
        }
      }
    }
  } catch {
    // Config loading failure shouldn't block plugin-free commands
  }

  if (manager.hasRequestHooks()) {
    setDefaultApiLifecycleHooks({
      beforeRequest: (event) => manager.runBeforeRequest(event),
      afterResponse: (event, response) => manager.runAfterResponse(event, response),
    });
  } else {
    setDefaultApiLifecycleHooks(undefined);
  }

  return manager;
}

/**
 * Register plugin-defined commands with the Commander program.
 */
export function registerPluginCommands(program: Command, manager: PluginManager): void {
  for (const def of manager.getRegisteredCommands()) {
    const cmd = program.command(def.name).description(def.description);

    if (def.arguments) {
      for (const arg of def.arguments) {
        const syntax = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
        cmd.argument(syntax, arg.description);
      }
    }

    if (def.options) {
      for (const opt of def.options) {
        cmd.option(
          opt.flags,
          opt.description,
          opt.defaultValue as string | boolean | string[] | undefined,
        );
      }
    }

    registerSensitivePluginCommand(cmd, def);

    cmd.action(async (...rawArgs: unknown[]) => {
      const opts = rawArgs[rawArgs.length - 2] as Record<string, unknown>;
      const args: Record<string, unknown> = {};

      if (def.arguments) {
        def.arguments.forEach((argDef, i) => {
          args[argDef.name] = rawArgs[i];
        });
      }

      await def.action(args, opts);
    });
  }
}
