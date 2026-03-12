import type {
  PlayApiClient,
  AppRecoveryAction,
  AppRecoveryTargeting,
  CreateAppRecoveryActionRequest,
} from "@gpc-cli/api";

export async function listRecoveryActions(
  client: PlayApiClient,
  packageName: string,
  versionCode?: number,
): Promise<AppRecoveryAction[]> {
  return client.appRecovery.list(packageName, versionCode);
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

export async function createRecoveryAction(
  client: PlayApiClient,
  packageName: string,
  request: CreateAppRecoveryActionRequest,
): Promise<AppRecoveryAction> {
  return client.appRecovery.create(packageName, request);
}

export async function addRecoveryTargeting(
  client: PlayApiClient,
  packageName: string,
  actionId: string,
  targeting: AppRecoveryTargeting,
): Promise<AppRecoveryAction> {
  return client.appRecovery.addTargeting(packageName, actionId, targeting);
}
