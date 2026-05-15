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

      const allowedEnvKeys = new Set([
        "PATH", "HOME", "USER", "SHELL", "TMPDIR", "LANG", "LC_ALL",
        "NODE_ENV", "NODE_PATH", "NODE_OPTIONS", "NODE_EXTRA_CA_CERTS",
        "npm_config_registry", "npm_config_cache",
        "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "https_proxy", "http_proxy", "no_proxy",
      ]);
      const safeEnv: Record<string, string> = {};
      for (const [k, v] of Object.entries(process.env)) {
        if (v !== undefined && allowedEnvKeys.has(k)) {
          safeEnv[k] = v;
        }
      }

      try {
        execFileSync("npx", args, {
          stdio: "inherit",
          env: safeEnv,
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
