import type { Command } from "commander";
import { execFileSync } from "node:child_process";

const GPC_SKILLS_REPO = "yasserstudio/gpc-skills";

const BANNER = `
 ██████╗ ██████╗  ██████╗
██╔════╝ ██╔══██╗██╔════╝    Agent Skills Installer
██║  ███╗██████╔╝██║         16 skills for AI-assisted
██║   ██║██╔═══╝ ██║         Google Play workflows
╚██████╔╝██║     ╚██████╗
 ╚═════╝ ╚═╝      ╚═════╝
`;

export function registerInstallSkillsCommand(program: Command): void {
  program
    .command("install-skills")
    .description("Install GPC agent skills for AI-assisted workflows")
    .option("-l, --list", "List available skills without installing")
    .option("-y, --yes", "Skip confirmation prompts")
    .option("-g, --global", "Install skills globally (user-level)")
    .option("--all", "Install all skills to all agents without prompts")
    .option("--repo <repo>", "Custom skills repository", GPC_SKILLS_REPO)
    .action((opts: Record<string, unknown>) => {
      console.log(BANNER);

      const repo = (opts["repo"] as string) || GPC_SKILLS_REPO;
      const args = ["skills", "add", repo];

      if (opts["list"]) {
        args.push("--list");
      }
      if (opts["yes"]) {
        args.push("--yes");
      }
      if (opts["global"]) {
        args.push("--global");
      }
      if (opts["all"]) {
        args.push("--all");
      }

      try {
        execFileSync("npx", args, {
          stdio: "inherit",
          env: { ...process.env },
        });
      } catch (err: unknown) {
        const exitCode = (err as { status?: number }).status ?? 1;
        if (exitCode !== 0) {
          const error = new Error("Skills installation failed.");
          Object.assign(error, {
            code: "INSTALL_FAILED",
            exitCode,
            suggestion: `Make sure npx is available and you have internet access.\nYou can also install manually: npx skills add ${repo}`,
          });
          throw error;
        }
      }
    });
}
