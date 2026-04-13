import type { UsersApiClient, User, DeveloperLevelPermission, AppLevelPermission, Grant } from "@gpc-cli/api";
import { paginateAll } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export const PERMISSION_PROPAGATION_WARNING =
  "Note: Permission changes may take up to 48 hours to propagate.";

export interface ListUsersOptions {
  pageToken?: string;
  pageSize?: number;
  limit?: number;
  nextPage?: string;
}

export async function listUsers(
  client: UsersApiClient,
  developerId: string,
  options?: ListUsersOptions,
): Promise<{ users: User[]; nextPageToken?: string }> {
  if (options?.limit || options?.nextPage) {
    const result = await paginateAll<User>(
      async (pageToken) => {
        const resp = await client.list(developerId, { pageToken, pageSize: options?.pageSize });
        return { items: resp.users || [], nextPageToken: resp.nextPageToken };
      },
      { limit: options.limit, startPageToken: options.nextPage },
    );
    return { users: result.items, nextPageToken: result.nextPageToken };
  }
  const response = await client.list(developerId, options);
  return { users: response.users || [], nextPageToken: response.nextPageToken };
}

export async function getUser(
  client: UsersApiClient,
  developerId: string,
  email: string,
): Promise<User> {
  // No GET endpoint exists on the users resource. Paginate through list and filter.
  const lowerEmail = email.toLowerCase();
  let pageToken: string | undefined;
  do {
    const response = await client.list(developerId, pageToken ? { pageToken } : undefined);
    const users = response.users || [];
    const match = users.find((u) => u.email?.toLowerCase() === lowerEmail);
    if (match) return match;
    pageToken = response.nextPageToken;
  } while (pageToken);

  throw new GpcError(
    `User "${email}" not found in developer account.`,
    "USER_NOT_FOUND",
    4,
    "Check the email address and ensure the user has access to this developer account.",
  );
}

export async function inviteUser(
  client: UsersApiClient,
  developerId: string,
  email: string,
  permissions?: DeveloperLevelPermission[],
  grants?: Grant[],
): Promise<User> {
  const user: Partial<User> = { email };
  if (permissions) user.developerAccountPermission = permissions;
  if (grants) user.grants = grants;
  return client.create(developerId, user);
}

export async function updateUser(
  client: UsersApiClient,
  developerId: string,
  userId: string,
  permissions?: DeveloperLevelPermission[],
  grants?: Grant[],
): Promise<User> {
  const updates: Partial<User> = {};
  const masks: string[] = [];

  if (permissions) {
    updates.developerAccountPermission = permissions;
    masks.push("developerAccountPermission");
  }
  if (grants) {
    updates.grants = grants;
    masks.push("grants");
  }

  const updateMask = masks.length > 0 ? masks.join(",") : undefined;
  return client.update(developerId, userId, updates, updateMask);
}

export async function removeUser(
  client: UsersApiClient,
  developerId: string,
  userId: string,
): Promise<void> {
  return client.delete(developerId, userId);
}

export function parseGrantArg(grantStr: string): Grant {
  const colonIdx = grantStr.indexOf(":");
  if (colonIdx === -1) {
    throw new GpcError(
      `Invalid grant format "${grantStr}". Expected <packageName>:<PERMISSION>[,<PERMISSION>...]`,
      "USER_INVALID_GRANT",
      2,
      "Use the format: com.example.app:VIEW_APP_INFORMATION,MANAGE_STORE_LISTING",
    );
  }
  const packageName = grantStr.slice(0, colonIdx);
  const perms = grantStr.slice(colonIdx + 1).split(",") as AppLevelPermission[];
  return { packageName, appLevelPermissions: perms };
}
