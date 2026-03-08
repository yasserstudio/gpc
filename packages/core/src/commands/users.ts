import type { UsersApiClient, User, DeveloperPermission, Grant } from "@gpc/api";

export const PERMISSION_PROPAGATION_WARNING =
  "Note: Permission changes may take up to 48 hours to propagate.";

export async function listUsers(
  client: UsersApiClient,
  developerId: string,
  options?: { pageToken?: string; pageSize?: number },
): Promise<User[]> {
  const response = await client.list(developerId, options);
  return response.users || [];
}

export async function getUser(
  client: UsersApiClient,
  developerId: string,
  userId: string,
): Promise<User> {
  return client.get(developerId, userId);
}

export async function inviteUser(
  client: UsersApiClient,
  developerId: string,
  email: string,
  permissions?: DeveloperPermission[],
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
  permissions?: DeveloperPermission[],
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
    throw new Error(
      `Invalid grant format "${grantStr}". Expected <packageName>:<PERMISSION>[,<PERMISSION>...]`,
    );
  }
  const packageName = grantStr.slice(0, colonIdx);
  const perms = grantStr.slice(colonIdx + 1).split(",") as DeveloperPermission[];
  return { packageName, appLevelPermissions: perms };
}
