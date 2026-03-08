export const PLUGIN_SDK_VERSION = "0.8.0";

// ---------------------------------------------------------------------------
// Plugin interface
// ---------------------------------------------------------------------------

export interface GpcPlugin {
  /** Unique plugin name (e.g., "@gpc/plugin-ci" or "gpc-plugin-slack") */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Called once when the plugin is loaded. Register hooks here. */
  register(hooks: PluginHooks): void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export interface PluginHooks {
  /** Run before a command executes. Can modify context or abort. */
  beforeCommand(handler: BeforeCommandHandler): void;

  /** Run after a command completes successfully. */
  afterCommand(handler: AfterCommandHandler): void;

  /** Run when a command fails with an error. */
  onError(handler: ErrorHandler): void;

  /** Register additional CLI commands from the plugin. */
  registerCommands(handler: CommandRegistrar): void;
}

export type BeforeCommandHandler = (ctx: CommandEvent) => void | Promise<void>;
export type AfterCommandHandler = (ctx: CommandEvent, result: CommandResult) => void | Promise<void>;
export type ErrorHandler = (ctx: CommandEvent, error: PluginError) => void | Promise<void>;
export type CommandRegistrar = (registry: CommandRegistry) => void;

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export interface CommandEvent {
  /** The command name (e.g., "releases upload", "vitals crashes") */
  command: string;

  /** Resolved arguments passed to the command */
  args: Record<string, unknown>;

  /** App package name (if available) */
  app?: string;

  /** Timestamp when the command started */
  startedAt: Date;
}

export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;

  /** The output data (before formatting) */
  data?: unknown;

  /** Duration in milliseconds */
  durationMs: number;

  /** Exit code */
  exitCode: number;
}

export interface PluginError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Exit code */
  exitCode: number;

  /** Original error (if available) */
  cause?: Error;
}

// ---------------------------------------------------------------------------
// Command registry (for plugins that add commands)
// ---------------------------------------------------------------------------

export interface CommandRegistry {
  /** Add a new top-level command */
  add(definition: PluginCommand): void;
}

export interface PluginCommand {
  /** Command name (e.g., "deploy") */
  name: string;

  /** Command description */
  description: string;

  /** Command options */
  options?: PluginCommandOption[];

  /** Command arguments */
  arguments?: PluginCommandArgument[];

  /** The action to run */
  action: (args: Record<string, unknown>, options: Record<string, unknown>) => void | Promise<void>;
}

export interface PluginCommandOption {
  flags: string;
  description: string;
  defaultValue?: unknown;
}

export interface PluginCommandArgument {
  name: string;
  description: string;
  required?: boolean;
}

// ---------------------------------------------------------------------------
// Plugin metadata (for discovery and permission checks)
// ---------------------------------------------------------------------------

export interface PluginManifest {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Required permissions */
  permissions?: PluginPermission[];

  /** Whether this is a first-party (@gpc/*) plugin */
  trusted?: boolean;
}

export type PluginPermission =
  | "read:config"
  | "write:config"
  | "read:auth"
  | "api:read"
  | "api:write"
  | "commands:register"
  | "hooks:beforeCommand"
  | "hooks:afterCommand"
  | "hooks:onError";

// ---------------------------------------------------------------------------
// Helper to define a plugin (for plugin authors)
// ---------------------------------------------------------------------------

export function definePlugin(plugin: GpcPlugin): GpcPlugin {
  return plugin;
}
