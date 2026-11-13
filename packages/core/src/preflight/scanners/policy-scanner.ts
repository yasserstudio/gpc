// Named exports only. No default export.

import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";
import { billingLibraryFindings } from "../billing-library.js";

/** Heuristic policy checks based on manifest permissions and features. */
export const policyScanner: PreflightScanner = {
  name: "policy",
  description:
    "Heuristic checks for Google Play policy compliance (families, financial, health, gambling)",
  requires: ["manifest"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const manifest = ctx.manifest;
    if (!manifest) {
      throw new Error('The "policy" scanner requires manifest in the preflight context');
    }
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

    // Developer verification enforcement awareness. Advisory only: nothing in the
    // AAB determines whether an app is affected — it depends on the developer
    // account and the markets the app is distributed in. Info severity so it never
    // fails a preflight run; it is a time-relevant compliance reminder.
    findings.push({
      scanner: "policy",
      ruleId: "policy-developer-verification",
      severity: "info",
      title: "Developer verification enforcement (Sep 30, 2026)",
      message:
        "Google begins enforcing developer verification on September 30, 2026, first in Brazil, Indonesia, Singapore, and Thailand. Apps distributed in those markets need a verified developer identity and a registered package name. Separately, as of July 15, 2026, all apps on Google Play must be registered in Play Console to meet these requirements, and unregistered apps risk removal from Google Play. Apps using Play App Signing are auto-registered.",
      suggestion:
        "Run `gpc verify checklist` to review readiness, including registration of every app on your account. This is a distribution-market and account-registration reminder, not an AAB/APK defect.",
      policyUrl: "https://developer.android.com/developer-verification",
    });

    // Play Console "App content" declaration gate for foreground services.
    // Nothing in the AAB can confirm whether the declaration is complete — it
    // lives in the Console, and the API only surfaces it at upload time as a
    // bare 403 whose text reads like a credentials failure (GH #101). Advisory
    // at info severity so it never fails a scan; the point is to surface the
    // requirement before a large upload rather than after it is rejected.
    const foregroundServicePerms = manifest.permissions
      .filter((p) => p.startsWith("android.permission.FOREGROUND_SERVICE"))
      .sort();
    if (foregroundServicePerms.length > 0) {
      const shortNames = foregroundServicePerms.map((p) => p.replace("android.permission.", ""));
      findings.push({
        scanner: "policy",
        ruleId: "policy-app-content-declaration",
        severity: "info",
        title: "Foreground service permissions require an App content declaration",
        message: `This app requests ${shortNames.join(", ")}. Google Play requires a completed "Foreground service permissions" declaration under App content before it will accept a release. The declaration is stored in Play Console, so it cannot be verified from the AAB.`,
        suggestion:
          "Complete Play Console → your app → Policy → App content → Foreground service permissions before releasing. If it is incomplete, the Play API rejects the upload with a 403 whose wording resembles a service account permission error; GPC reports that as API_DECLARATION_REQUIRED.",
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/13392821",
      });
    }

    // Play Console declaration for the Android 17 local network permission (policy
    // announced Oct 29, 2026, effective Aug 25, 2027). Applies only to targetSdk 37+:
    // lower targets keep implicit local network access through INTERNET. Like the
    // foreground-service advisory above, the declaration lives in Play Console, so
    // this is info only and never fails a run.
    if (perms.has("android.permission.ACCESS_LOCAL_NETWORK") && manifest.targetSdk >= 37) {
      findings.push({
        scanner: "policy",
        ruleId: "policy-local-network-declaration",
        severity: "info",
        title: "ACCESS_LOCAL_NETWORK requires a Play Console declaration",
        message: `This app targets API ${manifest.targetSdk} and requests ACCESS_LOCAL_NETWORK. From August 25, 2027, Google Play requires apps targeting Android 17 (API 37) or higher to submit a Play Console declaration to use this permission, and allows it only for core functionality that device pickers cannot provide. The declaration is stored in Play Console, so it cannot be verified from the AAB.`,
        suggestion:
          "If a device picker (for example NsdManager discovery through the system picker) covers your use case, use it and drop ACCESS_LOCAL_NETWORK. Otherwise submit the local network declaration in Play Console, explaining why device pickers are not sufficient.",
        policyUrl:
          "https://support.google.com/googleplay/android-developer/answer/16935362#local_network_permission",
      });
    }

    // Google Play Billing Library version against Google's deadlines, rated on
    // the scan date (docs/adr/0001).
    findings.push(...billingLibraryFindings(manifest, new Date()));

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
