import type { UsersApiClient } from "@gpc-cli/api";
import type { Grant } from "@gpc-cli/api";

export async function listGrants(
  client: UsersApiClient,
  developerId: string,
  email: string,
): Promise<Grant[]> {
  const result = await client.grants.list(developerId, email);
  return result.grants || [];
}

export async function createGrant(
  client: UsersApiClient,
  developerId: string,
  email: string,
  packageName: string,
  permissions: string[],
): Promise<Grant> {
  return client.grants.create(developerId, email, {
    packageName,
    appLevelPermissions: permissions as Grant["appLevelPermissions"],
  });
}

export async function updateGrant(
  client: UsersApiClient,
  developerId: string,
  email: string,
  packageName: string,
  permissions: string[],
): Promise<Grant> {
  return client.grants.patch(developerId, email, packageName, {
    appLevelPermissions: permissions as Grant["appLevelPermissions"],
  }, "appLevelPermissions");
}

export async function deleteGrant(
  client: UsersApiClient,
  developerId: string,
  email: string,
  packageName: string,
): Promise<void> {
  return client.grants.delete(developerId, email, packageName);
}
