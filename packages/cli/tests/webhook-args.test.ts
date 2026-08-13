import { describe, expect, it } from "vitest";
import { Command } from "commander";

import {
  buildSafeCommandArguments,
  registerSensitivePluginCommand,
  sanitizeWebhookCommandArgs,
} from "../src/webhook-args.js";

describe("sanitizeWebhookCommandArgs", () => {
  async function sanitizePurchaseArgs(args: string[]): Promise<string[]> {
    const program = new Command().exitOverride();
    program.option("--app <package>").option("--notify [target]");
    const purchases = program.command("purchases");
    purchases.command("get <product-id> <token>").action(() => {});
    purchases
      .command("acknowledge <product-id> <token>")
      .option("--payload <text>")
      .action(() => {});
    const subscription = purchases.command("subscription");
    subscription.command("get <token>").action(() => {});
    subscription.command("cancel <subscription-id> <token>").action(() => {});
    const product = purchases.command("product");
    product.command("get-v2 <token>").action(() => {});

    await program.parseAsync(["node", "gpc", ...args]);
    return sanitizeWebhookCommandArgs(args, program);
  }

  it("removes sensitive flags and separate values", () => {
    expect(
      sanitizeWebhookCommandArgs([
        "doctor",
        "--store-pass",
        "hunter2",
        "--service-account",
        "/secret/key.json",
        "--notify",
        "slack",
        "--verify",
      ]),
    ).toEqual(["doctor", "--verify"]);
  });

  it("removes equals-form secrets and values beginning with a dash", () => {
    expect(
      sanitizeWebhookCommandArgs([
        "external-transactions",
        "create",
        "--token=secret-token",
        "--store-pass",
        "-secret-password",
        "--app",
        "com.example",
      ]),
    ).toEqual(["external-transactions", "create", "--app", "com.example"]);
  });

  it("does not consume the next flag when notify has no target", () => {
    expect(sanitizeWebhookCommandArgs(["apps", "list", "--notify", "--json"])).toEqual([
      "apps",
      "list",
      "--json",
    ]);
  });

  it("removes credential-bearing URL, key, and pagination flags", () => {
    expect(
      sanitizeWebhookCommandArgs([
        "watch",
        "--webhook-url",
        "https://hooks.slack.com/services/secret",
        "--key",
        "/secret/service-account.json",
        "--next-page",
        "opaque-page-token",
        "--page-token",
        "compat-page-token",
        "--rounds",
        "1",
      ]),
    ).toEqual(["watch", "--rounds", "1"]);
  });

  it("redacts compatibility page tokens from lifecycle metadata", async () => {
    const program = new Command().exitOverride();
    const command = program.command("subscriptions").option("--page-token <token>");
    command.action(() => {});
    await program.parseAsync(["node", "gpc", "subscriptions", "--page-token", "opaque-token"]);

    expect(buildSafeCommandArguments(command)).toMatchObject({
      pageToken: "***REDACTED***",
    });
  });

  it.each([
    [
      ["purchases", "get", "sku", "product-secret", "--app", "com.example"],
      ["purchases", "get", "sku", "***REDACTED***", "--app", "com.example"],
    ],
    [
      ["purchases", "subscription", "get", "subscription-secret"],
      ["purchases", "subscription", "get", "***REDACTED***"],
    ],
    [
      ["purchases", "subscription", "cancel", "monthly", "subscription-secret"],
      ["purchases", "subscription", "cancel", "monthly", "***REDACTED***"],
    ],
    [
      ["purchases", "product", "get-v2", "product-v2-secret"],
      ["purchases", "product", "get-v2", "***REDACTED***"],
    ],
  ])("redacts positional purchase credentials", async (input, expected) => {
    await expect(sanitizePurchaseArgs(input)).resolves.toEqual(expected);
  });

  it("redacts positional tokens with global options interspersed", async () => {
    await expect(
      sanitizePurchaseArgs([
        "purchases",
        "get",
        "--app",
        "com.example",
        "sku",
        "purchase-secret",
        "--notify",
        "slack",
      ]),
    ).resolves.toEqual(["purchases", "get", "--app", "com.example", "sku", "***REDACTED***"]);
  });

  it("redacts positional tokens with child options interspersed", async () => {
    await expect(
      sanitizePurchaseArgs([
        "purchases",
        "acknowledge",
        "--payload",
        "metadata",
        "sku",
        "purchase-secret",
      ]),
    ).resolves.toEqual([
      "purchases",
      "acknowledge",
      "--payload",
      "metadata",
      "sku",
      "***REDACTED***",
    ]);
  });

  it("fails closed for purchase argv when command parsing failed", () => {
    expect(
      sanitizeWebhookCommandArgs(
        ["--notify", "slack", "purchases", "get", "sku", "purchase-secret", "--bad"],
        undefined,
        false,
      ),
    ).toEqual([]);
  });

  it("fails closed when a sensitive option placed before its command consumes the command name", () => {
    const program = new Command().exitOverride();
    program.option("--notify [target]");
    program.command("doctor").option("--store-pass <value>");

    expect(
      sanitizeWebhookCommandArgs(
        ["--notify=slack", "--store-pass", "doctor", "hunter2"],
        program,
        false,
      ),
    ).toEqual([]);
  });

  it("redacts generic config values that may contain secrets", async () => {
    const program = new Command().exitOverride();
    program.option("--notify [target]");
    program
      .command("config")
      .command("set <key> <value>")
      .action(() => {});
    const args = [
      "--notify",
      "slack",
      "config",
      "set",
      "webhooks.slack",
      "https://hooks.slack.com/services/secret",
    ];
    await program.parseAsync(["node", "gpc", ...args]);

    expect(sanitizeWebhookCommandArgs(args, program)).toEqual([
      "config",
      "set",
      "webhooks.slack",
      "***REDACTED***",
    ]);
  });

  it("redacts RTDN payloads that may contain purchase tokens", async () => {
    const program = new Command().exitOverride();
    program.option("--notify [target]");
    program
      .command("rtdn")
      .command("decode <payload>")
      .action(() => {});
    const args = ["rtdn", "decode", "base64-payload-with-purchase-token"];
    await program.parseAsync(["node", "gpc", ...args]);

    expect(sanitizeWebhookCommandArgs(args, program)).toEqual(["rtdn", "decode", "***REDACTED***"]);
  });

  it("fails closed for RTDN decode argv when command parsing failed", () => {
    expect(
      sanitizeWebhookCommandArgs(
        ["--notify", "slack", "rtdn", "decode", "base64-secret", "--bad"],
        undefined,
        false,
      ),
    ).toEqual([]);
  });

  it("honors plugin-declared sensitive positional arguments and options", async () => {
    const program = new Command().exitOverride();
    const command = program.command("deploy <api-key>").option("--password <value>");
    registerSensitivePluginCommand(command, {
      name: "deploy",
      description: "Deploy with private integration credentials",
      arguments: [
        { name: "api-key", description: "Integration API key", required: true, sensitive: true },
      ],
      options: [{ flags: "--password <value>", description: "Password", sensitive: true }],
      action: () => {},
    });
    command.action(() => {});
    const args = ["deploy", "api-secret", "--password", "password-secret"];
    await program.parseAsync(["node", "gpc", ...args]);

    expect(sanitizeWebhookCommandArgs(args, program)).toEqual(["deploy", "***REDACTED***"]);
  });

  it("fails closed for plugin-sensitive argv when command parsing failed", () => {
    const program = new Command().exitOverride();
    const command = program.command("deploy <api-key>").option("--password <value>");
    registerSensitivePluginCommand(command, {
      name: "deploy",
      description: "Deploy with private integration credentials",
      arguments: [
        { name: "api-key", description: "Integration API key", required: true, sensitive: true },
      ],
      options: [{ flags: "--password <value>", description: "Password", sensitive: true }],
      action: () => {},
    });

    expect(
      sanitizeWebhookCommandArgs(
        ["deploy", "api-secret", "--password", "password-secret", "--bad"],
        program,
        false,
      ),
    ).toEqual([]);
  });

  it("finds a plugin command before stripping an ambiguously placed sensitive option", () => {
    const program = new Command().exitOverride();
    const command = program.command("login <api-key>").option("--password <value>");
    registerSensitivePluginCommand(command, {
      name: "login",
      description: "Authenticate with private integration credentials",
      arguments: [
        { name: "api-key", description: "Integration API key", required: true, sensitive: true },
      ],
      options: [{ flags: "--password <value>", description: "Password", sensitive: true }],
      action: () => {},
    });

    expect(
      sanitizeWebhookCommandArgs(
        ["--notify=slack", "--password", "login", "api-secret"],
        program,
        false,
      ),
    ).toEqual([]);
  });

  it("never echoes a command-looking token from ambiguous failed argv", () => {
    const program = new Command().exitOverride();
    program.command("status");
    program.command("doctor").option("--store-pass <value>");

    expect(
      sanitizeWebhookCommandArgs(
        ["--notify=slack", "--store-pass", "status", "doctor"],
        program,
        false,
      ),
    ).toEqual([]);
  });

  it("removes attached values from plugin-declared sensitive short options", async () => {
    const program = new Command().exitOverride();
    const command = program.command("deploy").option("-p, --password <value>");
    registerSensitivePluginCommand(command, {
      name: "deploy",
      description: "Deploy with a private password",
      options: [{ flags: "-p, --password <value>", description: "Password", sensitive: true }],
      action: () => {},
    });
    command.action(() => {});
    const args = ["deploy", "-ppassword-secret"];
    await program.parseAsync(["node", "gpc", ...args]);

    expect(sanitizeWebhookCommandArgs(args, program)).toEqual(["deploy"]);
  });
});
