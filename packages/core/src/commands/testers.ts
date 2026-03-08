import type { PlayApiClient, Testers } from "@gpc/api";
import { readFile } from "node:fs/promises";

export async function listTesters(
  client: PlayApiClient,
  packageName: string,
  track: string,
): Promise<Testers> {
  const edit = await client.edits.insert(packageName);
  try {
    const testers = await client.testers.get(packageName, edit.id, track);
    return testers;
  } finally {
    await client.edits.delete(packageName, edit.id);
  }
}

export async function addTesters(
  client: PlayApiClient,
  packageName: string,
  track: string,
  groupEmails: string[],
): Promise<Testers> {
  const edit = await client.edits.insert(packageName);
  try {
    const current = await client.testers.get(packageName, edit.id, track);
    const existing = new Set(current.googleGroups || []);
    for (const email of groupEmails) {
      existing.add(email.trim());
    }
    const updated = await client.testers.update(packageName, edit.id, track, {
      googleGroups: [...existing],
    });
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
    return updated;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function removeTesters(
  client: PlayApiClient,
  packageName: string,
  track: string,
  groupEmails: string[],
): Promise<Testers> {
  const edit = await client.edits.insert(packageName);
  try {
    const current = await client.testers.get(packageName, edit.id, track);
    const toRemove = new Set(groupEmails.map((e) => e.trim()));
    const filtered = (current.googleGroups || []).filter(
      (g) => !toRemove.has(g),
    );
    const updated = await client.testers.update(packageName, edit.id, track, {
      googleGroups: filtered,
    });
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
    return updated;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function importTestersFromCsv(
  client: PlayApiClient,
  packageName: string,
  track: string,
  csvPath: string,
): Promise<{ added: number; testers: Testers }> {
  const content = await readFile(csvPath, "utf-8");
  const emails = content
    .split(/[,\n\r]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes("@"));

  if (emails.length === 0) {
    throw new Error(`No valid email addresses found in ${csvPath}.`);
  }

  const testers = await addTesters(client, packageName, track, emails);
  return { added: emails.length, testers };
}
