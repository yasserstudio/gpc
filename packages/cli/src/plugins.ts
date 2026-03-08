import { PluginManager, discoverPlugins } from "@gpc/core";
import type { GpcPlugin } from "@gpc/plugin-sdk";
import type { Command } from "commander";

/**
 * Load and initialize all plugins.
 * First-party plugins (@gpc/*) are auto-trusted.
 * Third-party plugins require prior approval stored in config.
 */
export async function loadPlugins(): Promise<PluginManager> {
  const manager = new PluginManager();

  try {
    const { loadConfig } = await import("@gpc/config");
    const config = await loadConfig();
    const plugins = await discoverPlugins({ configPlugins: config.plugins });
    const approved = new Set(config.approvedPlugins ?? []);

    for (const plugin of plugins) {
      const isTrusted = plugin.name.startsWith("@gpc/");

      if (!isTrusted && !approved.has(plugin.name)) {
        // Skip unapproved third-party plugins silently in non-interactive mode
        // In interactive mode, the user would run `gpc plugins approve <name>` first
        const isQuiet = process.argv.includes("--quiet") || process.argv.includes("-q");
        if (!isQuiet) {
          console.error(
            `Plugin "${plugin.name}" is not approved. Run: gpc plugins approve ${plugin.name}`,
          );
        }
        continue;
      }

      try {
        await manager.load(plugin);
      } catch {
        // Skip plugins that fail to load — don't block the CLI
      }
    }
  } catch {
    // Config loading failure shouldn't block plugin-free commands
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
        cmd.option(opt.flags, opt.description, opt.defaultValue);
      }
    }

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
