import type { Command } from "commander";
import { loadConfig } from "@gpc/config";
import { resolveAuth } from "@gpc/auth";
import { createUsersClient } from "@gpc/api";
import type { DeveloperPermission } from "@gpc/api";
import {
  listUsers,
  getUser,
  inviteUser,
  updateUser,
  removeUser,
  parseGrantArg,
  PERMISSION_PROPAGATION_WARNING,
  detectOutputFormat,
  formatOutput,
} from "@gpc/core";
import { isDryRun, printDryRun } from "../dry-run.js";
import { requireConfirm } from "../prompt.js";

function resolveDeveloperId(devIdArg: string | undefined, config: any): string {
  const id = devIdArg || config.developerId;
  if (!id) {
    console.error("Error: No developer ID. Use --developer-id <id> or gpc config set developerId <id>");
    process.exit(2);
  }
  return id;
}

async function getUsersClient(config: any) {
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
    .action(async (options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts().developerId, config);
      const client = await getUsersClient(config);
      const format = detectOutputFormat();

      try {
        const result = await listUsers(client, developerId, {
          limit: options.limit,
          nextPage: options.nextPage,
        });
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  users
    .command("get <email>")
    .description("Get user details")
    .action(async (email: string) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts().developerId, config);
      const client = await getUsersClient(config);
      const format = detectOutputFormat();

      try {
        const result = await getUser(client, developerId, email);
        console.log(formatOutput(result, format));
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  users
    .command("invite <email>")
    .description("Invite a user to the developer account")
    .option("--role <permissions...>", "Developer-level permissions")
    .option("--grant <grants...>", "Per-app grants (format: com.example.app:PERMISSION1,PERMISSION2)")
    .action(async (email: string, options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts().developerId, config);
      const format = detectOutputFormat();

      if (isDryRun(program)) {
        printDryRun({
          command: "users invite",
          action: "invite",
          target: email,
          details: { role: options.role, grant: options.grant },
        }, format, formatOutput);
        return;
      }

      const client = await getUsersClient(config);

      try {
        const permissions = options.role as DeveloperPermission[] | undefined;
        const grants = options.grant?.map((g: string) => parseGrantArg(g));
        const result = await inviteUser(client, developerId, email, permissions, grants);
        console.log(formatOutput(result, format));
        console.error(PERMISSION_PROPAGATION_WARNING);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  users
    .command("update <email>")
    .description("Update user permissions")
    .option("--role <permissions...>", "Developer-level permissions")
    .option("--grant <grants...>", "Per-app grants (format: com.example.app:PERMISSION1,PERMISSION2)")
    .action(async (email: string, options) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts().developerId, config);
      const format = detectOutputFormat();

      if (isDryRun(program)) {
        printDryRun({
          command: "users update",
          action: "update",
          target: email,
          details: { role: options.role, grant: options.grant },
        }, format, formatOutput);
        return;
      }

      const client = await getUsersClient(config);

      try {
        const permissions = options.role as DeveloperPermission[] | undefined;
        const grants = options.grant?.map((g: string) => parseGrantArg(g));
        const result = await updateUser(client, developerId, email, permissions, grants);
        console.log(formatOutput(result, format));
        console.error(PERMISSION_PROPAGATION_WARNING);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });

  users
    .command("remove <email>")
    .description("Remove a user from the developer account")
    .action(async (email: string) => {
      const config = await loadConfig();
      const developerId = resolveDeveloperId(users.opts().developerId, config);

      await requireConfirm(`Remove user "${email}" from developer account?`, program);

      if (isDryRun(program)) {
        const format = detectOutputFormat();
        printDryRun({
          command: "users remove",
          action: "remove",
          target: email,
        }, format, formatOutput);
        return;
      }

      const client = await getUsersClient(config);

      try {
        await removeUser(client, developerId, email);
        console.log(`User ${email} removed.`);
        console.error(PERMISSION_PROPAGATION_WARNING);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
