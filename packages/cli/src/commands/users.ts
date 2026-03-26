import type { Command } from "commander";
import type { GpcConfig } from "@gpc-cli/config";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createUsersClient } from "@gpc-cli/api";
import type { DeveloperPermission } from "@gpc-cli/api";
import {
  listUsers,
  getUser,
  inviteUser,
  updateUser,
  removeUser,
  parseGrantArg,
  PERMISSION_PROPAGATION_WARNING,
  formatOutput,
  sortResults,
  GpcError,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";

function resolveDeveloperId(devIdArg: string | undefined, config: GpcConfig): string {
  const id = devIdArg || config.developerId;
  if (!id) {
    throw new GpcError(
      "No developer ID. Use --developer-id <id> or gpc config set developerId <id>",
      "MISSING_DEVELOPER_ID",
      2,
      "gpc config set developerId <id>",
    );
  }
  return id;
}

async function getUsersClient(config: GpcConfig) {
  const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
  return createUsersClient({ auth });
}

export function registerUsersCommands(program: Command): void {
  const users = program
    .command("users")
    .description("Manage developer account users and permissions")
    .option("--developer-id <id>", "Developer account ID");

  users
    .command("list")
    .description("List all users in the developer account")
    .option("--limit <n>", "Maximum total results", parseInt)
    .option("--next-page <token>", "Resume from page token")
    .option("--sort <field>", "Sort by field (prefix with - for descending)")
    .action(async (options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts()["developerId"], config);
      const client = await getUsersClient(config);
      const format = getOutputFormat(program, config);

      const result = await listUsers(client, developerId, {
        limit: options.limit,
        nextPage: options.nextPage,
      });
      if (options.sort) {
        result.users = sortResults(result.users, options.sort);
      }
      if (format !== "json") {
        const users = (result.users || []) as unknown as Record<string, unknown>[];
        if (users.length === 0) {
          console.log("No users found.");
        } else {
          const rows = users.map((u) => ({
            email: u["email"] || "-",
            name: u["name"] || "-",
            accessState: u["accessState"] || "-",
            grants: Array.isArray(u["grants"]) ? (u["grants"] as unknown[]).length : 0,
            permissions: Array.isArray(u["developerAccountPermission"])
              ? (u["developerAccountPermission"] as unknown[]).length
              : 0,
          }));
          console.log(formatOutput(rows, format));
        }
      } else {
        console.log(formatOutput(result, format));
      }
    });

  users
    .command("get <email>")
    .description("Get user details")
    .action(async (email: string) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts()["developerId"], config);
      const client = await getUsersClient(config);
      const format = getOutputFormat(program, config);

      const result = await getUser(client, developerId, email);
      console.log(formatOutput(result, format));
    });

  users
    .command("invite <email>")
    .description("Invite a user to the developer account")
    .option("--role <permissions...>", "Developer-level permissions")
    .option(
      "--grant <grants...>",
      "Per-app grants (format: com.example.app:PERMISSION1,PERMISSION2)",
    )
    .action(async (email: string, options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts()["developerId"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "users invite",
            action: "invite",
            target: email,
            details: { role: options.role, grant: options.grant },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getUsersClient(config);

      const permissions = options.role as DeveloperPermission[] | undefined;
      const grants = options.grant?.map((g: string) => parseGrantArg(g));
      const result = await inviteUser(client, developerId, email, permissions, grants);
      console.log(formatOutput(result, format));
      console.error(PERMISSION_PROPAGATION_WARNING);
    });

  users
    .command("update <email>")
    .description("Update user permissions")
    .option("--role <permissions...>", "Developer-level permissions")
    .option(
      "--grant <grants...>",
      "Per-app grants (format: com.example.app:PERMISSION1,PERMISSION2)",
    )
    .action(async (email: string, options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts()["developerId"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "users update",
            action: "update",
            target: email,
            details: { role: options.role, grant: options.grant },
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getUsersClient(config);

      const permissions = options.role as DeveloperPermission[] | undefined;
      const grants = options.grant?.map((g: string) => parseGrantArg(g));
      const result = await updateUser(client, developerId, email, permissions, grants);
      console.log(formatOutput(result, format));
      console.error(PERMISSION_PROPAGATION_WARNING);
    });

  users
    .command("remove <email>")
    .description("Remove a user from the developer account")
    .action(async (email: string) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts()["developerId"], config);

      await requireConfirm(`Remove user "${email}" from developer account?`, program);

      if (isDryRun(program)) {
        const format = getOutputFormat(program, config);
        printDryRun(
          {
            command: "users remove",
            action: "remove",
            target: email,
          },
          format,
          formatOutput,
        );
        return;
      }

      const client = await getUsersClient(config);

      await removeUser(client, developerId, email);
      console.log(`User ${email} removed.`);
      console.error(PERMISSION_PROPAGATION_WARNING);
    });
}
