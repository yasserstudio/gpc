export async function readJsonFile(filePath: string): Promise<unknown> {
  const { readFile } = await import("node:fs/promises");
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch (err) {
    throw Object.assign(
      new Error(`Could not read JSON from ${filePath}: ${err instanceof Error ? err.message : String(err)}`),
      {
        code: "INVALID_JSON_FILE",
        exitCode: 2,
        suggestion: `Check that ${filePath} exists and contains valid JSON`,
      },
    );
  }
}
