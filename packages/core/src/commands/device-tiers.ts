import type { PlayApiClient, DeviceTierConfig } from "@gpc-cli/api";
import { GpcError } from "../errors.js";

export async function listDeviceTiers(
  client: PlayApiClient,
  packageName: string,
): Promise<DeviceTierConfig[]> {
  if (!packageName) {
    throw new GpcError(
      "Package name is required",
      "MISSING_PACKAGE_NAME",
      2,
      "Provide a package name with --app or set it in config.",
    );
  }
  return client.deviceTiers.list(packageName);
}

export async function getDeviceTier(
  client: PlayApiClient,
  packageName: string,
  configId: string,
): Promise<DeviceTierConfig> {
  if (!packageName) {
    throw new GpcError(
      "Package name is required",
      "MISSING_PACKAGE_NAME",
      2,
      "Provide a package name with --app or set it in config.",
    );
  }
  if (!configId) {
    throw new GpcError(
      "Config ID is required",
      "MISSING_CONFIG_ID",
      2,
      "Provide a device tier config ID.",
    );
  }
  return client.deviceTiers.get(packageName, configId);
}

export async function createDeviceTier(
  client: PlayApiClient,
  packageName: string,
  config: DeviceTierConfig,
): Promise<DeviceTierConfig> {
  if (!packageName) {
    throw new GpcError(
      "Package name is required",
      "MISSING_PACKAGE_NAME",
      2,
      "Provide a package name with --app or set it in config.",
    );
  }
  if (!config || !config.deviceGroups || config.deviceGroups.length === 0) {
    throw new GpcError(
      "Device tier config must include at least one device group",
      "INVALID_DEVICE_TIER_CONFIG",
      2,
      "Provide a valid config with deviceGroups.",
    );
  }
  return client.deviceTiers.create(packageName, config);
}
