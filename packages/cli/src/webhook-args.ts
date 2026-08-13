import type { Command } from "commander";

import type { PluginCommand } from "@gpc-cli/plugin-sdk";

const REDACTED_VALUE = "***REDACTED***";
const REQUIRED_SECRET_FLAGS = new Set([
  "--store-pass",
  "--key-pass",
  "--token",
  "--service-account",
  "--webhook-url",
  "--key",
  "--keystore",
  "--next-page",
  "--page-token",
]);
const OPTIONAL_SECRET_FLAGS = new Set(["--notify"]);

interface SensitiveCommandArguments {
  path: readonly string[];
  argumentNames: ReadonlySet<string>;
  descendants?: boolean;
}

const UNIVERSAL_SENSITIVE_ARGUMENT_NAMES: ReadonlySet<string> = new Set(["token"]);
const SENSITIVE_COMMAND_ARGUMENTS: readonly SensitiveCommandArguments[] = [
  { path: ["purchases"], argumentNames: UNIVERSAL_SENSITIVE_ARGUMENT_NAMES, descendants: true },
  { path: ["config", "set"], argumentNames: new Set(["value"]) },
  { path: ["rtdn", "decode"], argumentNames: new Set(["payload"]) },
];
const pluginSensitiveArguments = new WeakMap<Command, ReadonlySet<string>>();
const pluginSensitiveOptions = new WeakMap<Command, ReadonlySet<string>>();

/** Record plugin-declared sensitive fields on the Commander command that owns them. */
export function registerSensitivePluginCommand(command: Command, definition: PluginCommand): void {
  pluginSensitiveArguments.set(
    command,
    new Set(definition.arguments?.filter((argument) => argument.sensitive).map(({ name }) => name)),
  );

  const sensitiveFlags = new Set(
    definition.options?.filter((option) => option.sensitive).map(({ flags }) => flags),
  );
  pluginSensitiveOptions.set(
    command,
    new Set(
      command.options
        .filter((option) => sensitiveFlags.has(option.flags))
        .map((option) => option.attributeName()),
    ),
  );
}

function getCommandPath(command: Command): string[] {
  const path: string[] = [];
  let current: Command | null = command;
  while (current?.parent) {
    path.unshift(current.name());
    current = current.parent;
  }
  return path;
}

function matchesCommandPath(actual: readonly string[], rule: SensitiveCommandArguments): boolean {
  if (!rule.descendants && actual.length !== rule.path.length) return false;
  if (actual.length < rule.path.length) return false;
  return rule.path.every((part, index) => actual[index] === part);
}

function isSensitiveArgument(command: Command, argumentName: string): boolean {
  if (UNIVERSAL_SENSITIVE_ARGUMENT_NAMES.has(argumentName)) return true;
  if (pluginSensitiveArguments.get(command)?.has(argumentName)) return true;
  const path = getCommandPath(command);
  return SENSITIVE_COMMAND_ARGUMENTS.some(
    (rule) => matchesCommandPath(path, rule) && rule.argumentNames.has(argumentName),
  );
}

function redactValue(value: unknown): unknown {
  return Array.isArray(value) ? value.map(() => REDACTED_VALUE) : REDACTED_VALUE;
}

function sensitiveOptionNames(command: Command): Set<string> {
  const names = new Set(pluginSensitiveOptions.get(command));
  let current: Command | null = command;
  while (current) {
    for (const option of current.options) {
      const sensitive = [option.short, option.long].some(
        (flag) =>
          flag !== undefined &&
          (REQUIRED_SECRET_FLAGS.has(flag) || OPTIONAL_SECRET_FLAGS.has(flag)),
      );
      if (sensitive) names.add(option.attributeName());
    }
    current = current.parent;
  }
  return names;
}

function sensitivePluginOptions(
  command: Command,
): Map<string, { required: boolean; optional: boolean }> {
  const options = new Map<string, { required: boolean; optional: boolean }>();
  const visit = (current: Command): void => {
    const names = pluginSensitiveOptions.get(current);
    if (names) {
      for (const option of current.options) {
        if (!names.has(option.attributeName())) continue;
        const arity = { required: option.required, optional: option.optional };
        if (option.short) options.set(option.short, arity);
        if (option.long) options.set(option.long, arity);
      }
    }
    for (const child of current.commands) visit(child);
  };
  visit(command);
  return options;
}

function attachedSensitiveShortOption(
  argument: string,
  options: ReadonlyMap<string, { required: boolean; optional: boolean }>,
): boolean {
  if (!argument.startsWith("-") || argument.startsWith("--")) return false;
  for (const [flag, arity] of options) {
    if (
      (arity.required || arity.optional) &&
      argument.startsWith(flag) &&
      argument.length > flag.length
    ) {
      return true;
    }
  }
  return false;
}

function collectSensitiveArgumentValues(command: Command): Set<string> {
  const values = new Set<string>();
  command.registeredArguments.forEach((argument, index) => {
    if (!isSensitiveArgument(command, argument.name())) return;
    const value = command.processedArgs[index];
    if (Array.isArray(value)) {
      for (const entry of value) values.add(String(entry));
    } else if (value !== undefined) {
      values.add(String(value));
    }
  });
  for (const child of command.commands) {
    for (const value of collectSensitiveArgumentValues(child)) values.add(value);
  }
  return values;
}

/** Build resolved command metadata without exposing credential-bearing values. */
export function buildSafeCommandArguments(command: Command): Record<string, unknown> {
  const resolved = command.optsWithGlobals<Record<string, unknown>>();
  for (const name of sensitiveOptionNames(command)) {
    if (Object.hasOwn(resolved, name)) resolved[name] = redactValue(resolved[name]);
  }

  command.registeredArguments.forEach((argument, index) => {
    const value = command.processedArgs[index];
    if (value === undefined) return;
    resolved[argument.name()] = isSensitiveArgument(command, argument.name())
      ? redactValue(value)
      : value;
  });

  return resolved;
}

/** Remove secret-bearing options and their values from webhook command metadata. */
export function sanitizeWebhookCommandArgs(
  args: readonly string[],
  program?: Command,
  parsedSuccessfully = true,
): string[] {
  // After any parse failure, no raw token is safe to echo: a command-looking
  // token may itself be an option value. The webhook caller renders this as
  // the constant `unknown` instead of forwarding ambiguous argv.
  if (!parsedSuccessfully) return [];

  const declaredSecretOptions = program ? sensitivePluginOptions(program) : new Map();
  const sanitized: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const argument = args[index] ?? "";
    const flag = argument.split("=", 1)[0] ?? argument;
    const requiredSecret = REQUIRED_SECRET_FLAGS.has(flag);
    const optionalSecret = OPTIONAL_SECRET_FLAGS.has(flag);
    const declaredSecret = declaredSecretOptions.get(flag);
    const attachedDeclaredSecret = attachedSensitiveShortOption(argument, declaredSecretOptions);

    if (!requiredSecret && !optionalSecret && !declaredSecret && !attachedDeclaredSecret) {
      sanitized.push(argument);
      continue;
    }

    if (!argument.includes("=") && index + 1 < args.length) {
      const next = args[index + 1] ?? "";
      if (
        requiredSecret ||
        declaredSecret?.required ||
        (!next.startsWith("-") && (optionalSecret || declaredSecret?.optional))
      )
        index++;
    }
  }

  const positionalSecrets = program ? collectSensitiveArgumentValues(program) : new Set<string>();
  return sanitized.map((argument) => (positionalSecrets.has(argument) ? REDACTED_VALUE : argument));
}
