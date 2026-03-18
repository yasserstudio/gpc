import type { EnterpriseApiClient, CustomApp } from "@gpc-cli/api";

export { CustomApp };

export async function listEnterpriseApps(
  client: EnterpriseApiClient,
  organizationId: string,
): Promise<CustomApp[]> {
  const result = await client.apps.list(organizationId);
  return result.customApps ?? [];
}

export async function createEnterpriseApp(
  client: EnterpriseApiClient,
  organizationId: string,
  app: Partial<CustomApp>,
): Promise<CustomApp> {
  return client.apps.create(organizationId, app);
}
