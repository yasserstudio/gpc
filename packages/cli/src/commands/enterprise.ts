import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createEnterpriseClient } from "@gpc-cli/api";
import { createEnterpriseApp, publishEnterpriseApp, formatOutput } from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";
import { yellow, dim, bold } from "../colors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getClient() {
  const config = await loadConfig();
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return { client: createEnterpriseClient({ auth }), config };
}

/** Matches a developer account ID — Google uses int64-shaped integers. */
const ACCOUNT_ID_RE = /^\d+$/;

/**
 * Resolve and validate the developer account ID from either `--account`
 * (preferred) or `--org` (deprecated alias). Emits a warning if `--org` is
 * used. Throws a clear error if neither is provided or the value isn't
 * numeric.
 *
 * Numeric validation happens here — BEFORE the permanent-private confirmation
 * prompt prints — so a user with a malformed account ID sees the error
 * immediately instead of typing "y" to a prompt showing the wrong target.
 * The api-client's `assertAccountId` still runs as defense-in-depth in case
 * this helper is bypassed.
 */
function resolveAccountId(opts: Record<string, unknown>): string {
  const account = opts["account"];
  const org = opts["org"];
  let raw: string | undefined;

  if (typeof account === "string" && account.length > 0) {
    raw = account;
  } else if (typeof org === "string" && org.length > 0) {
    console.warn(
      yellow("warning: --org is deprecated, use --account instead"),
      dim("(will be removed in a future version)"),
    );
    raw = org;
  }

  if (!raw) {
    throw Object.assign(
      new Error(
        "Missing required option --account. Provide your developer account ID from the Play Console URL.",
      ),
      { code: "MISSING_REQUIRED_OPTION", exitCode: 2 },
    );
  }

  if (!ACCOUNT_ID_RE.test(raw)) {
    throw Object.assign(
      new Error(
        [
          `Developer account ID must be numeric (got "${raw}").`,
          "Find your developer account ID in the Play Console URL:",
          "  https://play.google.com/console/developers/[ID]",
          "The ID is a long integer, not your Workspace or Cloud Identity organization ID.",
        ].join("\n"),
      ),
      { code: "ENTERPRISE_INVALID_ACCOUNT_ID", exitCode: 2 },
    );
  }

  return raw;
}

/**
 * Accumulator for commander's repeatable options.
 * Example: `--org-id a --org-id b` → `["a", "b"]`.
 */
function collect(value: string, previous: string[] | undefined): string[] {
  return [...(previous ?? []), value];
}

interface CreateOptions {
  bundle?: string;
  title: string;
  lang?: string;
  orgId?: string[];
  orgName?: string[];
}

/**
 * Zip `--org-id` and `--org-name` into the shape the core function expects.
 * Missing names produce undefined entries — that's fine, organizationName is optional.
 */
function zipOrganizations(
  orgIds?: string[],
  orgNames?: string[],
): Array<{ organizationId: string; organizationName?: string }> | undefined {
  if (!orgIds || orgIds.length === 0) return undefined;
  return orgIds.map((organizationId, i) => ({
    organizationId,
    organizationName: orgNames?.[i],
  }));
}

/**
 * Print the permanent-private confirmation prompt and block until user confirms.
 * Honors `--yes` and non-interactive environments via `requireConfirm`.
 */
async function confirmPermanentPrivate(
  program: Command,
  summary: {
    accountId: string;
    title: string;
    languageCode: string;
    bundlePath: string;
    organizations?: Array<{ organizationId: string; organizationName?: string }>;
  },
): Promise<void> {
  const orgSummary =
    summary.organizations && summary.organizations.length > 0
      ? summary.organizations
          .map((o) =>
            o.organizationName ? `${o.organizationId} (${o.organizationName})` : o.organizationId,
          )
          .join(", ")
      : dim("none specified — add later via Play Console");

  console.error("");
  console.error(bold(yellow("⚠  This will publish a PRIVATE app to Managed Google Play.")));
  console.error("");
  console.error(
    "   Private apps created via this API are permanently private and cannot be converted",
  );
  console.error(
    "   to public apps later. You can update versions, tracks, and listings via regular",
  );
  console.error(
    "   GPC commands (gpc releases, gpc tracks, gpc listings) — but the app will never",
  );
  console.error("   appear on the public Play Store.");
  console.error("");
  console.error(`   Developer account: ${summary.accountId}`);
  console.error(`   Title:             ${summary.title}`);
  console.error(`   Language:          ${summary.languageCode}`);
  console.error(`   Bundle:            ${summary.bundlePath}`);
  console.error(`   Organizations:     ${orgSummary}`);
  console.error("");

  await requireConfirm("Continue with private app creation?", program);
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerEnterpriseCommands(program: Command): void {
  const enterprise = program
    .command("enterprise")
    .description("Manage private enterprise apps via Managed Google Play (Play Custom App API)")
    .option("--account <id>", "Developer account ID (int64, from Play Console URL)")
    .option("--org <id>", "[DEPRECATED] Alias for --account — will be removed in a future version");

  // ----------------------------- create --------------------------------
  enterprise
    .command("create")
    .description("Create a new private enterprise app")
    .requiredOption("--title <title>", "App title (required)")
    .requiredOption("--bundle <path>", "Path to AAB or APK file to upload (required)")
    .option("--lang <code>", "Default listing language code (BCP 47)", "en_US")
    .option(
      "--org-id <id>",
      "Target enterprise organization ID (repeatable — use once per org)",
      collect,
    )
    .option(
      "--org-name <name>",
      "Human-readable organization name (repeatable, matched by position with --org-id)",
      collect,
    )
    .action(async (options: CreateOptions) => {
      const { client, config } = await getClient();
      const parentOpts = enterprise.opts();
      const accountId = resolveAccountId(parentOpts);
      const format = getOutputFormat(program, config);

      const languageCode = options.lang ?? "en_US";
      const organizations = zipOrganizations(options.orgId, options.orgName);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "enterprise create",
            action: "create private custom app (dry-run)",
            target: options.title,
            details: {
              accountId,
              bundlePath: options.bundle,
              title: options.title,
              languageCode,
              organizations: organizations ?? [],
            },
          },
          format,
          formatOutput,
        );
        return;
      }

      await confirmPermanentPrivate(program, {
        accountId,
        title: options.title,
        languageCode,
        bundlePath: options.bundle ?? "",
        organizations,
      });

      const result = await createEnterpriseApp(client, {
        accountId,
        bundlePath: options.bundle ?? "",
        title: options.title,
        languageCode,
        organizations,
      });

      console.log(formatOutput(result, format));
    });

  // ----------------------------- publish -------------------------------
  enterprise
    .command("publish <bundle>")
    .description("One-shot publish: validate, create, and return a private custom app package name")
    .requiredOption("--title <title>", "App title (required)")
    .option("--lang <code>", "Default listing language code (BCP 47)", "en_US")
    .option(
      "--org-id <id>",
      "Target enterprise organization ID (repeatable — use once per org)",
      collect,
    )
    .option(
      "--org-name <name>",
      "Human-readable organization name (repeatable, matched by position with --org-id)",
      collect,
    )
    .action(async (bundlePath: string, options: Omit<CreateOptions, "bundle">) => {
      const { client, config } = await getClient();
      const parentOpts = enterprise.opts();
      const accountId = resolveAccountId(parentOpts);
      const format = getOutputFormat(program, config);

      const languageCode = options.lang ?? "en_US";
      const organizations = zipOrganizations(options.orgId, options.orgName);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "enterprise publish",
            action: "publish private custom app (dry-run)",
            target: options.title,
            details: {
              accountId,
              bundlePath,
              title: options.title,
              languageCode,
              organizations: organizations ?? [],
            },
          },
          format,
          formatOutput,
        );
        return;
      }

      await confirmPermanentPrivate(program, {
        accountId,
        title: options.title,
        languageCode,
        bundlePath,
        organizations,
      });

      const result = await publishEnterpriseApp(client, {
        accountId,
        bundlePath,
        title: options.title,
        languageCode,
        organizations,
      });

      console.log(formatOutput(result, format));
    });

  // ------------------------------- list --------------------------------
  // Explicitly errors with a helpful message. The Play Custom App Publishing
  // API has no list method. Private apps appear in your regular developer
  // account — use `gpc apps list`.
  enterprise
    .command("list")
    .description("[REMOVED] Use `gpc apps list` — private apps appear in your regular account")
    .action(() => {
      console.error(
        [
          "gpc enterprise list was removed in v0.9.56.",
          "",
          "Google's Play Custom App Publishing API has no list method — private apps",
          "created via this API appear in your regular developer account alongside",
          "public apps. Use `gpc apps list` to see them.",
        ].join("\n"),
      );
      process.exit(2);
    });
}
