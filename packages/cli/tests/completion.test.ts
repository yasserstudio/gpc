import { describe, it, expect } from "vitest";
import { Command } from "commander";
import {
  getCommandTree,
  generateBashCompletions,
  generateZshCompletions,
  generateFishCompletions,
  generatePowerShellCompletions,
  buildCommandTreeFromProgram,
  collectGlobalOptions,
  SUPPORTED_SHELLS,
} from "../src/commands/completion";
import { createProgram } from "../src/program";

describe("getCommandTree", () => {
  it("returns all top-level commands", () => {
    const tree = getCommandTree();
    const keys = Object.keys(tree);

    // Verify all known top-level commands are present
    const expected = [
      "auth",
      "config",
      "apps",
      "releases",
      "tracks",
      "status",
      "listings",
      "reviews",
      "vitals",
      "subscriptions",
      "iap",
      "purchases",
      "pricing",
      "reports",
      "users",
      "testers",
      "recovery",
      "data-safety",
      "external-transactions",
      "device-tiers",
      "one-time-products",
      "internal-sharing",
      "generated-apks",
      "doctor",
      "docs",
      "validate",
      "publish",
      "completion",
      "plugins",
    ];

    for (const cmd of expected) {
      expect(keys).toContain(cmd);
    }
  });

  it("includes subcommands for auth", () => {
    const tree = getCommandTree();
    const authSubs = Object.keys(tree["auth"]?.subcommands ?? {});
    expect(authSubs).toEqual(["login", "status", "logout", "whoami"]);
  });

  it("includes nested subcommands for releases rollout", () => {
    const tree = getCommandTree();
    const rolloutSubs = Object.keys(tree["releases"]?.subcommands?.["rollout"]?.subcommands ?? {});
    expect(rolloutSubs).toEqual(["increase", "halt", "resume", "complete"]);
  });

  it("includes powershell in completion subcommands", () => {
    const tree = getCommandTree();
    const completionSubs = Object.keys(tree["completion"]?.subcommands ?? {});
    expect(completionSubs).toContain("powershell");
    expect(completionSubs).toContain("fish");
    expect(completionSubs).toContain("bash");
    expect(completionSubs).toContain("zsh");
  });

  it("includes subcommands for recovery", () => {
    const tree = getCommandTree();
    const subs = Object.keys(tree["recovery"]?.subcommands ?? {});
    expect(subs).toEqual(["list", "cancel", "deploy", "create", "add-targeting"]);
  });

  it("includes subcommands for data-safety", () => {
    const tree = getCommandTree();
    const subs = Object.keys(tree["data-safety"]?.subcommands ?? {});
    expect(subs).toEqual(["get", "update", "export"]);
  });

  it("includes subcommands for external-transactions", () => {
    const tree = getCommandTree();
    const subs = Object.keys(tree["external-transactions"]?.subcommands ?? {});
    expect(subs).toEqual(["create", "get", "refund"]);
  });

  it("includes subcommands for device-tiers", () => {
    const tree = getCommandTree();
    const subs = Object.keys(tree["device-tiers"]?.subcommands ?? {});
    expect(subs).toEqual(["list", "get", "create"]);
  });

  it("includes subcommands for one-time-products", () => {
    const tree = getCommandTree();
    const subs = Object.keys(tree["one-time-products"]?.subcommands ?? {});
    expect(subs).toEqual(["list", "get", "create", "update", "delete", "offers"]);
  });

  it("includes nested offers subcommands for one-time-products", () => {
    const tree = getCommandTree();
    const offersSubs = Object.keys(
      tree["one-time-products"]?.subcommands?.["offers"]?.subcommands ?? {},
    );
    expect(offersSubs).toEqual(["list", "get", "create", "update", "delete"]);
  });

  it("includes subcommands for internal-sharing", () => {
    const tree = getCommandTree();
    const subs = Object.keys(tree["internal-sharing"]?.subcommands ?? {});
    expect(subs).toEqual(["upload"]);
  });

  it("includes subcommands for generated-apks", () => {
    const tree = getCommandTree();
    const subs = Object.keys(tree["generated-apks"]?.subcommands ?? {});
    expect(subs).toEqual(["list", "download"]);
  });

  it("every entry has a description", () => {
    const tree = getCommandTree();
    function checkDescriptions(
      defs: Record<string, { description: string; subcommands?: Record<string, any> }>,
      path: string,
    ) {
      for (const [name, def] of Object.entries(defs)) {
        expect(def.description, `${path}.${name} should have a description`).toBeTruthy();
        if (def.subcommands) {
          checkDescriptions(def.subcommands, `${path}.${name}`);
        }
      }
    }
    checkDescriptions(tree, "root");
  });
});

describe("SUPPORTED_SHELLS", () => {
  it("includes all four shells", () => {
    expect(SUPPORTED_SHELLS).toEqual(["bash", "zsh", "fish", "powershell"]);
  });
});

describe("generateBashCompletions", () => {
  const output = generateBashCompletions();

  it("includes the completion function definition", () => {
    expect(output).toContain("_gpc()");
    expect(output).toContain("complete -F _gpc gpc");
  });

  it("includes install instructions", () => {
    expect(output).toContain("# Install:");
  });

  it("includes all top-level commands in the commands variable", () => {
    expect(output).toContain("auth");
    expect(output).toContain("releases");
    expect(output).toContain("subscriptions");
    expect(output).toContain("plugins");
    expect(output).toContain("vitals");
    expect(output).toContain("pricing");
  });

  it("includes case entries for commands with subcommands", () => {
    expect(output).toContain("auth)");
    expect(output).toContain("login status logout whoami");
    expect(output).toContain("releases)");
    expect(output).toContain("listings)");
    expect(output).toContain("iap)");
  });

  it("includes level-3 subcommand completions", () => {
    expect(output).toContain("rollout)");
    expect(output).toContain("increase halt resume complete");
  });

  it("includes new v0.9.7/v0.9.8 commands", () => {
    expect(output).toContain("recovery)");
    expect(output).toContain("data-safety)");
    expect(output).toContain("external-transactions)");
    expect(output).toContain("device-tiers)");
    expect(output).toContain("one-time-products)");
    expect(output).toContain("internal-sharing)");
    expect(output).toContain("generated-apks)");
  });

  it("includes level-3 completions for one-time-products offers", () => {
    expect(output).toContain("offers)");
  });
});

describe("generateZshCompletions", () => {
  const output = generateZshCompletions();

  it("includes the compdef header", () => {
    expect(output).toContain("#compdef gpc");
  });

  it("includes install instructions", () => {
    expect(output).toContain("# Install:");
  });

  it("includes the _gpc function", () => {
    expect(output).toContain("_gpc()");
    expect(output).toContain('_gpc "$@"');
  });

  it("includes local array declarations", () => {
    expect(output).toContain("local -a commands");
    expect(output).toContain("local -a auth_commands");
    expect(output).toContain("local -a releases_commands");
    expect(output).toContain("local -a releases_rollout_commands");
  });

  it("includes top-level commands with descriptions", () => {
    expect(output).toContain("'auth:Manage authentication'");
    expect(output).toContain("'releases:Manage releases and rollouts'");
    expect(output).toContain("'plugins:Manage plugins'");
  });

  it("includes subcommand arrays", () => {
    expect(output).toContain("auth_commands=(");
    expect(output).toContain("'login:Authenticate with Google Play Developer API'");
  });

  it("includes level-3 arrays", () => {
    expect(output).toContain("releases_rollout_commands=(");
    expect(output).toContain("'increase:Increase a staged rollout'");
  });

  it("handles subsubcommand state", () => {
    expect(output).toContain("subsubcommand)");
  });

  it("includes new v0.9.7/v0.9.8 command arrays", () => {
    expect(output).toContain("recovery_commands=(");
    expect(output).toContain("data_safety_commands=(");
    expect(output).toContain("external_transactions_commands=(");
    expect(output).toContain("device_tiers_commands=(");
    expect(output).toContain("one_time_products_commands=(");
    expect(output).toContain("internal_sharing_commands=(");
    expect(output).toContain("generated_apks_commands=(");
  });

  it("includes level-3 array for one-time-products offers", () => {
    expect(output).toContain("one_time_products_offers_commands=(");
  });
});

describe("generateFishCompletions", () => {
  const output = generateFishCompletions();

  it("disables file completions", () => {
    expect(output).toContain("complete -c gpc -f");
  });

  it("includes install instructions", () => {
    expect(output).toContain("# Install:");
  });

  it("includes top-level completions", () => {
    expect(output).toContain(
      "complete -c gpc -n '__fish_use_subcommand' -a auth -d 'Manage authentication'",
    );
    expect(output).toContain(
      "complete -c gpc -n '__fish_use_subcommand' -a releases -d 'Manage releases and rollouts'",
    );
    expect(output).toContain(
      "complete -c gpc -n '__fish_use_subcommand' -a plugins -d 'Manage plugins'",
    );
  });

  it("includes all top-level commands", () => {
    const tree = getCommandTree();
    for (const cmd of Object.keys(tree)) {
      expect(output).toContain(`-a ${cmd}`);
    }
  });

  it("includes level-2 subcommands", () => {
    expect(output).toContain("# auth subcommands");
    expect(output).toContain("__fish_seen_subcommand_from auth");
  });

  it("includes level-3 subcommands", () => {
    expect(output).toContain("# releases rollout subcommands");
    expect(output).toContain("__fish_seen_subcommand_from rollout");
  });

  it("includes new v0.9.7/v0.9.8 commands", () => {
    expect(output).toContain("# recovery subcommands");
    expect(output).toContain("# data-safety subcommands");
    expect(output).toContain("# external-transactions subcommands");
    expect(output).toContain("# device-tiers subcommands");
    expect(output).toContain("# one-time-products subcommands");
    expect(output).toContain("# internal-sharing subcommands");
    expect(output).toContain("# generated-apks subcommands");
  });

  it("includes level-3 subcommands for one-time-products offers", () => {
    expect(output).toContain("# one-time-products offers subcommands");
  });
});

describe("buildCommandTreeFromProgram", () => {
  it("extracts commands, subcommands, options, and argChoices from a Commander program", () => {
    const program = new Command();
    program.name("test").description("Test program");
    program
      .command("publish")
      .description("Publish an app")
      .option("-t, --track <track>", "Release track")
      .addOption(
        new Command()
          .createOption("--status <status>", "Release status")
          .choices(["completed", "inProgress", "draft", "halted"]),
      );
    const rollout = program.command("rollout").description("Manage rollouts");
    rollout.command("increase").description("Increase a rollout");
    rollout.command("halt").description("Halt a rollout");

    const tree = buildCommandTreeFromProgram(program);

    expect(Object.keys(tree)).toContain("publish");
    expect(Object.keys(tree)).toContain("rollout");
    expect(tree["publish"]?.description).toBe("Publish an app");
    expect(tree["publish"]?.options).toBeDefined();
    const trackOpt = tree["publish"]?.options?.find((o) => o.long === "--track");
    expect(trackOpt).toBeDefined();
    expect(trackOpt?.takesValue).toBe(true);
    const statusOpt = tree["publish"]?.options?.find((o) => o.long === "--status");
    expect(statusOpt?.choices).toEqual(["completed", "inProgress", "draft", "halted"]);
    expect(Object.keys(tree["rollout"]?.subcommands ?? {})).toEqual(["increase", "halt"]);
  });

  it("skips Commander's built-in help subcommand", () => {
    const program = new Command();
    program.command("real").description("Real command");
    const tree = buildCommandTreeFromProgram(program);
    expect(Object.keys(tree)).not.toContain("help");
  });
});

describe("walker parity with the live createProgram()", () => {
  it("introspected tree contains commands that the hardcoded fallback is missing", async () => {
    const program = await createProgram();
    const introspected = buildCommandTreeFromProgram(program);
    const fallback = getCommandTree();

    // Commands newly added since the fallback was last hand-edited must appear
    // via introspection — this is the drift guard.
    const expectedLiveCommands = ["rtdn", "init", "diff", "preflight", "quickstart", "enterprise"];
    for (const cmd of expectedLiveCommands) {
      expect(Object.keys(introspected), `expected ${cmd} in introspected tree`).toContain(cmd);
    }

    // And the fallback should still be a subset (no legacy commands disappear).
    for (const cmd of Object.keys(fallback)) {
      expect(
        Object.keys(introspected),
        `expected fallback command "${cmd}" in introspected tree`,
      ).toContain(cmd);
    }
  });

  it("collectGlobalOptions returns the root program's global flags", async () => {
    const program = await createProgram();
    const globals = collectGlobalOptions(program);
    const longNames = globals.map((o) => o.long);
    expect(longNames).toContain("--output");
    expect(longNames).toContain("--profile");
    expect(longNames).toContain("--app");
    expect(longNames).toContain("--ci");
  });
});

describe("flag-choice emission", () => {
  // Use a standalone mock program so these tests stay valid regardless of
  // whether live program options use `.choices()`. The walker path is what's
  // under test — the live program's choice usage is a separate concern.
  function mockProgram() {
    const p = new Command();
    p.name("gpc").description("Mock");
    p.addOption(
      p
        .createOption("-o, --output <format>", "Output format")
        .choices(["table", "json", "yaml", "markdown", "csv", "tsv", "junit"]),
    );
    p.option("-p, --profile <name>", "Auth profile name");
    p.option("-a, --app <package>", "App package name");
    const pub = p.command("publish").description("Publish");
    pub.addOption(
      pub
        .createOption("--track <track>", "Release track")
        .choices(["internal", "alpha", "beta", "production"]),
    );
    return p;
  }

  it("bash output includes global --output choice values", () => {
    const p = mockProgram();
    const tree = buildCommandTreeFromProgram(p);
    const globals = collectGlobalOptions(p);
    const output = generateBashCompletions(tree, globals);
    expect(output).toContain("--output)");
    expect(output).toContain("table json yaml markdown csv tsv junit");
  });

  it("bash output includes per-command --track choice values", () => {
    const p = mockProgram();
    const tree = buildCommandTreeFromProgram(p);
    const globals = collectGlobalOptions(p);
    const output = generateBashCompletions(tree, globals);
    expect(output).toContain("--track)");
    expect(output).toContain("internal alpha beta production");
  });

  it("bash output advertises global flag names for --<TAB> completion", () => {
    const p = mockProgram();
    const globals = collectGlobalOptions(p);
    const output = generateBashCompletions(buildCommandTreeFromProgram(p), globals);
    expect(output).toContain("--output");
    expect(output).toContain("--profile");
    expect(output).toContain("--app");
  });

  it("fish output includes global flag definitions with choice arrays", () => {
    const p = mockProgram();
    const tree = buildCommandTreeFromProgram(p);
    const globals = collectGlobalOptions(p);
    const output = generateFishCompletions(tree, globals);
    expect(output).toContain("# Global flags");
    expect(output).toContain("-l output");
    expect(output).toContain("-a 'table json yaml markdown csv tsv junit'");
  });

  it("fish output includes per-command flag definitions with choice arrays", () => {
    const p = mockProgram();
    const tree = buildCommandTreeFromProgram(p);
    const globals = collectGlobalOptions(p);
    const output = generateFishCompletions(tree, globals);
    expect(output).toContain("# publish flags");
    expect(output).toContain("-l track");
    expect(output).toContain("-a 'internal alpha beta production'");
  });

  it("zsh output emits flag-choice option specs", () => {
    const p = mockProgram();
    const tree = buildCommandTreeFromProgram(p);
    const globals = collectGlobalOptions(p);
    const output = generateZshCompletions(tree, globals);
    // New _arguments integration emits real option specs rather than hint
    // comments. Dynamic values have their own specs (see dynamic-values test).
    expect(output).toContain("'--output[");
    expect(output).toContain("(table json yaml markdown csv tsv junit)");
    // --track here carries a .choices() on the mock program, so it stays as
    // a static spec (the real CLI wires --track to a dynamic helper instead).
    expect(output).toContain("(internal alpha beta production)");
  });

  it("powershell output includes global parameter completions", () => {
    const p = mockProgram();
    const tree = buildCommandTreeFromProgram(p);
    const globals = collectGlobalOptions(p);
    const output = generatePowerShellCompletions(tree, globals);
    expect(output).toContain("[CompletionResultType]::ParameterName");
    expect(output).toContain("'--output'");
  });
});

describe("drift guard — introspected-tree commands appear in bash output", () => {
  it("every top-level command from createProgram() appears in generated bash", async () => {
    const program = await createProgram();
    const tree = buildCommandTreeFromProgram(program);
    const globals = collectGlobalOptions(program);
    const output = generateBashCompletions(tree, globals);
    for (const name of Object.keys(tree)) {
      expect(output, `expected top-level command "${name}" in bash output`).toContain(name);
    }
  });

  it("hidden commands are filtered from the introspected tree", async () => {
    const program = await createProgram();
    const tree = buildCommandTreeFromProgram(program);
    expect(Object.keys(tree)).not.toContain("__complete");
  });

  it("any command registered with addCommand({hidden:true}) is filtered", () => {
    const p = new Command().name("gpc-test");
    p.command("visible").description("Visible");
    const hidden = new Command("hidden-one").description("Hidden");
    p.addCommand(hidden, { hidden: true });
    const tree = buildCommandTreeFromProgram(p);
    expect(Object.keys(tree)).toContain("visible");
    expect(Object.keys(tree)).not.toContain("hidden-one");
  });

  it("walker auto-discovers `changelog generate` subcommand (v0.9.61 regression guard)", async () => {
    const program = new Command();
    const { registerChangelogCommand } = await import("../src/commands/changelog.js");
    registerChangelogCommand(program);
    const tree = buildCommandTreeFromProgram(program);
    const changelogSubs = Object.keys(tree["changelog"]?.subcommands ?? {});
    expect(changelogSubs).toContain("generate");
    const generate = tree["changelog"]?.subcommands?.["generate"];
    const formatOpt = generate?.options?.find((o) => o.long === "--format");
    expect(formatOpt).toBeDefined();
    expect(formatOpt?.takesValue).toBe(true);
  });
});

describe("dynamic shell-completion values", () => {
  it("bash shells out to `gpc __complete` for profile/app/track flags", () => {
    const output = generateBashCompletions();
    expect(output).toContain("gpc __complete profiles");
    expect(output).toContain("gpc __complete packages");
    expect(output).toContain("gpc __complete tracks-for-app");
    // Branches keyed on the flag name
    expect(output).toMatch(/--profile\)[\s\S]*gpc __complete profiles/);
    expect(output).toMatch(/--app\)[\s\S]*gpc __complete packages/);
    expect(output).toMatch(/--track\)[\s\S]*gpc __complete tracks-for-app/);
  });

  it("fish emits `-a '(gpc __complete ... )'` for dynamic flags", () => {
    const output = generateFishCompletions();
    expect(output).toContain("(gpc __complete profiles 2>/dev/null)");
    expect(output).toContain("(gpc __complete packages 2>/dev/null)");
    expect(output).toContain("(gpc __complete tracks-for-app 2>/dev/null)");
    expect(output).toContain("complete -c gpc -l profile -x -a");
    expect(output).toContain("complete -c gpc -l app -x -a");
    expect(output).toContain("complete -c gpc -l track -x -a");
  });

  it("zsh declares helper functions and wires them into _arguments specs", () => {
    const output = generateZshCompletions();
    expect(output).toContain("_gpc_profiles()");
    expect(output).toContain("_gpc_packages()");
    expect(output).toContain("_gpc_tracks_for_app()");
    expect(output).toContain("gpc __complete profiles 2>/dev/null");
    expect(output).toContain("gpc __complete packages 2>/dev/null");
    expect(output).toContain("gpc __complete tracks-for-app 2>/dev/null");
    expect(output).toContain("'--profile[]:value:_gpc_profiles'");
    expect(output).toContain("'--app[]:value:_gpc_packages'");
    expect(output).toContain("'--track[]:value:_gpc_tracks_for_app'");
  });

  it("powershell output is unchanged by dynamic-values work", () => {
    const output = generatePowerShellCompletions();
    // PowerShell dynamic values are deferred; ensure we did NOT leak __complete
    // shell-outs into the PowerShell script (would be syntactically invalid).
    expect(output).not.toContain("gpc __complete");
  });
});

describe("generatePowerShellCompletions", () => {
  const output = generatePowerShellCompletions();

  it("includes the Register-ArgumentCompleter declaration", () => {
    expect(output).toContain("Register-ArgumentCompleter -CommandName gpc -Native -ScriptBlock");
  });

  it("includes install instructions", () => {
    expect(output).toContain("# Install:");
  });

  it("includes the using namespace declaration", () => {
    expect(output).toContain("using namespace System.Management.Automation");
  });

  it("includes top-level completions", () => {
    expect(output).toContain(
      "[CompletionResult]::new('auth', 'auth', [CompletionResultType]::ParameterValue, 'Manage authentication')",
    );
    expect(output).toContain(
      "[CompletionResult]::new('releases', 'releases', [CompletionResultType]::ParameterValue, 'Manage releases and rollouts')",
    );
  });

  it("includes all top-level commands", () => {
    const tree = getCommandTree();
    for (const cmd of Object.keys(tree)) {
      expect(output).toContain(`'${cmd}'`);
    }
  });

  it("includes subcommand switch cases", () => {
    expect(output).toContain("'auth' {");
    expect(output).toContain(
      "[CompletionResult]::new('login', 'login', [CompletionResultType]::ParameterValue, 'Authenticate with Google Play Developer API')",
    );
  });

  it("includes level-3 subcommand switch cases", () => {
    expect(output).toContain("'rollout' {");
    expect(output).toContain(
      "[CompletionResult]::new('increase', 'increase', [CompletionResultType]::ParameterValue, 'Increase a staged rollout')",
    );
  });

  it("includes new v0.9.7/v0.9.8 command switch cases", () => {
    expect(output).toContain("'recovery' {");
    expect(output).toContain("'data-safety' {");
    expect(output).toContain("'external-transactions' {");
    expect(output).toContain("'device-tiers' {");
    expect(output).toContain("'one-time-products' {");
    expect(output).toContain("'internal-sharing' {");
    expect(output).toContain("'generated-apks' {");
  });

  it("includes level-3 switch case for one-time-products offers", () => {
    expect(output).toContain("'offers' {");
    expect(output).toContain(
      "[CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List offers for a one-time product')",
    );
  });

  it("handles token counting for context detection", () => {
    expect(output).toContain("$tokenCount");
    expect(output).toContain("$command = $tokens[1]");
    expect(output).toContain("$subcommand = $tokens[2]");
  });
});
