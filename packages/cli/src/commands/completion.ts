import type { Command, Option } from "commander";

export type ShellType = "bash" | "zsh" | "fish" | "powershell";

export const SUPPORTED_SHELLS: readonly ShellType[] = [
  "bash",
  "zsh",
  "fish",
  "powershell",
] as const;

export interface OptionDef {
  flags: string;
  long?: string;
  short?: string;
  description: string;
  choices?: string[];
  takesValue: boolean;
}

export interface CommandDef {
  description: string;
  subcommands?: Record<string, CommandDef>;
  options?: OptionDef[];
}

/**
 * Hand-maintained fallback tree. Used by unit tests and as a safety net when
 * the walker cannot introspect the program (e.g. when the generator is called
 * without a live Command instance). Runtime `gpc completion <shell>` uses the
 * introspected tree from `buildCommandTreeFromProgram` so new commands and
 * plugins auto-complete without requiring edits here.
 */
export function getCommandTree(): Record<string, CommandDef> {
  return {
    auth: {
      description: "Manage authentication",
      subcommands: {
        login: { description: "Authenticate with Google Play Developer API" },
        status: { description: "Show current authentication status" },
        logout: { description: "Remove stored credentials" },
        whoami: { description: "Show the authenticated account" },
      },
    },
    config: {
      description: "Manage configuration",
      subcommands: {
        init: { description: "Create a configuration file" },
        show: { description: "Show current configuration" },
        set: { description: "Set a configuration value" },
        path: { description: "Show the configuration file path" },
      },
    },
    apps: {
      description: "Manage applications",
      subcommands: {
        info: { description: "Show app details" },
        update: { description: "Update app details" },
        list: { description: "List configured applications" },
      },
    },
    releases: {
      description: "Manage releases and rollouts",
      subcommands: {
        upload: { description: "Upload AAB/APK and assign to a track" },
        status: { description: "Show current release status across tracks" },
        promote: { description: "Promote a release from one track to another" },
        rollout: {
          description: "Manage staged rollouts",
          subcommands: {
            increase: { description: "Increase a staged rollout" },
            halt: { description: "Halt a staged rollout" },
            resume: { description: "Resume a staged rollout" },
            complete: { description: "Complete a staged rollout" },
          },
        },
        notes: { description: "Set release notes" },
      },
    },
    tracks: {
      description: "Manage tracks",
      subcommands: {
        list: { description: "List all tracks" },
      },
    },
    status: { description: "Cross-track release overview" },
    listings: {
      description: "Manage store listings and metadata",
      subcommands: {
        get: { description: "Get store listing(s)" },
        update: { description: "Update a store listing" },
        delete: { description: "Delete a store listing for a language" },
        pull: { description: "Download listings to Fastlane-format directory" },
        push: { description: "Upload listings from Fastlane-format directory" },
        images: {
          description: "Manage listing images",
          subcommands: {
            list: { description: "List images for a language and type" },
            upload: { description: "Upload an image" },
            delete: { description: "Delete an image" },
          },
        },
        availability: { description: "Get country availability for a track" },
      },
    },
    reviews: {
      description: "Manage user reviews and ratings",
      subcommands: {
        list: { description: "List user reviews" },
        get: { description: "Get a single review" },
        reply: { description: "Reply to a review" },
        export: { description: "Export reviews to JSON or CSV" },
      },
    },
    vitals: {
      description: "Monitor app vitals and performance metrics",
      subcommands: {
        overview: { description: "Dashboard summary of all vital metrics" },
        crashes: { description: "Query crash rate metrics" },
        anr: { description: "Query ANR rate metrics" },
        startup: { description: "Query slow startup metrics" },
        rendering: { description: "Query slow rendering metrics" },
        battery: { description: "Query excessive wakeup metrics" },
        memory: { description: "Query stuck wakelock metrics" },
        anomalies: { description: "Detect anomalies in app vitals" },
        errors: {
          description: "Search and view error issues",
          subcommands: {
            search: { description: "Search error issues" },
          },
        },
        compare: { description: "Compare metric trend between periods" },
      },
    },
    subscriptions: {
      description: "Manage subscriptions and base plans",
      subcommands: {
        list: { description: "List subscriptions" },
        get: { description: "Get a subscription" },
        create: { description: "Create a subscription from JSON file" },
        update: { description: "Update a subscription from JSON file" },
        delete: { description: "Delete a subscription" },
        "base-plans": {
          description: "Manage base plans",
          subcommands: {
            activate: { description: "Activate a base plan" },
            deactivate: { description: "Deactivate a base plan" },
            delete: { description: "Delete a base plan" },
            "migrate-prices": { description: "Migrate base plan prices" },
          },
        },
        offers: {
          description: "Manage subscription offers",
          subcommands: {
            list: { description: "List offers for a base plan" },
            get: { description: "Get an offer" },
            create: { description: "Create an offer from JSON file" },
            update: { description: "Update an offer from JSON file" },
            delete: { description: "Delete an offer" },
            activate: { description: "Activate an offer" },
            deactivate: { description: "Deactivate an offer" },
          },
        },
      },
    },
    iap: {
      description: "Manage in-app products",
      subcommands: {
        list: { description: "List in-app products" },
        get: { description: "Get an in-app product" },
        create: { description: "Create an in-app product from JSON file" },
        update: { description: "Update an in-app product from JSON file" },
        delete: { description: "Delete an in-app product" },
        sync: { description: "Sync in-app products from a directory" },
      },
    },
    purchases: {
      description: "Manage purchases and orders",
      subcommands: {
        get: { description: "Get a product purchase" },
        acknowledge: { description: "Acknowledge a product purchase" },
        consume: { description: "Consume a product purchase" },
        subscription: {
          description: "Manage subscription purchases",
          subcommands: {
            get: { description: "Get a subscription purchase" },
            cancel: { description: "Cancel a subscription" },
            defer: { description: "Defer a subscription expiry" },
            revoke: { description: "Revoke a subscription" },
          },
        },
        voided: { description: "List voided purchases" },
        orders: {
          description: "Manage orders",
          subcommands: {
            refund: { description: "Refund an order" },
          },
        },
      },
    },
    pricing: {
      description: "Pricing and regional price conversion",
      subcommands: {
        convert: { description: "Convert a price to all regional prices" },
      },
    },
    reports: {
      description: "Download financial and stats reports",
      subcommands: {
        list: { description: "List available report buckets" },
        download: {
          description: "Download a report",
          subcommands: {
            financial: { description: "Download a financial report" },
            stats: { description: "Download a stats report" },
          },
        },
      },
    },
    users: {
      description: "Manage developer account users and permissions",
      subcommands: {
        list: { description: "List all users in the developer account" },
        get: { description: "Get user details" },
        invite: { description: "Invite a user to the developer account" },
        update: { description: "Update user permissions" },
        remove: { description: "Remove a user from the developer account" },
      },
    },
    testers: {
      description: "Manage testers and tester groups",
      subcommands: {
        list: { description: "List testers for a track" },
        add: { description: "Add testers to a track" },
        remove: { description: "Remove testers from a track" },
        import: { description: "Import testers from a CSV file" },
      },
    },
    recovery: {
      description: "Manage app recovery actions",
      subcommands: {
        list: { description: "List app recovery actions" },
        cancel: { description: "Cancel a recovery action" },
        deploy: { description: "Deploy a recovery action" },
        create: { description: "Create a recovery action" },
        "add-targeting": { description: "Add targeting to a recovery action" },
      },
    },
    "data-safety": {
      description: "Manage data safety declarations",
      subcommands: {
        get: { description: "Get data safety declaration" },
        update: { description: "Update data safety declaration" },
        export: { description: "Export data safety declaration" },
      },
    },
    "external-transactions": {
      description: "Manage external transactions",
      subcommands: {
        create: { description: "Create an external transaction" },
        get: { description: "Get an external transaction" },
        refund: { description: "Refund an external transaction" },
      },
    },
    "device-tiers": {
      description: "Manage device tier configurations",
      subcommands: {
        list: { description: "List device tier configurations" },
        get: { description: "Get a device tier configuration" },
        create: { description: "Create a device tier configuration" },
      },
    },
    "one-time-products": {
      description: "Manage one-time products",
      subcommands: {
        list: { description: "List one-time products" },
        get: { description: "Get a one-time product" },
        create: { description: "Create a one-time product" },
        update: { description: "Update a one-time product" },
        delete: { description: "Delete a one-time product" },
        offers: {
          description: "Manage one-time product offers",
          subcommands: {
            list: { description: "List offers for a one-time product" },
            get: { description: "Get a one-time product offer" },
            create: { description: "Create a one-time product offer" },
            update: { description: "Update a one-time product offer" },
            delete: { description: "Delete a one-time product offer" },
          },
        },
      },
    },
    "internal-sharing": {
      description: "Manage internal app sharing",
      subcommands: {
        upload: { description: "Upload an artifact for internal sharing" },
      },
    },
    "generated-apks": {
      description: "Manage generated APKs from app bundles",
      subcommands: {
        list: { description: "List generated APKs for a version" },
        download: { description: "Download a generated APK" },
      },
    },
    doctor: { description: "Verify setup and connectivity" },
    docs: { description: "Open documentation in browser" },
    validate: { description: "Pre-submission validation checks" },
    publish: { description: "Validate, upload, and release in one step" },
    completion: {
      description: "Generate shell completions",
      subcommands: {
        bash: { description: "Generate bash completions" },
        zsh: { description: "Generate zsh completions" },
        fish: { description: "Generate fish completions" },
        powershell: { description: "Generate PowerShell completions" },
      },
    },
    plugins: {
      description: "Manage plugins",
      subcommands: {
        list: { description: "List loaded plugins" },
        init: { description: "Scaffold a new plugin project" },
        approve: { description: "Approve a third-party plugin for loading" },
        revoke: { description: "Revoke approval for a third-party plugin" },
      },
    },
  };
}

/** Map a Commander Option to an OptionDef used by the shell generators. */
function optionToDef(opt: Option): OptionDef {
  const flags = opt.flags;
  // Commander exposes parsed long/short on the Option; fall back to parsing `.flags` if missing.
  const long = opt.long ?? undefined;
  const short = opt.short ?? undefined;
  // `takesValue` is true when the raw flags contain <placeholder> or [placeholder].
  const takesValue = /[<[][^>\]]+[>\]]/.test(flags);
  // Commander 14 exposes `.argChoices`; fall back gracefully if absent.
  const rawChoices = (opt as unknown as { argChoices?: readonly string[] }).argChoices;
  const choices = rawChoices && rawChoices.length > 0 ? Array.from(rawChoices) : undefined;
  return {
    flags,
    long: long ?? undefined,
    short: short ?? undefined,
    description: opt.description ?? "",
    choices,
    takesValue,
  };
}

/** Whether a Commander command was registered with `{ hidden: true }`. */
function isHidden(cmd: Command): boolean {
  return (cmd as unknown as { _hidden?: boolean })._hidden === true;
}

/** Recursively walk a Commander Command into the completion tree shape. */
function commandToDef(cmd: Command): CommandDef {
  const def: CommandDef = {
    description: cmd.description() ?? "",
  };
  const options = cmd.options
    .filter((o) => !o.hidden)
    .map(optionToDef)
    .filter((o) => o.long || o.short);
  if (options.length > 0) {
    def.options = options;
  }
  const subs = cmd.commands.filter((c) => c.name() !== "help" && !isHidden(c));
  if (subs.length > 0) {
    def.subcommands = {};
    for (const sub of subs) {
      def.subcommands[sub.name()] = commandToDef(sub);
    }
  }
  return def;
}

/** Build a completion tree by introspecting a fully-loaded Commander program. */
export function buildCommandTreeFromProgram(program: Command): Record<string, CommandDef> {
  const tree: Record<string, CommandDef> = {};
  for (const cmd of program.commands) {
    if (cmd.name() === "help" || isHidden(cmd)) continue;
    tree[cmd.name()] = commandToDef(cmd);
  }
  return tree;
}

/** Collect global options declared on the root program. */
export function collectGlobalOptions(program: Command): OptionDef[] {
  return program.options
    .filter((o) => !o.hidden)
    .map(optionToDef)
    .filter((o) => o.long || o.short);
}

export function registerCompletionCommand(
  program: Command,
  ensureAllCommandsLoaded?: () => Promise<void>,
): void {
  const completion = program.command("completion").description("Generate shell completions");

  const generate = async (
    shell: ShellType,
    gen: (tree: Record<string, CommandDef>, globals: OptionDef[]) => string,
  ): Promise<void> => {
    if (ensureAllCommandsLoaded) {
      await ensureAllCommandsLoaded();
    }
    const tree = ensureAllCommandsLoaded ? buildCommandTreeFromProgram(program) : getCommandTree();
    const globals = collectGlobalOptions(program);
    // Suppress unused-shell warning; shell type reserved for future per-shell tuning.
    void shell;
    console.log(gen(tree, globals));
  };

  completion
    .command("bash")
    .description("Generate bash completions")
    .action(async () => {
      await generate("bash", generateBashCompletions);
    });

  completion
    .command("zsh")
    .description("Generate zsh completions")
    .action(async () => {
      await generate("zsh", generateZshCompletions);
    });

  completion
    .command("fish")
    .description("Generate fish completions")
    .action(async () => {
      await generate("fish", generateFishCompletions);
    });

  completion
    .command("powershell")
    .description("Generate PowerShell completions")
    .action(async () => {
      await generate("powershell", generatePowerShellCompletions);
    });
}

/**
 * Return only options that have choices or long flags useful for completion
 * suggestion. `-V/--version` and `-h/--help` are filtered out to avoid noise.
 */
function completableOptions(options: OptionDef[] | undefined): OptionDef[] {
  if (!options) return [];
  return options.filter((o) => {
    if (!o.long) return false;
    if (o.long === "--help" || o.long === "--version") return false;
    return true;
  });
}

/**
 * Shell-completion flag slots that carry dynamic values (profiles, package
 * names, track names). Generated scripts shell out to `gpc __complete <ctx>`
 * to resolve these at TAB time. Shared across bash / zsh / fish generators.
 */
const DYNAMIC_FLAG_CONTEXTS: Array<{ flags: string[]; context: string }> = [
  { flags: ["--profile", "-p"], context: "profiles" },
  { flags: ["--app", "-a"], context: "packages" },
  { flags: ["--apps"], context: "packages" },
  { flags: ["--track"], context: "tracks-for-app" },
];

export function generateBashCompletions(
  tree: Record<string, CommandDef> = getCommandTree(),
  globals: OptionDef[] = [],
): string {
  const topLevelNames = Object.keys(tree).join(" ");

  const globalFlags = completableOptions(globals)
    .map((o) => o.long ?? "")
    .filter(Boolean)
    .join(" ");

  // Build case entries for each command that has subcommands (up to 3 levels)
  // and emit flag completion branches for commands with options.
  const caseEntries: string[] = [];
  const flagCases: string[] = [];

  // Dynamic flag-value completion: shell out to `gpc __complete <ctx>`.
  for (const { flags, context } of DYNAMIC_FLAG_CONTEXTS) {
    for (const flag of flags) {
      flagCases.push(
        `    ${flag})\n      COMPREPLY=( $(compgen -W "$(gpc __complete ${context} 2>/dev/null)" -- "\${cur}") )\n      return 0\n      ;;`,
      );
    }
  }

  const allCommandNames = new Set<string>();
  const collectNames = (defs: Record<string, CommandDef>) => {
    for (const [name, def] of Object.entries(defs)) {
      allCommandNames.add(name);
      if (def.subcommands) collectNames(def.subcommands);
    }
  };
  collectNames(tree);

  for (const [cmd, def] of Object.entries(tree)) {
    if (def.subcommands) {
      const subNames = Object.keys(def.subcommands).join(" ");
      caseEntries.push(
        `    ${cmd})\n      COMPREPLY=( $(compgen -W "${subNames}" -- "\${cur}") )\n      return 0\n      ;;`,
      );

      for (const [sub, subDef] of Object.entries(def.subcommands)) {
        if (subDef.subcommands) {
          const subSubNames = Object.keys(subDef.subcommands).join(" ");
          caseEntries.push(
            `    ${sub})\n      COMPREPLY=( $(compgen -W "${subSubNames}" -- "\${cur}") )\n      return 0\n      ;;`,
          );
        }
      }
    }

    // Collect flags that carry choices from this command + its subtree.
    const walk = (d: CommandDef) => {
      for (const opt of completableOptions(d.options)) {
        if (opt.choices && opt.long) {
          flagCases.push(
            `    ${opt.long})\n      COMPREPLY=( $(compgen -W "${opt.choices.join(" ")}" -- "\${cur}") )\n      return 0\n      ;;`,
          );
        }
      }
      if (d.subcommands) for (const s of Object.values(d.subcommands)) walk(s);
    };
    walk(def);
  }

  // Global-option choices (e.g. --output table|json|yaml|markdown|junit).
  for (const opt of completableOptions(globals)) {
    if (opt.choices && opt.long) {
      flagCases.push(
        `    ${opt.long})\n      COMPREPLY=( $(compgen -W "${opt.choices.join(" ")}" -- "\${cur}") )\n      return 0\n      ;;`,
      );
    }
  }

  return `# bash completion for gpc
# Install: gpc completion bash >> ~/.bashrc
_gpc() {
  local cur prev commands globals
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="${topLevelNames}"
  globals="${globalFlags}"

  # Flag-value completion (choices)
  case "\${prev}" in
${flagCases.join("\n")}
  esac

  # When the current word starts with '-', complete known flags
  if [[ "\${cur}" == -* ]]; then
    COMPREPLY=( $(compgen -W "\${globals}" -- "\${cur}") )
    return 0
  fi

  case "\${prev}" in
    gpc)
      COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
${caseEntries.join("\n")}
  esac

  COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
  return 0
}

complete -F _gpc gpc`;
}

export function generateZshCompletions(
  tree: Record<string, CommandDef> = getCommandTree(),
  globals: OptionDef[] = [],
): string {
  const arrayDefs: string[] = [];
  const caseBranches: string[] = [];

  const topEntries = Object.entries(tree)
    .map(([name, def]) => `    '${name}:${escapeZsh(def.description)}'`)
    .join("\n");
  arrayDefs.push(`  commands=(\n${topEntries}\n  )`);

  for (const [cmd, def] of Object.entries(tree)) {
    if (def.subcommands) {
      const varName = `${cmd.replace(/-/g, "_")}_commands`;
      const entries = Object.entries(def.subcommands)
        .map(([name, sub]) => `    '${name}:${escapeZsh(sub.description)}'`)
        .join("\n");
      arrayDefs.push(`  ${varName}=(\n${entries}\n  )`);
      caseBranches.push(
        `        ${cmd})\n          _describe -t ${varName} '${cmd} commands' ${varName}\n          ;;`,
      );

      for (const [sub, subDef] of Object.entries(def.subcommands)) {
        if (subDef.subcommands) {
          const subVarName = `${cmd.replace(/-/g, "_")}_${sub.replace(/-/g, "_")}_commands`;
          const subEntries = Object.entries(subDef.subcommands)
            .map(([name, s]) => `    '${name}:${escapeZsh(s.description)}'`)
            .join("\n");
          arrayDefs.push(`  ${subVarName}=(\n${subEntries}\n  )`);
        }
      }
    }
  }

  const level3Cases: string[] = [];
  for (const [cmd, def] of Object.entries(tree)) {
    if (!def.subcommands) continue;
    for (const [sub, subDef] of Object.entries(def.subcommands)) {
      if (subDef.subcommands) {
        const subVarName = `${cmd.replace(/-/g, "_")}_${sub.replace(/-/g, "_")}_commands`;
        level3Cases.push(
          `          ${sub})\n            _describe -t ${subVarName} '${sub} commands' ${subVarName}\n            ;;`,
        );
      }
    }
  }

  const varNames: string[] = ["commands"];
  for (const [cmd, def] of Object.entries(tree)) {
    if (def.subcommands) {
      varNames.push(`${cmd.replace(/-/g, "_")}_commands`);
      for (const [sub, subDef] of Object.entries(def.subcommands)) {
        if (subDef.subcommands) {
          varNames.push(`${cmd.replace(/-/g, "_")}_${sub.replace(/-/g, "_")}_commands`);
        }
      }
    }
  }

  const localDecls = varNames.map((v) => `  local -a ${v}`).join("\n");

  // Flag entries — emit `_arguments`-style hints collected across the tree.
  // Keeps the existing `_describe` structure above; shell will still complete
  // commands first, but flags with choices are surfaced as hint comments that
  // power-users can read and some completers auto-detect. A fuller
  // `_arguments` integration is deferred to v0.9.59 (dynamic-value release).
  const flagHints: string[] = [];
  const walkFlags = (defs: Record<string, CommandDef>, path: string) => {
    for (const [name, def] of Object.entries(defs)) {
      for (const opt of completableOptions(def.options)) {
        if (opt.choices) {
          flagHints.push(
            `# ${path}${name} ${opt.long}: (${opt.choices.join(" ")}) — ${escapeZsh(opt.description)}`,
          );
        }
      }
      if (def.subcommands) walkFlags(def.subcommands, `${path}${name} `);
    }
  };
  walkFlags(tree, "");
  for (const opt of completableOptions(globals)) {
    if (opt.choices) {
      flagHints.push(
        `# (global) ${opt.long}: (${opt.choices.join(" ")}) — ${escapeZsh(opt.description)}`,
      );
    }
  }

  return `#compdef gpc
# Install: gpc completion zsh > ~/.zsh/completions/_gpc
${flagHints.length > 0 ? `\n# --- Flag choices (reference) ---\n${flagHints.join("\n")}\n` : ""}
_gpc() {
${localDecls}

${arrayDefs.join("\n\n")}

  _arguments -C \\
    '1: :->command' \\
    '2: :->subcommand' \\
    '3: :->subsubcommand' \\
    '*::arg:->args'

  case "$state" in
    command)
      _describe -t commands 'gpc commands' commands
      ;;
    subcommand)
      case "$words[2]" in
${caseBranches.join("\n")}
      esac
      ;;
    subsubcommand)
      case "$words[3]" in
${level3Cases.join("\n")}
      esac
      ;;
  esac
}

_gpc "$@"`;
}

export function generateFishCompletions(
  tree: Record<string, CommandDef> = getCommandTree(),
  globals: OptionDef[] = [],
): string {
  const lines: string[] = [
    "# fish completions for gpc",
    "# Install: gpc completion fish > ~/.config/fish/completions/gpc.fish",
    "",
    "# Disable file completions by default",
    "complete -c gpc -f",
    "",
    "# Top-level commands",
  ];

  for (const [cmd, def] of Object.entries(tree)) {
    lines.push(
      `complete -c gpc -n '__fish_use_subcommand' -a ${cmd} -d '${escapeFish(def.description)}'`,
    );
  }

  // Level 2 subcommands
  for (const [cmd, def] of Object.entries(tree)) {
    if (!def.subcommands) continue;
    lines.push("");
    lines.push(`# ${cmd} subcommands`);
    for (const [sub, subDef] of Object.entries(def.subcommands)) {
      lines.push(
        `complete -c gpc -n '__fish_seen_subcommand_from ${cmd}; and not __fish_seen_subcommand_from ${Object.keys(def.subcommands).join(" ")}' -a ${sub} -d '${escapeFish(subDef.description)}'`,
      );
    }

    // Level 3 subcommands
    for (const [sub, subDef] of Object.entries(def.subcommands)) {
      if (!subDef.subcommands) continue;
      lines.push("");
      lines.push(`# ${cmd} ${sub} subcommands`);
      for (const [subsub, subsubDef] of Object.entries(subDef.subcommands)) {
        lines.push(
          `complete -c gpc -n '__fish_seen_subcommand_from ${sub}; and not __fish_seen_subcommand_from ${Object.keys(subDef.subcommands).join(" ")}' -a ${subsub} -d '${escapeFish(subsubDef.description)}'`,
        );
      }
    }
  }

  // Global + per-command flag completions with choice lists.
  lines.push("");
  lines.push("# Global flags");
  for (const opt of completableOptions(globals)) {
    if (!opt.long) continue;
    const longName = opt.long.replace(/^--/, "");
    const shortName = opt.short ? opt.short.replace(/^-/, "") : undefined;
    const choiceArg = opt.choices ? ` -a '${opt.choices.join(" ")}'` : "";
    const shortArg = shortName ? ` -s ${shortName}` : "";
    lines.push(
      `complete -c gpc -l ${longName}${shortArg} -d '${escapeFish(opt.description)}'${choiceArg}`,
    );
  }

  const walkFlags = (defs: Record<string, CommandDef>) => {
    for (const [name, def] of Object.entries(defs)) {
      const flags = completableOptions(def.options);
      if (flags.length > 0) {
        lines.push("");
        lines.push(`# ${name} flags`);
        for (const opt of flags) {
          if (!opt.long) continue;
          const longName = opt.long.replace(/^--/, "");
          const shortName = opt.short ? opt.short.replace(/^-/, "") : undefined;
          const choiceArg = opt.choices ? ` -a '${opt.choices.join(" ")}'` : "";
          const shortArg = shortName ? ` -s ${shortName}` : "";
          lines.push(
            `complete -c gpc -n '__fish_seen_subcommand_from ${name}' -l ${longName}${shortArg} -d '${escapeFish(opt.description)}'${choiceArg}`,
          );
        }
      }
      if (def.subcommands) walkFlags(def.subcommands);
    }
  };
  walkFlags(tree);

  // Dynamic flag-value completion: shell out to `gpc __complete <ctx>`.
  // Fish merges multiple `complete` directives for the same flag, so these
  // layer on top of the description-only lines emitted above.
  lines.push("");
  lines.push("# Dynamic values (shell out to __complete)");
  for (const { flags, context } of DYNAMIC_FLAG_CONTEXTS) {
    for (const flag of flags) {
      if (flag.startsWith("--")) {
        const longName = flag.slice(2);
        lines.push(`complete -c gpc -l ${longName} -x -a '(gpc __complete ${context} 2>/dev/null)'`);
      } else if (flag.startsWith("-")) {
        const shortName = flag.slice(1);
        lines.push(`complete -c gpc -s ${shortName} -x -a '(gpc __complete ${context} 2>/dev/null)'`);
      }
    }
  }

  return lines.join("\n");
}

export function generatePowerShellCompletions(
  tree: Record<string, CommandDef> = getCommandTree(),
  globals: OptionDef[] = [],
): string {
  const completionEntries: string[] = [];

  // Top-level completions
  for (const [cmd, def] of Object.entries(tree)) {
    completionEntries.push(
      `        [CompletionResult]::new('${cmd}', '${cmd}', [CompletionResultType]::ParameterValue, '${escapePowerShell(def.description)}')`,
    );
  }

  // Global flag completions (as parameters available from any state)
  for (const opt of completableOptions(globals)) {
    if (!opt.long) continue;
    completionEntries.push(
      `        [CompletionResult]::new('${opt.long}', '${opt.long}', [CompletionResultType]::ParameterName, '${escapePowerShell(opt.description)}')`,
    );
  }

  const subcommandCases: string[] = [];
  const level3Cases: string[] = [];

  for (const [cmd, def] of Object.entries(tree)) {
    if (!def.subcommands) continue;
    const subEntries = Object.entries(def.subcommands)
      .map(
        ([sub, subDef]) =>
          `            [CompletionResult]::new('${sub}', '${sub}', [CompletionResultType]::ParameterValue, '${escapePowerShell(subDef.description)}')`,
      )
      .join("\n");
    subcommandCases.push(`        '${cmd}' {\n${subEntries}\n        }`);

    for (const [sub, subDef] of Object.entries(def.subcommands)) {
      if (!subDef.subcommands) continue;
      const subSubEntries = Object.entries(subDef.subcommands)
        .map(
          ([subsub, subsubDef]) =>
            `            [CompletionResult]::new('${subsub}', '${subsub}', [CompletionResultType]::ParameterValue, '${escapePowerShell(subsubDef.description)}')`,
        )
        .join("\n");
      level3Cases.push(`        '${sub}' {\n${subSubEntries}\n        }`);
    }
  }

  return `# PowerShell completions for gpc
# Install: gpc completion powershell >> $PROFILE

using namespace System.Management.Automation

Register-ArgumentCompleter -CommandName gpc -Native -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $tokens = $commandAst.ToString().Substring(0, $cursorPosition).Trim() -split '\\s+'
    $tokenCount = $tokens.Count

    # Determine context
    if ($tokenCount -le 1 -or ($tokenCount -eq 2 -and $wordToComplete)) {
        # Top-level commands
${completionEntries.join("\n")}
    } elseif ($tokenCount -eq 2 -or ($tokenCount -eq 3 -and $wordToComplete)) {
        # Subcommands
        $command = $tokens[1]
        switch ($command) {
${subcommandCases.join("\n")}
        }
    } elseif ($tokenCount -eq 3 -or ($tokenCount -eq 4 -and $wordToComplete)) {
        # Sub-subcommands
        $subcommand = $tokens[2]
        switch ($subcommand) {
${level3Cases.join("\n")}
        }
    }
}`;
}

function escapeZsh(str: string): string {
  return str.replace(/'/g, "'\\''");
}

function escapeFish(str: string): string {
  return str.replace(/'/g, "\\'");
}

function escapePowerShell(str: string): string {
  return str.replace(/'/g, "''");
}
