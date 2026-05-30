import type {
  GpcPlugin,
  PluginHooks,
  BeforeCommandHandler,
  AfterCommandHandler,
  ErrorHandler,
  BeforeRequestHandler,
  AfterResponseHandler,
  CommandEvent,
  CommandResult,
  PluginError,
  PluginCommand,
  PluginManifest,
  PluginPermission,
  RequestEvent,
  ResponseEvent,
} from "@gpc-cli/plugin-sdk";
import { GpcError } from "./errors.js";

// ---------------------------------------------------------------------------
// Plugin Manager — orchestrates discovery, loading, and lifecycle
// ---------------------------------------------------------------------------

const FIRST_PARTY_PLUGINS = new Set(["@gpc-cli/plugin-ci", "@gpc-cli/plugin-sdk"]);

export class PluginManager {
  private plugins: LoadedPlugin[] = [];
  private beforeHandlers: BeforeCommandHandler[] = [];
  private afterHandlers: AfterCommandHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private beforeRequestHandlers: BeforeRequestHandler[] = [];
  private afterResponseHandlers: AfterResponseHandler[] = [];
  private registeredCommands: PluginCommand[] = [];

  /** Load and register a plugin */
  async load(plugin: GpcPlugin, manifest?: PluginManifest): Promise<void> {
    const isTrusted = manifest?.trusted ?? FIRST_PARTY_PLUGINS.has(plugin.name);

    if (!isTrusted && manifest?.permissions) {
      validatePermissions(manifest.permissions);
    }

    const allHooks = createHooks(
      this.beforeHandlers,
      this.afterHandlers,
      this.errorHandlers,
      this.beforeRequestHandlers,
      this.afterResponseHandlers,
      this.registeredCommands,
    );

    const hooks =
      isTrusted || !manifest?.permissions
        ? allHooks
        : createRestrictedHooks(allHooks, new Set(manifest.permissions));

    try {
      await plugin.register(hooks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[gpc] Plugin "${plugin.name}" failed to register: ${msg}`);
      return;
    }

    this.plugins.push({
      name: plugin.name,
      version: plugin.version,
      trusted: isTrusted,
    });
  }

  /** Run all beforeCommand handlers */
  async runBeforeCommand(event: CommandEvent): Promise<void> {
    for (const handler of this.beforeHandlers) {
      await handler(event);
    }
  }

  /** Run all afterCommand handlers */
  async runAfterCommand(event: CommandEvent, result: CommandResult): Promise<void> {
    for (const handler of this.afterHandlers) {
      await handler(event, result);
    }
  }

  /** Run all onError handlers */
  async runOnError(event: CommandEvent, error: PluginError): Promise<void> {
    for (const handler of this.errorHandlers) {
      try {
        await handler(event, error);
      } catch {
        // Don't let error handlers crash the process
      }
    }
  }

  /** Run all beforeRequest handlers */
  async runBeforeRequest(event: RequestEvent): Promise<void> {
    for (const handler of this.beforeRequestHandlers) {
      try {
        await handler(event);
      } catch {
        // Don't let request hooks block API calls
      }
    }
  }

  /** Run all afterResponse handlers */
  async runAfterResponse(event: RequestEvent, response: ResponseEvent): Promise<void> {
    for (const handler of this.afterResponseHandlers) {
      try {
        await handler(event, response);
      } catch {
        // Don't let response hooks crash the process
      }
    }
  }

  /** Get commands registered by plugins */
  getRegisteredCommands(): PluginCommand[] {
    return [...this.registeredCommands];
  }

  /** Get list of loaded plugins */
  getLoadedPlugins(): LoadedPlugin[] {
    return [...this.plugins];
  }

  /** Whether any request/response hooks are registered */
  hasRequestHooks(): boolean {
    return this.beforeRequestHandlers.length > 0 || this.afterResponseHandlers.length > 0;
  }

  /** Reset (for testing) */
  reset(): void {
    this.plugins = [];
    this.beforeHandlers = [];
    this.afterHandlers = [];
    this.errorHandlers = [];
    this.beforeRequestHandlers = [];
    this.afterResponseHandlers = [];
    this.registeredCommands = [];
  }
}

export interface LoadedPlugin {
  name: string;
  version: string;
  trusted: boolean;
}

// ---------------------------------------------------------------------------
// Hook factory
// ---------------------------------------------------------------------------

function createHooks(
  beforeHandlers: BeforeCommandHandler[],
  afterHandlers: AfterCommandHandler[],
  errorHandlers: ErrorHandler[],
  beforeRequestHandlers: BeforeRequestHandler[],
  afterResponseHandlers: AfterResponseHandler[],
  registeredCommands: PluginCommand[],
): PluginHooks {
  return {
    beforeCommand(handler) {
      beforeHandlers.push(handler);
    },
    afterCommand(handler) {
      afterHandlers.push(handler);
    },
    onError(handler) {
      errorHandlers.push(handler);
    },
    beforeRequest(handler) {
      beforeRequestHandlers.push(handler);
    },
    afterResponse(handler) {
      afterResponseHandlers.push(handler);
    },
    registerCommands(registrar) {
      const registry = {
        add(cmd: PluginCommand) {
          registeredCommands.push(cmd);
        },
      };
      registrar(registry);
    },
  };
}

// ---------------------------------------------------------------------------
// Restricted hooks — gate access based on declared permissions
// ---------------------------------------------------------------------------

const HOOK_PERMISSIONS: Record<keyof PluginHooks, PluginPermission> = {
  beforeCommand: "hooks:beforeCommand",
  afterCommand: "hooks:afterCommand",
  onError: "hooks:onError",
  beforeRequest: "hooks:beforeRequest",
  afterResponse: "hooks:afterResponse",
  registerCommands: "commands:register",
};

function createRestrictedHooks(
  inner: PluginHooks,
  permissions: ReadonlySet<PluginPermission>,
): PluginHooks {
  function gate<K extends keyof PluginHooks>(key: K): PluginHooks[K] {
    const requiredPerm = HOOK_PERMISSIONS[key];
    if (permissions.has(requiredPerm)) {
      return inner[key];
    }
    return (() => {
      console.warn(`[gpc] Plugin lacks permission "${requiredPerm}" for hook "${key}"`);
    }) as PluginHooks[K];
  }

  return {
    beforeCommand: gate("beforeCommand"),
    afterCommand: gate("afterCommand"),
    onError: gate("onError"),
    beforeRequest: gate("beforeRequest"),
    afterResponse: gate("afterResponse"),
    registerCommands: gate("registerCommands"),
  };
}

// ---------------------------------------------------------------------------
// Permission validation
// ---------------------------------------------------------------------------

const VALID_PERMISSIONS: ReadonlySet<string> = new Set<PluginPermission>([
  "read:config",
  "write:config",
  "read:auth",
  "api:read",
  "api:write",
  "commands:register",
  "hooks:beforeCommand",
  "hooks:afterCommand",
  "hooks:onError",
  "hooks:beforeRequest",
  "hooks:afterResponse",
]);

function validatePermissions(permissions: PluginPermission[]): void {
  for (const perm of permissions) {
    if (!VALID_PERMISSIONS.has(perm)) {
      throw new GpcError(
        `Unknown plugin permission: "${perm}"`,
        "PLUGIN_INVALID_PERMISSION",
        10,
        `Valid permissions: ${[...VALID_PERMISSIONS].join(", ")}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Plugin discovery
// ---------------------------------------------------------------------------

export interface DiscoverPluginsOptions {
  /** Plugin names from config file */
  configPlugins?: string[];

  /** Approved third-party plugin names (from config.approvedPlugins) */
  approvedPlugins?: string[];

  /** Working directory for node_modules scanning */
  cwd?: string;
}

function isPluginTrusted(specifier: string, approved?: Set<string>): boolean {
  if (specifier.startsWith("@gpc-cli/")) return true;
  return approved?.has(specifier) ?? false;
}

/**
 * Discover plugins from config: gpc.config.ts → plugins: [...]
 *
 * Only trusted/approved plugins are imported. Untrusted specifiers are
 * skipped before import() to prevent top-level module code execution.
 */
export async function discoverPlugins(options?: DiscoverPluginsOptions): Promise<GpcPlugin[]> {
  const plugins: GpcPlugin[] = [];
  const seen = new Set<string>();
  const approved = options?.approvedPlugins ? new Set(options.approvedPlugins) : undefined;

  if (options?.configPlugins) {
    for (const name of options.configPlugins) {
      if (seen.has(name)) continue;
      if (!isPluginTrusted(name, approved)) continue;
      try {
        const mod = await import(name);
        const plugin = resolvePlugin(mod);
        if (plugin) {
          plugins.push(plugin);
          seen.add(name);
        }
      } catch {
        // Plugin not found — skip silently
      }
    }
  }

  return plugins;
}

/**
 * Resolve a plugin from a module.
 * Supports: default export, named `plugin` export, or the module itself as a plugin.
 */
function resolvePlugin(mod: unknown): GpcPlugin | undefined {
  if (!mod || typeof mod !== "object") return undefined;

  const m = mod as Record<string, unknown>;

  // Check default export
  if (isPlugin(m["default"])) return m["default"];

  // Check named `plugin` export
  if (isPlugin(m["plugin"])) return m["plugin"];

  // Check if module itself is a plugin
  if (isPlugin(m)) return m as unknown as GpcPlugin;

  return undefined;
}

function isPlugin(obj: unknown): obj is GpcPlugin {
  if (!obj || typeof obj !== "object") return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p["name"] === "string" &&
    typeof p["version"] === "string" &&
    typeof p["register"] === "function"
  );
}
