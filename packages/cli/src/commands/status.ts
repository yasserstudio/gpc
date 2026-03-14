import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { resolveAuth } from "@gpc-cli/auth";
import { createApiClient, createReportingClient } from "@gpc-cli/api";
import {
  getAppStatus,
  formatStatusTable,
  loadStatusCache,
  saveStatusCache,
  statusHasBreach,
  formatOutput,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Unified app health snapshot: releases, vitals, and reviews")
    .option("--days <n>", "Vitals window in days", (v) => parseInt(v, 10), 7)
    .option("--cached", "Use last fetched data, skip API calls")
    .option("--refresh", "Force live fetch, ignore cache TTL")
    .option("--ttl <seconds>", "Cache TTL in seconds", (v) => parseInt(v, 10), 3600)
    .action(async (opts: { days: number; cached?: boolean; refresh?: boolean; ttl: number }) => {
      const config = await loadConfig();
      const packageName = program.opts()["app"] || config.app;
      if (!packageName) {
        console.error(
          "Error: No package name. Use --app <package> or gpc config set app <package>",
        );
        process.exit(2);
      }

      const format = getOutputFormat(program, config);

      try {
        // --cached: read from cache, skip API
        if (opts.cached) {
          const cached = await loadStatusCache(packageName, opts.ttl);
          if (!cached) {
            console.error(
              "Error: No cached status found. Run without --cached to fetch live data.",
            );
            process.exit(1);
          }
          if (format === "json") {
            console.log(formatOutput(cached, format));
          } else {
            console.log(formatStatusTable(cached));
          }
          if (statusHasBreach(cached)) process.exit(6);
          return;
        }

        // Check cache unless --refresh
        if (!opts.refresh) {
          const cached = await loadStatusCache(packageName, opts.ttl);
          if (cached) {
            if (format === "json") {
              console.log(formatOutput(cached, format));
            } else {
              console.log(formatStatusTable(cached));
            }
            if (statusHasBreach(cached)) process.exit(6);
            return;
          }
        }

        // Live fetch
        const auth = await resolveAuth({ serviceAccountPath: config.auth?.serviceAccount });
        const client = createApiClient({ auth });
        const reporting = createReportingClient({ auth });

        const vitalThresholds = (config as Record<string, unknown>)["vitals"]
          ? (() => {
              const vitals = (config as Record<string, unknown>)["vitals"] as Record<
                string,
                unknown
              >;
              const t = vitals["thresholds"] as Record<string, unknown> | undefined;
              const toThreshold = (v: unknown): number | undefined => {
                if (v === undefined || v === null) return undefined;
                const n = Number(v);
                return isNaN(n) ? undefined : n;
              };
              return t
                ? {
                    crashRate: toThreshold(t["crashRate"]),
                    anrRate: toThreshold(t["anrRate"]),
                    slowStartRate: toThreshold(t["slowStartRate"]),
                    slowRenderingRate: toThreshold(t["slowRenderingRate"]),
                  }
                : undefined;
            })()
          : undefined;

        const status = await getAppStatus(client, reporting, packageName, {
          days: opts.days,
          vitalThresholds,
        });

        await saveStatusCache(packageName, status, opts.ttl);

        if (format === "json") {
          console.log(formatOutput(status, format));
        } else {
          console.log(formatStatusTable(status));
        }

        if (statusHasBreach(status)) process.exit(6);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(4);
      }
    });
}
