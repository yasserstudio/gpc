import type { Command } from "commander";

export type ShellType = "bash" | "zsh" | "fish" | "powershell";

export const SUPPORTED_SHELLS: readonly ShellType[] = [
  "bash",
  "zsh",
  "fish",
  "powershell",
] as const;

/**
 * Full command tree for gpc CLI.
 * Each entry maps a command name to its description and optional subcommands.
 */
interface CommandDef {
  description: string;
  subcommands?: Record<string, CommandDef>;
}

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

export function registerCompletionCommand(program: Command): void {
  const completion = program.command("completion").description("Generate shell completions");

  completion
    .command("bash")
    .description("Generate bash completions")
    .action(() => {
      console.log(generateBashCompletions());
    });

  completion
    .command("zsh")
    .description("Generate zsh completions")
    .action(() => {
      console.log(generateZshCompletions());
    });

  completion
    .command("fish")
    .description("Generate fish completions")
    .action(() => {
      console.log(generateFishCompletions());
    });

  completion
    .command("powershell")
    .description("Generate PowerShell completions")
    .action(() => {
      console.log(generatePowerShellCompletions());
    });
}

export function generateBashCompletions(): string {
  const tree = getCommandTree();

  const topLevelNames = Object.keys(tree).join(" ");

  // Build case entries for each command that has subcommands (up to 3 levels)
  const caseEntries: string[] = [];

  for (const [cmd, def] of Object.entries(tree)) {
    if (def.subcommands) {
      const subNames = Object.keys(def.subcommands).join(" ");
      caseEntries.push(
        `    ${cmd})\n      COMPREPLY=( $(compgen -W "${subNames}" -- "\${cur}") )\n      return 0\n      ;;`,
      );

      // Level 3: subcommands of subcommands
      for (const [sub, subDef] of Object.entries(def.subcommands)) {
        if (subDef.subcommands) {
          const subSubNames = Object.keys(subDef.subcommands).join(" ");
          caseEntries.push(
            `    ${sub})\n      COMPREPLY=( $(compgen -W "${subSubNames}" -- "\${cur}") )\n      return 0\n      ;;`,
          );
        }
      }
    }
  }

  return `# bash completion for gpc
# Install: gpc completion bash >> ~/.bashrc
_gpc() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="${topLevelNames}"

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

export function generateZshCompletions(): string {
  const tree = getCommandTree();

  // Build zsh arrays
  const arrayDefs: string[] = [];
  const caseBranches: string[] = [];

  // Top-level
  const topEntries = Object.entries(tree)
    .map(([name, def]) => `    '${name}:${escapeZsh(def.description)}'`)
    .join("\n");
  arrayDefs.push(`  commands=(\n${topEntries}\n  )`);

  // Build subcommand arrays and case branches for level 2
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

      // Level 3
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

  // Build level 3 case for subsubcommand state
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

  // Collect all variable names for local declarations
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

  return `#compdef gpc
# Install: gpc completion zsh > ~/.zsh/completions/_gpc

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

export function generateFishCompletions(): string {
  const tree = getCommandTree();
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

  return lines.join("\n");
}

export function generatePowerShellCompletions(): string {
  const tree = getCommandTree();

  // Build the completion hashtable entries
  const completionEntries: string[] = [];

  // Top-level completions
  for (const [cmd, def] of Object.entries(tree)) {
    completionEntries.push(
      `        [CompletionResult]::new('${cmd}', '${cmd}', [CompletionResultType]::ParameterValue, '${escapePowerShell(def.description)}')`,
    );
  }

  // Subcommand completions (level 2)
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

    // Level 3
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
