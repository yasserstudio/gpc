import type { PlayApiClient, DataSafetyRequest, DataSafetyResponse } from "@gpc-cli/api";
import { readFile } from "node:fs/promises";

export async function updateDataSafety(
  client: PlayApiClient,
  packageName: string,
  data: DataSafetyRequest,
): Promise<DataSafetyResponse> {
  return client.dataSafety.update(packageName, data);
}

export async function importDataSafety(
  client: PlayApiClient,
  packageName: string,
  filePath: string,
): Promise<DataSafetyResponse> {
  const csvContent = await readFile(filePath, "utf-8");
  return updateDataSafety(client, packageName, { safetyLabels: csvContent });
}
