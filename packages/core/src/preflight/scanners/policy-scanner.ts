// Named exports only. No default export.

import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";

/** Heuristic policy checks based on manifest permissions and features. */
export const policyScanner: PreflightScanner = {
  name: "policy",
  description:
    "Heuristic checks for Google Play policy compliance (families, financial, health, gambling)",
  requires: ["manifest"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const manifest = ctx.manifest!;
    const findings: PreflightFinding[] = [];
    const perms = new Set(manifest.permissions);

    // Families / COPPA indicators
    if (manifest.targetSdk >= 28) {
      const childrenIndicators = [
        perms.has("android.permission.READ_CONTACTS"),
        perms.has("android.permission.ACCESS_FINE_LOCATION"),
        perms.has("android.permission.RECORD_AUDIO"),
      ];
      const hasChildFeatures = manifest.features.some(
        (f) =>
          f.name.includes("kids") || f.name.includes("children") || f.name.includes("education"),
      );

      if (hasChildFeatures && childrenIndicators.some(Boolean)) {
        findings.push({
          scanner: "policy",
          ruleId: "policy-families-data-collection",
          severity: "warning",
          title: "Potential Families Policy concern",
          message:
            "App appears to target children (based on features) but requests sensitive permissions (location, contacts, or audio). Apps in the Families program have strict data collection limits.",
          suggestion:
            "Review the Families Policy requirements. Apps for children must minimize data collection and cannot use advertising ID.",
          policyUrl: "https://support.google.com/googleplay/android-developer/answer/9893335",
        });
      }
    }

    // Financial app indicators
    const financialPerms = [
      perms.has("android.permission.READ_SMS"),
      perms.has("android.permission.RECEIVE_SMS"),
      perms.has("android.permission.BIND_AUTOFILL_SERVICE"),
    ];
    if (financialPerms.filter(Boolean).length >= 2) {
      findings.push({
        scanner: "policy",
        ruleId: "policy-financial-app",
        severity: "warning",
        title: "Potential financial app detected",
        message:
          "App requests SMS + autofill permissions, common in financial apps. Financial apps must comply with additional disclosure and security requirements.",
        suggestion:
          "Ensure your app meets Google Play's financial services policy. Declare appropriate app category in Play Console.",
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/9876821",
      });
    }

    // Health app indicators
    if (
      perms.has("android.permission.BODY_SENSORS") ||
      perms.has("android.permission.ACTIVITY_RECOGNITION")
    ) {
      findings.push({
        scanner: "policy",
        ruleId: "policy-health-app",
        severity: "info",
        title: "Health/fitness app detected",
        message:
          "App requests body sensor or activity recognition permissions. Health apps must comply with health data policies.",
        suggestion:
          "Review Google Play's health app policy. Ensure accurate health claims and proper data handling disclosures.",
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/10787469",
      });
    }

    // UGC indicators
    const ugcIndicators = [
      perms.has("android.permission.CAMERA"),
      perms.has("android.permission.RECORD_AUDIO"),
      perms.has("android.permission.READ_MEDIA_IMAGES"),
    ];
    if (ugcIndicators.filter(Boolean).length >= 2) {
      findings.push({
        scanner: "policy",
        ruleId: "policy-ugc-content",
        severity: "info",
        title: "User-generated content indicators",
        message:
          "App requests camera + audio/media permissions, suggesting user-generated content. Apps with UGC must have content moderation.",
        suggestion:
          "Implement content moderation, reporting mechanisms, and content policies if your app allows user-generated content.",
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/9876937",
      });
    }

    // System alert window / overlay
    if (perms.has("android.permission.SYSTEM_ALERT_WINDOW")) {
      findings.push({
        scanner: "policy",
        ruleId: "policy-overlay",
        severity: "warning",
        title: "SYSTEM_ALERT_WINDOW (overlay) permission",
        message:
          "App requests overlay permission. This is restricted and must be justified. Misuse can lead to rejection.",
        suggestion:
          "Only use SYSTEM_ALERT_WINDOW if overlay display is core to your app's functionality.",
      });
    }

    return findings;
  },
};
