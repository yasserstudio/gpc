import type { PlayApiClient, AppRecoveryAction } from "@gpc-cli/api";

export async function listRecoveryActions(
  client: PlayApiClient,
  packageName: string,
): Promise<AppRecoveryAction[]> {
  return client.appRecovery.list(packageName);
}

export async function cancelRecoveryAction(
  client: PlayApiClient,
  packageName: string,
  recoveryId: string,
): Promise<void> {
  return client.appRecovery.cancel(packageName, recoveryId);
}

export async function deployRecoveryAction(
  client: PlayApiClient,
  packageName: string,
  recoveryId: string,
): Promise<void> {
  return client.appRecovery.deploy(packageName, recoveryId);
}
