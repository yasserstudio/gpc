import type { PlayApiClient, DataSafety } from "@gpc-cli/api";
import { readFile, writeFile } from "node:fs/promises";
import { GpcError } from "../errors.js";

export async function getDataSafety(
  client: PlayApiClient,
  packageName: string,
): Promise<DataSafety> {
  const edit = await client.edits.insert(packageName);
  try {
    const dataSafety = await client.dataSafety.get(packageName, edit.id);
    await client.edits.delete(packageName, edit.id);
    return dataSafety;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function updateDataSafety(
  client: PlayApiClient,
  packageName: string,
  data: DataSafety,
): Promise<DataSafety> {
  const edit = await client.edits.insert(packageName);
  try {
    const result = await client.dataSafety.update(packageName, edit.id, data);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
    return result;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function exportDataSafety(
  client: PlayApiClient,
  packageName: string,
  outputPath: string,
): Promise<DataSafety> {
  const dataSafety = await getDataSafety(client, packageName);
  await writeFile(outputPath, JSON.stringify(dataSafety, null, 2) + "\n", "utf-8");
  return dataSafety;
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
