import { describe, it, expect } from "vitest";
import {
  getCommandTree,
  generateBashCompletions,
  generateZshCompletions,
  generateFishCompletions,
  generatePowerShellCompletions,
  SUPPORTED_SHELLS,
} from "../src/commands/completion";

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
    const rolloutSubs = Object.keys(
      tree["releases"]?.subcommands?.["rollout"]?.subcommands ?? {},
    );
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

  it("every entry has a description", () => {
    const tree = getCommandTree();
    function checkDescriptions(defs: Record<string, { description: string; subcommands?: Record<string, any> }>, path: string) {
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

  it("handles token counting for context detection", () => {
    expect(output).toContain("$tokenCount");
    expect(output).toContain("$command = $tokens[1]");
    expect(output).toContain("$subcommand = $tokens[2]");
  });
});
