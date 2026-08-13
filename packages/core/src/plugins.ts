import { readFile } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePluginApprovalId } from "@gpc-cli/config";
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

const FIRST_PARTY_PLUGINS = new Set(["@gpc-cli/plugin-ci"]);
const discoveredPluginManifests = new WeakMap<GpcPlugin, PluginManifest>();

function isFirstPartyPluginSpecifier(specifier: string): boolean {
  return FIRST_PARTY_PLUGINS.has(specifier);
}

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
    const effectiveManifest = manifest ?? discoveredPluginManifests.get(plugin);
    const isTrusted = effectiveManifest
      ? effectiveManifest.trusted === true
      : FIRST_PARTY_PLUGINS.has(plugin.name);

    if (!isTrusted && effectiveManifest) {
      if (!effectiveManifest.permissions) {
        throw new GpcError(
          `Third-party plugin "${effectiveManifest.name}" must declare permissions in package.json under gpc.permissions`,
          "PLUGIN_PERMISSIONS_REQUIRED",
          10,
          "Declare only the lifecycle hooks the plugin needs, then reinstall or relink it.",
        );
      }
      validatePermissions(effectiveManifest.permissions);
    }

    // Stage registrations so a plugin that throws part-way through register()
    // cannot leave active hooks or commands behind.
    const stagedBeforeHandlers: BeforeCommandHandler[] = [];
    const stagedAfterHandlers: AfterCommandHandler[] = [];
    const stagedErrorHandlers: ErrorHandler[] = [];
    const stagedBeforeRequestHandlers: BeforeRequestHandler[] = [];
    const stagedAfterResponseHandlers: AfterResponseHandler[] = [];
    const stagedCommands: PluginCommand[] = [];
    const allHooks = createHooks(
      stagedBeforeHandlers,
      stagedAfterHandlers,
      stagedErrorHandlers,
      stagedBeforeRequestHandlers,
      stagedAfterResponseHandlers,
      stagedCommands,
    );

    const hooks =
      isTrusted || !effectiveManifest
        ? allHooks
        : createRestrictedHooks(allHooks, new Set(effectiveManifest.permissions));

    try {
      await plugin.register(hooks);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[gpc] Plugin "${plugin.name}" failed to register: ${msg}`);
      return;
    }

    this.beforeHandlers.push(...stagedBeforeHandlers);
    this.afterHandlers.push(...stagedAfterHandlers);
    this.errorHandlers.push(...stagedErrorHandlers);
    this.beforeRequestHandlers.push(...stagedBeforeRequestHandlers);
    this.afterResponseHandlers.push(...stagedAfterResponseHandlers);
    this.registeredCommands.push(...stagedCommands);
    this.plugins.push({
      name: effectiveManifest?.name ?? plugin.name,
      version: effectiveManifest?.version ?? plugin.version,
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
      try {
        await handler(event, result);
      } catch {
        // Don't let completion hooks turn a successful command into a failure
      }
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

const LEGACY_PLUGIN_PERMISSIONS = Object.values(HOOK_PERMISSIONS);

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

  /** Approved plugins explicitly grandfathered for missing permission metadata */
  legacyApprovedPlugins?: string[];

  /** Base directory for resolving relative plugin paths */
  cwd?: string;

  /** @internal Testable resolver for verifying package identity before import. */
  resolveSpecifier?: (specifier: string) => string;
}

export interface DiscoveredPlugin {
  plugin: GpcPlugin;
  manifest: PluginManifest;
  /** True when broad compatibility permissions were supplied for an older plugin package. */
  legacyPermissions: boolean;
}

function isPluginTrusted(specifier: string, approvalId: string, approved?: Set<string>): boolean {
  if (isFirstPartyPluginSpecifier(specifier)) return true;
  return approved?.has(approvalId) ?? false;
}

/**
 * Discover plugins supplied through `configPlugins` (normally `.gpcrc.json`'s `plugins` field).
 *
 * Only trusted/approved plugins are imported. Untrusted specifiers are
 * skipped before import() to prevent top-level module code execution.
 */
export async function discoverPluginEntries(
  options?: DiscoverPluginsOptions,
): Promise<DiscoveredPlugin[]> {
  const plugins: DiscoveredPlugin[] = [];
  const seen = new Set<string>();
  const cwd = options?.cwd;
  const approved = options?.approvedPlugins
    ? new Set(options.approvedPlugins.map((name) => resolvePluginApprovalId(name, cwd)))
    : undefined;
  const legacyApproved = new Set(
    (options?.legacyApprovedPlugins ?? []).map((name) => resolvePluginApprovalId(name, cwd)),
  );

  if (options?.configPlugins) {
    for (const name of options.configPlugins) {
      const resolvedSpecifier = resolvePluginApprovalId(name, cwd);
      if (seen.has(resolvedSpecifier)) continue;
      if (!isPluginTrusted(name, resolvedSpecifier, approved)) continue;
      try {
        const manifestInfo = await readPluginManifest(resolvedSpecifier, options?.resolveSpecifier);
        const claimsFirstParty = isFirstPartyPluginSpecifier(name);
        const trusted =
          claimsFirstParty && manifestInfo.packageFound && manifestInfo.manifest.name === name;
        if (claimsFirstParty && !trusted) {
          throw new GpcError(
            `Configured first-party plugin "${name}" resolved to package "${manifestInfo.manifest.name}"`,
            "PLUGIN_IDENTITY_MISMATCH",
            10,
            "Remove npm aliases or replacements for first-party GPC plugin packages.",
          );
        }
        if (!trusted && manifestInfo.legacyPermissions && !legacyApproved.has(resolvedSpecifier)) {
          throw new GpcError(
            `Third-party plugin "${manifestInfo.manifest.name}" must declare permissions in package.json under gpc.permissions`,
            "PLUGIN_PERMISSIONS_REQUIRED",
            10,
            "Ask the plugin author to publish an explicit permission list before approving it.",
          );
        }
        if (!trusted) validatePermissions(manifestInfo.manifest.permissions ?? []);

        const mod = await import(resolvedSpecifier);
        const plugin = resolvePlugin(mod);
        if (plugin) {
          const manifest = trusted
            ? {
                name: manifestInfo.manifest.name,
                version: manifestInfo.manifest.version,
                trusted: true,
              }
            : manifestInfo.manifest;
          const entry: DiscoveredPlugin = {
            plugin,
            manifest,
            legacyPermissions: manifestInfo?.legacyPermissions ?? false,
          };
          discoveredPluginManifests.set(plugin, entry.manifest);
          plugins.push(entry);
          seen.add(resolvedSpecifier);
        }
      } catch (error) {
        if (error instanceof GpcError && error.code.startsWith("PLUGIN_")) {
          console.warn(`[gpc] Skipping plugin "${name}": ${error.message}`);
        }
        // Missing or invalid plugin — keep unrelated commands available.
      }
    }
  }

  return plugins;
}

/**
 * Backwards-compatible discovery API for SDK consumers that load plugins themselves.
 * Callers using the original approvedPlugins-only contract retain legacy metadata behavior;
 * the CLI uses discoverPluginEntries() with its persisted, stricter compatibility set.
 */
export async function discoverPlugins(options?: DiscoverPluginsOptions): Promise<GpcPlugin[]> {
  const compatibilityOptions =
    options?.legacyApprovedPlugins === undefined
      ? { ...options, legacyApprovedPlugins: options?.approvedPlugins }
      : options;
  const entries = await discoverPluginEntries(compatibilityOptions);
  return entries.map(({ plugin }) => plugin);
}

export interface ValidatedPluginApproval {
  specifier: string;
  manifest: PluginManifest;
}

/** Validate a third-party package before adding it to the user's approval list. */
export async function validatePluginForApproval(
  specifier: string,
  cwd?: string,
): Promise<ValidatedPluginApproval> {
  const resolvedSpecifier = resolvePluginApprovalId(specifier, cwd);
  const manifestInfo = await readPluginManifest(resolvedSpecifier);
  if (manifestInfo.legacyPermissions) {
    throw new GpcError(
      `Third-party plugin "${manifestInfo.manifest.name}" must declare permissions in package.json under gpc.permissions`,
      "PLUGIN_PERMISSIONS_REQUIRED",
      10,
      "Ask the plugin author to publish an explicit permission list before approving it.",
    );
  }
  validatePermissions(manifestInfo.manifest.permissions ?? []);
  return { specifier: resolvedSpecifier, manifest: manifestInfo.manifest };
}

async function readPluginManifest(
  specifier: string,
  resolveSpecifier?: (specifier: string) => string,
): Promise<{ manifest: PluginManifest; legacyPermissions: boolean; packageFound: boolean }> {
  const { packageJson, adjacent } = await findPackageJson(specifier, resolveSpecifier);
  const gpc =
    packageJson?.["gpc"] && typeof packageJson["gpc"] === "object"
      ? (packageJson["gpc"] as Record<string, unknown>)
      : undefined;
  const permissionDeclaration = gpc?.["permissions"];

  // package.json lookup walks up to the nearest enclosing package. For a package
  // entry point that package IS the plugin, so its name is the right identity.
  // For a loose file it is merely whatever project happens to contain the file,
  // and adopting that name would attribute the plugin to an unrelated package
  // and disagree with the approval record, which stores the file URL.
  //
  // Two signals mark the package as the plugin rather than an incidental
  // container: a package.json sitting beside the module, or a gpc.permissions
  // declaration opting the package in. Either is enough. A file specifier with
  // neither is a loose script inside some larger project, so it is identified by
  // its path — which is also what the approval record stores.
  const declaresPluginMetadata = permissionDeclaration !== undefined;
  const identifyByPath = specifier.startsWith("file:") && !declaresPluginMetadata && !adjacent;
  const packageName =
    !identifyByPath && typeof packageJson?.["name"] === "string" ? packageJson["name"] : specifier;
  const packageVersion =
    !identifyByPath && typeof packageJson?.["version"] === "string"
      ? packageJson["version"]
      : "unknown";

  if (permissionDeclaration !== undefined && !Array.isArray(permissionDeclaration)) {
    throw new GpcError(
      `Plugin "${packageName}" must declare gpc.permissions as an array`,
      "PLUGIN_INVALID_PERMISSION",
      10,
      "Declare permissions as a JSON array of supported permission names.",
    );
  }
  const permissions = permissionDeclaration as PluginPermission[] | undefined;

  return {
    manifest: {
      name: packageName,
      version: packageVersion,
      permissions: permissions ?? [...LEGACY_PLUGIN_PERMISSIONS],
      trusted: false,
    },
    legacyPermissions: permissions === undefined,
    packageFound: packageJson !== undefined,
  };
}

interface FoundPackageJson {
  packageJson?: Record<string, unknown>;
  /** True when the manifest sits in the module's own directory, not an ancestor. */
  adjacent: boolean;
}

async function findPackageJson(
  specifier: string,
  resolveSpecifier: (specifier: string) => string = import.meta.resolve,
): Promise<FoundPackageJson> {
  let resolved: string;
  try {
    resolved = resolveSpecifier(specifier);
  } catch {
    return { adjacent: false };
  }
  if (!resolved.startsWith("file:")) return { adjacent: false };

  const moduleDirectory = dirname(fileURLToPath(resolved));
  let directory = moduleDirectory;
  const root = parse(directory).root;
  while (directory !== root) {
    let contents: string;
    try {
      contents = await readFile(join(directory, "package.json"), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return { adjacent: false };
      directory = dirname(directory);
      continue;
    }
    try {
      return {
        packageJson: JSON.parse(contents) as Record<string, unknown>,
        adjacent: directory === moduleDirectory,
      };
    } catch {
      // Do not borrow metadata from an ancestor if the nearest package is malformed.
      return { adjacent: false };
    }
  }
  return { adjacent: false };
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
