import type { Command } from "commander";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { getOutputFormat } from "../format.js";
import { formatOutput } from "@gpc-cli/core";
import { green, dim } from "../colors.js";

interface InstalledSkill {
  name: string;
  version: string;
  path: string;
}

const GPC_SKILLS_REPO = "yasserstudio/gpc-skills";

export async function discoverInstalledSkills(overrideDir?: string): Promise<InstalledSkill[]> {
  const home = homedir();
  const dirs = overrideDir
    ? [overrideDir]
    : [
        resolve(process.cwd(), ".agents/skills"),
        join(home, ".claude/skills"),
        join(home, ".cursor/skills"),
        join(home, ".gemini/skills"),
      ];

  const skills: InstalledSkill[] = [];
  const seen = new Set<string>();

  for (const dir of dirs) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.startsWith("gpc-") || seen.has(entry)) continue;
      const skillPath = join(dir, entry);
      const skillFile = join(skillPath, "SKILL.md");
      try {
        const content = await readFile(skillFile, "utf-8");
        const versionMatch = content.match(/^\s*version:\s*(.+)/m);
        const version = versionMatch?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "unknown";
        skills.push({ name: entry, version, path: skillPath });
        seen.add(entry);
      } catch {
        // SKILL.md not readable, skip
      }
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchLatestPackVersion(
  repo: string = GPC_SKILLS_REPO,
): Promise<string | null> {
  try {
    const resp = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { tag_name?: string };
    return data.tag_name?.replace(/^v/, "") ?? null;
  } catch {
    return null;
  }
}

export function registerSkillsCommand(program: Command): void {
  const skills = program.command("skills").description("Manage GPC agent skills");

  skills
    .command("check")
    .description("Check installed GPC skills for updates")
    .option("--dir <path>", "Override skill scan directory")
    .option("--repo <owner/name>", "Custom skills repository", GPC_SKILLS_REPO)
    .action(async (opts: { dir?: string; repo?: string }) => {
      const format = getOutputFormat(program, {});
      const installed = await discoverInstalledSkills(opts.dir);
      const latest = await fetchLatestPackVersion(opts.repo);

      if (format === "json") {
        console.log(
          formatOutput(
            {
              latestPackVersion: latest,
              skills: installed.map((s) => ({
                name: s.name,
                version: s.version,
                path: s.path,
              })),
            },
            "json",
          ),
        );
        return;
      }

      if (installed.length === 0) {
        console.log("No GPC skills found.");
        console.log(`\nInstall with: npx skills add ${opts.repo ?? GPC_SKILLS_REPO}`);
        return;
      }

      console.log(`GPC Skills${latest ? `  (pack ${latest} on GitHub)` : ""}\n`);

      const nameWidth = Math.max(...installed.map((s) => s.name.length), 4);
      const header = `${"SKILL".padEnd(nameWidth)}  VERSION     PATH`;
      console.log(header);
      console.log("─".repeat(header.length));

      for (const skill of installed) {
        const name = skill.name.padEnd(nameWidth);
        const version = skill.version.padEnd(11);
        console.log(`${name}  ${version} ${dim(skill.path)}`);
      }

      console.log(
        `\n  ${green("✓")} ${installed.length} skill${installed.length !== 1 ? "s" : ""} installed`,
      );

      if (latest) {
        console.log(`\n  Update all: npx skills add ${opts.repo ?? GPC_SKILLS_REPO}`);
      }
    });
}
