import type { Command } from "commander";
import {
  checkForUpdate,
  fetchChecksums,
  updateViaNpm,
  updateViaBrew,
  updateBinaryInPlace,
  getPlatformAsset,
  getCurrentBinaryPath,
  cleanupStaleUpdateFiles,
} from "../updater.js";
import { createSpinner } from "@gpc-cli/core";

export function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("Update gpc to the latest version")
    .option("--check", "Check for updates without installing (exits 0 always)")
    .option("--force", "Update even if already on the latest version")
    .action(async (opts: { check?: boolean; force?: boolean }, cmd) => {
      const parentOpts = (cmd.parent?.opts() ?? {}) as Record<string, unknown>;
      const jsonMode = !!(parentOpts["json"] || parentOpts["output"] === "json");
      const currentVersion = process.env["__GPC_VERSION"] ?? "0.0.0";

      // Dev build guard
      if (currentVersion === "0.0.0") {
        if (jsonMode) {
          console.log(
            JSON.stringify({
              success: false,
              reason: "Cannot update a development build",
              current: currentVersion,
            }),
          );
        } else {
          console.log("Cannot update a development build (version: 0.0.0).");
        }
        return;
      }

      const spinner = createSpinner("Checking for updates...");
      spinner.start();

      let result;
      try {
        result = await checkForUpdate(currentVersion);
      } catch (err) {
        spinner.fail("Failed to check for updates");
        throw err;
      }

      // --check mode: always exit 0, communicate via output
      if (opts.check) {
        spinner.stop();
        if (jsonMode) {
          console.log(
            JSON.stringify({
              current: result.current,
              latest: result.latest,
              updateAvailable: result.updateAvailable,
              installMethod: result.installMethod,
              releaseUrl: result.release.html_url,
            }),
          );
        } else if (result.updateAvailable) {
          console.log(`Update available: ${result.current} → ${result.latest}`);
          console.log(`Install method: ${result.installMethod}`);
          console.log(`Release: ${result.release.html_url}`);
          console.log(`\nRun: gpc update`);
        } else {
          console.log(`Already on latest version: v${result.current}`);
          console.log(`Install method: ${result.installMethod}`);
        }
        return;
      }

      // Already up to date
      if (!result.updateAvailable && !opts.force) {
        spinner.stop(`Already on latest version: v${result.current}`);
        if (jsonMode) {
          console.log(
            JSON.stringify({
              success: true,
              current: result.current,
              latest: result.latest,
              updated: false,
              installMethod: result.installMethod,
            }),
          );
        }
        return;
      }

      spinner.update(
        `Updating v${result.current} → v${result.latest} (${result.installMethod})...`,
      );

      switch (result.installMethod) {
        case "npm":
          spinner.stop();
          await updateViaNpm({ silent: jsonMode });
          break;

        case "homebrew":
          spinner.stop();
          await updateViaBrew({ silent: jsonMode });
          break;

        case "binary": {
          const assetName = getPlatformAsset();
          if (!assetName) {
            spinner.fail();
            throw Object.assign(
              new Error(`Unsupported platform: ${process.platform}/${process.arch}`),
              {
                code: "UPDATE_UNSUPPORTED_PLATFORM",
                exitCode: 2,
                suggestion: `Download manually: ${result.release.html_url}`,
              },
            );
          }

          const assetObj = result.release.assets.find((a) => a.name === assetName);
          if (!assetObj) {
            spinner.fail();
            throw Object.assign(
              new Error(`No binary found for ${assetName} in release ${result.latestTag}`),
              {
                code: "UPDATE_ASSET_NOT_FOUND",
                exitCode: 4,
                suggestion: `Check: ${result.release.html_url}`,
              },
            );
          }

          const sizeMB = (assetObj.size / (1024 * 1024)).toFixed(1);
          spinner.stop();

          const checksums = await fetchChecksums(result.release);
          const expectedHash = checksums.get(assetName) ?? "";
          const binaryPath = getCurrentBinaryPath();

          // Clean up stale files from previous update attempts
          cleanupStaleUpdateFiles(binaryPath);

          if (jsonMode) {
            await updateBinaryInPlace(assetObj.browser_download_url, expectedHash, binaryPath);
          } else {
            // Show live download progress on a single overwriting line
            const label = `Downloading ${assetName} (${sizeMB} MB)`;
            process.stdout.write(`${label}...\n`);
            let lastPct = -1;
            await updateBinaryInPlace(assetObj.browser_download_url, expectedHash, binaryPath, {
              onProgress(downloaded, total) {
                if (total <= 0) return;
                const pct = Math.min(100, Math.round((downloaded / total) * 100));
                if (pct === lastPct) return; // avoid redundant writes
                lastPct = pct;
                const dlMB = (downloaded / (1024 * 1024)).toFixed(1);
                process.stdout.write(
                  `\r${label}  ${dlMB} / ${sizeMB} MB  (${String(pct).padStart(3)}%)  `,
                );
              },
            });
            process.stdout.write("\n");
          }
          break;
        }

        case "unknown":
          spinner.fail();
          throw Object.assign(
            new Error("Could not detect install method"),
            {
              code: "UPDATE_UNKNOWN_METHOD",
              exitCode: 1,
              suggestion:
                "Update manually:\n" +
                "  npm:      npm install -g @gpc-cli/cli@latest\n" +
                "  Homebrew: brew upgrade yasserstudio/tap/gpc\n" +
                "  Binary:   https://github.com/yasserstudio/gpc/releases/latest",
            },
          );
      }

      if (jsonMode) {
        console.log(
          JSON.stringify({
            success: true,
            previous: result.current,
            current: result.latest,
            method: result.installMethod,
          }),
        );
      } else {
        console.log(`\n✔ Updated to v${result.latest}`);
      }
    });
}
