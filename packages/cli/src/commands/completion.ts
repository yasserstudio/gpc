import type { Command } from "commander";

export function registerCompletionCommand(program: Command): void {
  const completion = program
    .command("completion")
    .description("Generate shell completions");

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
}

function generateBashCompletions(): string {
  return `# bash completion for gpc
_gpc() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="auth config doctor docs completion"

  case "\${prev}" in
    gpc)
      COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
    auth)
      COMPREPLY=( $(compgen -W "login status logout whoami" -- "\${cur}") )
      return 0
      ;;
    config)
      COMPREPLY=( $(compgen -W "init show set path" -- "\${cur}") )
      return 0
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
      return 0
      ;;
  esac

  COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
  return 0
}

complete -F _gpc gpc`;
}

function generateZshCompletions(): string {
  return `#compdef gpc

_gpc() {
  local -a commands auth_commands config_commands completion_commands

  commands=(
    'auth:Manage authentication'
    'config:Manage CLI configuration'
    'doctor:Check environment and configuration'
    'docs:Open documentation'
    'completion:Generate shell completions'
  )

  auth_commands=(
    'login:Authenticate with Google Play Console'
    'status:Show current authentication status'
    'logout:Remove stored credentials'
    'whoami:Show the authenticated account'
  )

  config_commands=(
    'init:Initialize a new configuration'
    'show:Show current configuration'
    'set:Set a configuration value'
    'path:Show the configuration file path'
  )

  completion_commands=(
    'bash:Generate bash completions'
    'zsh:Generate zsh completions'
    'fish:Generate fish completions'
  )

  _arguments -C \\
    '1: :->command' \\
    '2: :->subcommand' \\
    '*::arg:->args'

  case "\$state" in
    command)
      _describe -t commands 'gpc commands' commands
      ;;
    subcommand)
      case "\$words[2]" in
        auth)
          _describe -t auth_commands 'auth commands' auth_commands
          ;;
        config)
          _describe -t config_commands 'config commands' config_commands
          ;;
        completion)
          _describe -t completion_commands 'completion commands' completion_commands
          ;;
      esac
      ;;
  esac
}

_gpc "\$@"`;
}

function generateFishCompletions(): string {
  return `# fish completions for gpc

# Disable file completions by default
complete -c gpc -f

# Top-level commands
complete -c gpc -n '__fish_use_subcommand' -a auth -d 'Manage authentication'
complete -c gpc -n '__fish_use_subcommand' -a config -d 'Manage CLI configuration'
complete -c gpc -n '__fish_use_subcommand' -a doctor -d 'Check environment and configuration'
complete -c gpc -n '__fish_use_subcommand' -a docs -d 'Open documentation'
complete -c gpc -n '__fish_use_subcommand' -a completion -d 'Generate shell completions'

# auth subcommands
complete -c gpc -n '__fish_seen_subcommand_from auth' -a login -d 'Authenticate with Google Play Console'
complete -c gpc -n '__fish_seen_subcommand_from auth' -a status -d 'Show current authentication status'
complete -c gpc -n '__fish_seen_subcommand_from auth' -a logout -d 'Remove stored credentials'
complete -c gpc -n '__fish_seen_subcommand_from auth' -a whoami -d 'Show the authenticated account'

# config subcommands
complete -c gpc -n '__fish_seen_subcommand_from config' -a init -d 'Initialize a new configuration'
complete -c gpc -n '__fish_seen_subcommand_from config' -a show -d 'Show current configuration'
complete -c gpc -n '__fish_seen_subcommand_from config' -a set -d 'Set a configuration value'
complete -c gpc -n '__fish_seen_subcommand_from config' -a path -d 'Show the configuration file path'

# completion subcommands
complete -c gpc -n '__fish_seen_subcommand_from completion' -a bash -d 'Generate bash completions'
complete -c gpc -n '__fish_seen_subcommand_from completion' -a zsh -d 'Generate zsh completions'
complete -c gpc -n '__fish_seen_subcommand_from completion' -a fish -d 'Generate fish completions'`;
}
