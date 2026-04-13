import type { PlayApiClient, DataSafety } from "@gpc-cli/api";
import { readFile } from "node:fs/promises";
import { GpcError } from "../errors.js";

export async function updateDataSafety(
  client: PlayApiClient,
  packageName: string,
  data: DataSafety,
): Promise<DataSafety> {
  return client.dataSafety.update(packageName, data);
}

export async function importDataSafety(
  client: PlayApiClient,
  packageName: string,
  filePath: string,
): Promise<DataSafety> {
  const content = await readFile(filePath, "utf-8");
  let data: DataSafety;
  try {
    data = JSON.parse(content) as DataSafety;
  } catch {
    throw new GpcError(
      `Failed to parse data safety JSON from "${filePath}"`,
      "INVALID_JSON",
      1,
      "Ensure the file contains valid JSON matching the data safety schema.",
    );
  }
  return updateDataSafety(client, packageName, data);
}
