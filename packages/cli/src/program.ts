import { Command } from "commander";
import type { PluginManager } from "@gpc-cli/core";
import type { CommandEvent, CommandResult } from "@gpc-cli/plugin-sdk";
import { registerPluginCommands } from "./plugins.js";

export async function createProgram(pluginManager?: PluginManager): Promise<Command> {
  const program = new Command();

  program
    .name("gpc")
    .description("The complete Google Play CLI")
    .version(process.env["__GPC_VERSION"] || "0.0.0", "-V, --version")
    .option("-o, --output <format>", "Output format: table, json, yaml, markdown")
    .option("-v, --verbose", "Enable debug logging")
    .option("-q, --quiet", "Suppress non-essential output")
    .option("-a, --app <package>", "App package name")
    .option("-p, --profile <name>", "Auth profile name")
    .option("--no-color", "Disable colored output")
    .option("--no-interactive", "Disable interactive prompts")
    .option("-y, --yes", "Skip confirmation prompts")
    .option("--dry-run", "Preview changes without executing")
    .option("--notify [target]", "Send webhook notification on completion (slack, discord, custom)");

  const commandLoaders: Record<string, () => Promise<void>> = {
    auth: async () => {
      (await import("./commands/auth.js")).registerAuthCommands(program);
    },
    config: async () => {
      (await import("./commands/config.js")).registerConfigCommands(program);
    },
    doctor: async () => {
      (await import("./commands/doctor.js")).registerDoctorCommand(program);
    },
    docs: async () => {
      (await import("./commands/docs.js")).registerDocsCommand(program);
    },
    completion: async () => {
      (await import("./commands/completion.js")).registerCompletionCommand(program);
    },
    apps: async () => {
      (await import("./commands/apps.js")).registerAppsCommands(program);
    },
    releases: async () => {
      (await import("./commands/releases.js")).registerReleasesCommands(program);
    },
    tracks: async () => {
      (await import("./commands/tracks.js")).registerTracksCommands(program);
    },
    status: async () => {
      (await import("./commands/status.js")).registerStatusCommand(program);
    },
    listings: async () => {
      (await import("./commands/listings.js")).registerListingsCommands(program);
    },
    reviews: async () => {
      (await import("./commands/reviews.js")).registerReviewsCommands(program);
    },
    vitals: async () => {
      (await import("./commands/vitals.js")).registerVitalsCommands(program);
    },
    subscriptions: async () => {
      (await import("./commands/subscriptions.js")).registerSubscriptionsCommands(program);
    },
    iap: async () => {
      (await import("./commands/iap.js")).registerIapCommands(program);
    },
    purchases: async () => {
      (await import("./commands/purchases.js")).registerPurchasesCommands(program);
    },
    pricing: async () => {
      (await import("./commands/pricing.js")).registerPricingCommands(program);
    },
    reports: async () => {
      (await import("./commands/reports.js")).registerReportsCommands(program);
    },
    users: async () => {
      (await import("./commands/users.js")).registerUsersCommands(program);
    },
    testers: async () => {
      (await import("./commands/testers.js")).registerTestersCommands(program);
    },
    validate: async () => {
      (await import("./commands/validate.js")).registerValidateCommand(program);
    },
    publish: async () => {
      (await import("./commands/publish.js")).registerPublishCommand(program);
    },
    recovery: async () => {
      (await import("./commands/recovery.js")).registerRecoveryCommands(program);
    },
    "data-safety": async () => {
      (await import("./commands/data-safety.js")).registerDataSafetyCommands(program);
    },
    "external-transactions": async () => {
      (await import("./commands/external-transactions.js")).registerExternalTransactionsCommands(
        program,
      );
    },
    plugins: async () => {
      registerPluginsCommand(program, pluginManager);
    },
  };

  // Resolve command aliases for lazy loading
  const commandAliases: Record<string, string> = {
    "ext-txn": "external-transactions",
  };

  const rawTarget = process.argv[2];
  const target = rawTarget ? (commandAliases[rawTarget] ?? rawTarget) : undefined;

  const loader = target ? commandLoaders[target] : undefined;
  if (loader) {
    await loader();
  } else {
    await Promise.all(Object.values(commandLoaders).map((loader) => loader()));
  }

  // Register plugin-defined commands
  if (pluginManager) {
    registerPluginCommands(program, pluginManager);
  }

  // Wire plugin lifecycle hooks around command execution
  if (pluginManager) {
    wrapCommandHooks(program, pluginManager);
  }

  return program;
}

/**
 * `gpc plugins` — manage plugins.
 */
function registerPluginsCommand(program: Command, manager?: PluginManager): void {
  const cmd = program.command("plugins").description("Manage plugins");

  cmd
    .command("list")
    .description("List loaded plugins")
    .action(() => {
      const plugins = manager?.getLoadedPlugins() ?? [];
      const opts = program.opts();

      if (opts["output"] === "json") {
        console.log(JSON.stringify(plugins, null, 2));
        return;
      }

      if (plugins.length === 0) {
        console.log("No plugins loaded.");
        console.log('\nConfigure plugins in .gpcrc.json: { "plugins": ["@gpc-cli/plugin-ci"] }');
        return;
      }

      console.log("Loaded plugins:\n");
      for (const p of plugins) {
        const trust = p.trusted ? "trusted" : "third-party";
        console.log(`  ${p.name}@${p.version} (${trust})`);
      }

      const commands = manager?.getRegisteredCommands() ?? [];
      if (commands.length > 0) {
        console.log("\nPlugin commands:\n");
        for (const c of commands) {
          console.log(`  gpc ${c.name} — ${c.description}`);
        }
      }
    });

  cmd
    .command("init <name>")
    .description("Scaffold a new plugin project")
    .option("-d, --dir <path>", "Output directory (defaults to ./gpc-plugin-<name>)")
    .option("--description <text>", "Plugin description")
    .action(async (name: string, opts: { dir?: string; description?: string }) => {
      const { scaffoldPlugin } = await import("@gpc-cli/core");
      const pluginName = name.startsWith("gpc-plugin-") ? name : `gpc-plugin-${name}`;
      const dir = opts.dir ?? `./${pluginName}`;

      const result = await scaffoldPlugin({ name, dir, description: opts.description });

      console.log(`Plugin scaffolded at ${result.dir}/\n`);
      console.log("Files created:");
      for (const f of result.files) {
        console.log(`  ${f}`);
      }
      console.log(`\nNext steps:`);
      console.log(`  cd ${pluginName}`);
      console.log(`  npm install`);
      console.log(`  npm run build`);
      console.log(`  npm test`);
    });

  cmd
    .command("approve <name>")
    .description("Approve a third-party plugin for loading")
    .action(async (name: string) => {
      const { approvePlugin } = await import("@gpc-cli/config");
      await approvePlugin(name);
      console.log(`Plugin "${name}" approved. It will be loaded on next run.`);
    });

  cmd
    .command("revoke <name>")
    .description("Revoke approval for a third-party plugin")
    .action(async (name: string) => {
      const { revokePluginApproval } = await import("@gpc-cli/config");
      const removed = await revokePluginApproval(name);
      if (removed) {
        console.log(`Plugin "${name}" approval revoked.`);
      } else {
        console.log(`Plugin "${name}" was not in the approved list.`);
      }
    });
}

/**
 * Wrap all registered commands so plugin hooks fire before/after each command.
 */
function wrapCommandHooks(program: Command, manager: PluginManager): void {
  program.hook("preAction", async (thisCommand) => {
    const event: CommandEvent = {
      command: getFullCommandName(thisCommand),
      args: thisCommand.opts(),
      app: program.opts()["app"] as string | undefined,
      startedAt: new Date(),
    };

    // Store on the command for afterCommand/onError
    (thisCommand as unknown as Record<string, unknown>)["__pluginEvent"] = event;

    await manager.runBeforeCommand(event);
  });

  program.hook("postAction", async (thisCommand) => {
    const event: CommandEvent = (thisCommand as unknown as Record<string, unknown>)[
      "__pluginEvent"
    ] as CommandEvent;
    if (!event) return;

    const result: CommandResult = {
      success: true,
      durationMs: Date.now() - event.startedAt.getTime(),
      exitCode: 0,
    };

    await manager.runAfterCommand(event, result);
  });
}

function getFullCommandName(cmd: Command): string {
  const parts: string[] = [];
  let current: Command | null = cmd;
  while (current && current.name() !== "gpc") {
    parts.unshift(current.name());
    current = current.parent;
  }
  return parts.join(" ");
}
