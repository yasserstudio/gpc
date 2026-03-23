// Named exports only. No default export.

import { readFile } from "node:fs/promises";
import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";
import { collectSourceFiles } from "../scan-files.js";

interface TrackingSdk {
  name: string;
  pattern: RegExp;
}

const TRACKING_SDKS: TrackingSdk[] = [
  {
    name: "Facebook SDK",
    pattern: /(?:com\.facebook\.sdk|com\.facebook\.android|FacebookSdk\.sdkInitialize)/i,
  },
  { name: "Adjust SDK", pattern: /(?:com\.adjust\.sdk|AdjustConfig|AdjustEvent)/i },
  {
    name: "AppsFlyer SDK",
    pattern: /(?:com\.appsflyer|AppsFlyerLib|AppsFlyerConversionListener)/i,
  },
  { name: "Amplitude SDK", pattern: /(?:com\.amplitude|AmplitudeClient|@amplitude\/analytics)/i },
  { name: "Mixpanel SDK", pattern: /(?:com\.mixpanel|MixpanelAPI|@mixpanel)/i },
  { name: "Branch SDK", pattern: /(?:io\.branch\.referral|Branch\.getInstance)/i },
  { name: "CleverTap SDK", pattern: /(?:com\.clevertap|CleverTapAPI)/i },
  { name: "Singular SDK", pattern: /(?:com\.singular\.sdk|SingularConfig)/i },
];

const SCAN_EXTENSIONS = new Set([
  ".kt",
  ".java",
  ".xml",
  ".gradle",
  ".ts",
  ".js",
  ".tsx",
  ".jsx",
  ".json",
]);

export const privacyScanner: PreflightScanner = {
  name: "privacy",
  description: "Detects tracking SDKs and data collection patterns for Data Safety compliance",
  requires: ["sourceDir"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const dir = ctx.sourceDir!;
    const findings: PreflightFinding[] = [];
    const detectedSdks = new Set<string>();
    const files = await collectSourceFiles(dir, SCAN_EXTENSIONS);

    for (const filePath of files) {
      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch {
        continue;
      }

      // Check for tracking SDKs
      for (const sdk of TRACKING_SDKS) {
        if (detectedSdks.has(sdk.name)) continue;

        if (sdk.pattern.test(content)) {
          detectedSdks.add(sdk.name);
          const relativePath = filePath.startsWith(dir) ? filePath.slice(dir.length + 1) : filePath;

          findings.push({
            scanner: "privacy",
            ruleId: `tracking-${sdk.name.toLowerCase().replace(/\s+/g, "-")}`,
            severity: "warning",
            title: `${sdk.name} detected`,
            message: `${sdk.name} found in ${relativePath}. This SDK typically collects analytics or attribution data that must be declared in your Data Safety form.`,
            suggestion:
              "Ensure your Data Safety declaration accurately lists all data types collected by this SDK.",
            policyUrl: "https://support.google.com/googleplay/android-developer/answer/10787469",
          });
        }
      }

      // Check for ADVERTISING_ID
      if (
        content.includes("AD_ID") ||
        content.includes("ADVERTISING_ID") ||
        content.includes("AdvertisingIdClient")
      ) {
        if (!detectedSdks.has("_ad_id")) {
          detectedSdks.add("_ad_id");
          findings.push({
            scanner: "privacy",
            ruleId: "advertising-id-usage",
            severity: "warning",
            title: "Advertising ID usage detected",
            message:
              "Your app appears to access the Advertising ID. This must be declared in your Data Safety form under 'Device or other IDs'.",
            suggestion:
              "Declare Advertising ID collection in Play Console > Data safety. If your app targets children, Advertising ID usage is restricted.",
            policyUrl: "https://support.google.com/googleplay/android-developer/answer/11043825",
          });
        }
      }
    }

    // Cross-reference with manifest permissions if available
    if (ctx.manifest) {
      const dataPermissions: Array<{ perm: string; dataType: string }> = [
        { perm: "android.permission.ACCESS_FINE_LOCATION", dataType: "precise location" },
        { perm: "android.permission.ACCESS_COARSE_LOCATION", dataType: "approximate location" },
        { perm: "android.permission.READ_CONTACTS", dataType: "contacts" },
        { perm: "android.permission.CAMERA", dataType: "photos/videos" },
        { perm: "android.permission.RECORD_AUDIO", dataType: "audio" },
        { perm: "android.permission.READ_CALENDAR", dataType: "calendar" },
        { perm: "android.permission.BODY_SENSORS", dataType: "health/fitness data" },
        { perm: "android.permission.READ_PHONE_STATE", dataType: "phone state/device ID" },
      ];

      const collectedTypes: string[] = [];
      for (const { perm, dataType } of dataPermissions) {
        if (ctx.manifest.permissions.includes(perm)) {
          collectedTypes.push(dataType);
        }
      }

      if (collectedTypes.length > 0 && detectedSdks.size > 0) {
        findings.push({
          scanner: "privacy",
          ruleId: "data-collection-cross-reference",
          severity: "info",
          title: "Data collection cross-reference",
          message: `Your app requests permissions for: ${collectedTypes.join(", ")}. Combined with ${detectedSdks.size} tracking SDK(s), ensure your Data Safety form declares all collected data types.`,
          suggestion:
            "Review your Data Safety form at Play Console > Policy > App content > Data safety.",
          policyUrl: "https://support.google.com/googleplay/android-developer/answer/10787469",
        });
      }
    }

    return findings;
  },
};
