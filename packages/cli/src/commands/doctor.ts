import type { Command } from "commander";
import { loadConfig, getCacheDir, getConfigDir } from "@gpc-cli/config";
import { resolveAuth, AuthError } from "@gpc-cli/auth";
import { existsSync, accessSync, constants } from "node:fs";
import { lookup } from "node:dns/promises";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn" | "info";
  message: string;
  suggestion?: string;
}

const PASS = "\u2713";
const FAIL = "\u2717";
const WARN = "\u26A0";
const INFO = "-";

function icon(status: CheckResult["status"]): string {
  switch (status) {
    case "pass":
      return PASS;
    case "fail":
      return FAIL;
    case "warn":
      return WARN;
    case "info":
      return INFO;
  }
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Verify setup and connectivity")
    .option("--json", "Output results as JSON")
    .action(async (opts: { json?: boolean }) => {
      const results: CheckResult[] = [];
      const jsonMode = opts.json ?? false;

      // 1. Node.js version
      const nodeVersion = process.versions.node;
      const major = parseInt(nodeVersion.split(".")[0] ?? "0", 10);
      results.push(
        major >= 20
          ? { name: "node", status: "pass", message: `Node.js ${nodeVersion}` }
          : {
              name: "node",
              status: "fail",
              message: `Node.js ${nodeVersion} (requires >=20)`,
              suggestion: "Upgrade Node.js to v20 or later: https://nodejs.org",
            },
      );

      // 2. Config file
      let config;
      try {
        config = await loadConfig();
        results.push({ name: "config", status: "pass", message: "Configuration loaded" });
        if (config.app) {
          results.push({
            name: "default-app",
            status: "pass",
            message: `Default app: ${config.app}`,
          });
        } else {
          results.push({
            name: "default-app",
            status: "info",
            message: "No default app configured",
            suggestion: "Use --app flag or run: gpc config set app <package>",
          });
        }
      } catch {
        results.push({
          name: "config",
          status: "fail",
          message: "Configuration error",
          suggestion: "Check your .gpcrc.json or config file for syntax errors",
        });
      }

      // 3. Config directory permissions
      const configDir = getConfigDir();
      try {
        if (existsSync(configDir)) {
          accessSync(configDir, constants.R_OK | constants.W_OK);
          results.push({
            name: "config-dir",
            status: "pass",
            message: `Config directory: ${configDir}`,
          });
        } else {
          results.push({
            name: "config-dir",
            status: "info",
            message: `Config directory does not exist yet: ${configDir}`,
          });
        }
      } catch {
        results.push({
          name: "config-dir",
          status: "warn",
          message: `Config directory not writable: ${configDir}`,
          suggestion: `Fix permissions: chmod 755 ${configDir}`,
        });
      }

      // 4. Cache directory permissions
      const cacheDir = getCacheDir();
      try {
        if (existsSync(cacheDir)) {
          accessSync(cacheDir, constants.R_OK | constants.W_OK);
          results.push({
            name: "cache-dir",
            status: "pass",
            message: `Cache directory: ${cacheDir}`,
          });
        } else {
          results.push({
            name: "cache-dir",
            status: "info",
            message: `Cache directory does not exist yet: ${cacheDir}`,
          });
        }
      } catch {
        results.push({
          name: "cache-dir",
          status: "warn",
          message: `Cache directory not writable: ${cacheDir}`,
          suggestion: `Fix permissions: chmod 700 ${cacheDir}`,
        });
      }

      // 5. Proxy configuration
      const proxyUrl =
        process.env["HTTPS_PROXY"] ||
        process.env["https_proxy"] ||
        process.env["HTTP_PROXY"] ||
        process.env["http_proxy"];
      if (proxyUrl) {
        try {
          new URL(proxyUrl);
          results.push({
            name: "proxy",
            status: "pass",
            message: `Proxy configured: ${proxyUrl}`,
          });
        } catch {
          results.push({
            name: "proxy",
            status: "warn",
            message: `Invalid proxy URL: ${proxyUrl}`,
            suggestion: "Set HTTPS_PROXY to a valid URL (e.g., http://proxy.example.com:8080)",
          });
        }
      }

      // 6. CA certificate
      const caCert = process.env["GPC_CA_CERT"] || process.env["NODE_EXTRA_CA_CERTS"];
      if (caCert) {
        if (existsSync(caCert)) {
          results.push({
            name: "ca-cert",
            status: "pass",
            message: `CA certificate: ${caCert}`,
          });
        } else {
          results.push({
            name: "ca-cert",
            status: "warn",
            message: `CA certificate file not found: ${caCert}`,
            suggestion: "Check that GPC_CA_CERT points to an existing PEM file",
          });
        }
      }

      // 7. DNS resolution
      try {
        await lookup("androidpublisher.googleapis.com");
        results.push({
          name: "dns",
          status: "pass",
          message: "DNS resolution: androidpublisher.googleapis.com",
        });
      } catch {
        results.push({
          name: "dns",
          status: "fail",
          message: "Cannot resolve androidpublisher.googleapis.com",
          suggestion: "Check your DNS settings and network connection",
        });
      }

      // 8. Authentication + API connectivity
      try {
        const authConfig = config ?? (await loadConfig());
        const client = await resolveAuth({
          serviceAccountPath: authConfig.auth?.serviceAccount,
        });
        results.push({
          name: "auth",
          status: "pass",
          message: `Authenticated as ${client.getClientEmail()}`,
        });

        await client.getAccessToken();
        results.push({
          name: "api-connectivity",
          status: "pass",
          message: "API connectivity verified",
        });
      } catch (error) {
        if (error instanceof AuthError) {
          results.push({
            name: "auth",
            status: "fail",
            message: `Authentication: ${error.message}`,
            suggestion: error.suggestion,
          });
        } else {
          results.push({
            name: "api-connectivity",
            status: "fail",
            message: "API connectivity failed",
            suggestion: "Check your network connection and credentials",
          });
        }
      }

      // Output
      if (jsonMode) {
        const errors = results.filter((r) => r.status === "fail").length;
        const warnings = results.filter((r) => r.status === "warn").length;
        console.log(
          JSON.stringify(
            {
              success: errors === 0,
              errors,
              warnings,
              checks: results,
            },
            null,
            2,
          ),
        );
        if (errors > 0) process.exit(1);
        return;
      }

      console.log("GPC Doctor\n");
      for (const r of results) {
        console.log(`  ${icon(r.status)} ${r.message}`);
        if (r.suggestion && r.status !== "pass") {
          console.log(`    ${r.suggestion}`);
        }
      }

      const errors = results.filter((r) => r.status === "fail").length;
      const warnings = results.filter((r) => r.status === "warn").length;

      console.log("");
      if (errors > 0) {
        console.log("Some checks failed. Fix the issues above and run again.");
        process.exit(1);
      } else if (warnings > 0) {
        console.log("All checks passed with warnings.");
      } else {
        console.log("All checks passed!");
      }
    });
}
