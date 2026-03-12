export async function readJsonFile(filePath: string): Promise<unknown> {
  const { readFile } = await import("node:fs/promises");
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch (err) {
    console.error(
      `Error: Could not read JSON from ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(2);
  }
}
