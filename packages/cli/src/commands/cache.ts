import type { Command } from "commander";
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { getCacheDir } from "@gpc-cli/config";

const FILE_TYPES: Record<string, (name: string) => boolean> = {
  status: (name) => name.startsWith("status-") && name.endsWith(".json"),
  token: (name) => name === "token-cache.json",
  update: (name) => name === "update-check.json",
};

async function getCacheFiles(cacheDir: string): Promise<{ name: string; path: string; size: number; mtime: Date }[]> {
  let entries: string[];
  try {
    entries = await readdir(cacheDir);
  } catch {
    return [];
  }

  const files: { name: string; path: string; size: number; mtime: Date }[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const filePath = join(cacheDir, entry);
    try {
      const info = await stat(filePath);
      if (info.isFile()) {
        files.push({ name: entry, path: filePath, size: info.size, mtime: info.mtime });
      }
    } catch { /* ignore */ }
  }
  return files;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileType(name: string): string {
  for (const [type, matcher] of Object.entries(FILE_TYPES)) {
    if (matcher(name)) return type;
  }
  return "other";
}

export function registerCacheCommand(program: Command): void {
  const cache = program.command("cache").description("Manage local cache files");

  cache
    .command("info")
    .description("Show cache directory and total size")
    .action(async () => {
      const cacheDir = getCacheDir();
      const files = await getCacheFiles(cacheDir);
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      console.log(`Cache directory: ${cacheDir}`);
      console.log(`Files: ${files.length}`);
      console.log(`Total size: ${formatBytes(totalSize)}`);
    });

  cache
    .command("list")
    .description("List all cache files with size and age")
    .action(async () => {
      const cacheDir = getCacheDir();
      const files = await getCacheFiles(cacheDir);
      if (files.length === 0) {
        console.log("No cache files found.");
        return;
      }
      const now = Date.now();
      for (const f of files) {
        const ageMs = now - f.mtime.getTime();
        const ageMins = Math.floor(ageMs / 60000);
        const ageStr = ageMins < 60
          ? `${ageMins}m ago`
          : ageMins < 1440
            ? `${Math.floor(ageMins / 60)}h ago`
            : `${Math.floor(ageMins / 1440)}d ago`;
        const type = fileType(f.name);
        console.log(`  ${f.name}  [${type}]  ${formatBytes(f.size)}  ${ageStr}`);
      }
    });

  cache
    .command("clear")
    .description("Remove cache files")
    .option("--force", "Skip confirmation prompt")
    .option("--type <type>", "Remove only files of this type (status|token|update)")
    .action(async (opts) => {
      const cacheDir = getCacheDir();
      const allFiles = await getCacheFiles(cacheDir);

      let toDelete = allFiles;
      if (opts.type) {
        const matcher = FILE_TYPES[opts.type];
        if (!matcher) {
          console.error(`Error: Unknown cache type "${opts.type}". Valid types: ${Object.keys(FILE_TYPES).join(", ")}`);
          process.exit(2);
        }
        toDelete = allFiles.filter((f) => matcher(f.name));
      }

      if (toDelete.length === 0) {
        console.log("No cache files to remove.");
        return;
      }

      if (!opts.force) {
        console.log(`About to remove ${toDelete.length} file(s) from ${cacheDir}:`);
        for (const f of toDelete) {
          console.log(`  ${f.name}  (${formatBytes(f.size)})`);
        }
        const { createInterface } = await import("node:readline");
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => rl.question("Proceed? [y/N] ", resolve));
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Aborted.");
          return;
        }
      }

      let removed = 0;
      for (const f of toDelete) {
        try {
          await unlink(f.path);
          removed++;
        } catch { /* ignore */ }
      }
      console.log(`Removed ${removed} file(s).`);
    });
}
