import type { PlayApiClient } from "@gpc-cli/api";

export interface AppInfo {
  packageName: string;
  title?: string;
  defaultLanguage?: string;
  contactEmail?: string;
}

export async function getAppInfo(
  client: PlayApiClient,
  packageName: string,
): Promise<AppInfo> {
  // Create an edit to read app details (Google Play requires an edit context)
  const edit = await client.edits.insert(packageName);
  try {
    const details = await client.details.get(packageName, edit.id);
    // Delete the edit since we're only reading
    await client.edits.delete(packageName, edit.id);
    return {
      packageName,
      title: details.title,
      defaultLanguage: details.defaultLanguage,
      contactEmail: details.contactEmail,
    };
  } catch (error) {
    // Clean up edit on failure
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}
