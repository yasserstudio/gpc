// Named exports only. No default export.

import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";

export const manifestScanner: PreflightScanner = {
  name: "manifest",
  description: "Checks AndroidManifest.xml for target SDK, debug flags, and component declarations",
  requires: ["manifest"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const manifest = ctx.manifest!;
    const findings: PreflightFinding[] = [];
    const minTargetSdk = ctx.config.targetSdkMinimum;

    // targetSdkVersion check
    if (manifest.targetSdk < minTargetSdk) {
      findings.push({
        scanner: "manifest",
        ruleId: "targetSdk-below-minimum",
        severity: "critical",
        title: `targetSdkVersion ${manifest.targetSdk} is below the required ${minTargetSdk}`,
        message: `Google Play requires targetSdkVersion >= ${minTargetSdk} for new apps and updates. Your app targets API ${manifest.targetSdk}.`,
        suggestion: `Update targetSdkVersion to ${minTargetSdk} or higher in your build.gradle file.`,
        policyUrl: "https://developer.android.com/google/play/requirements/target-sdk",
      });
    }

    // debuggable check
    if (manifest.debuggable) {
      findings.push({
        scanner: "manifest",
        ruleId: "debuggable-true",
        severity: "critical",
        title: "App is marked as debuggable",
        message:
          'android:debuggable="true" is set in the manifest. Google Play rejects debuggable release builds.',
        suggestion:
          "Remove android:debuggable from your manifest or set it to false. Release builds should never be debuggable.",
      });
    }

    // testOnly check
    if (manifest.testOnly) {
      findings.push({
        scanner: "manifest",
        ruleId: "testOnly-true",
        severity: "critical",
        title: "App is marked as testOnly",
        message:
          'android:testOnly="true" is set in the manifest. Google Play rejects testOnly builds.',
        suggestion:
          "Remove android:testOnly from your manifest. This flag is only for development builds.",
      });
    }

    // versionCode check
    if (manifest.versionCode <= 0) {
      findings.push({
        scanner: "manifest",
        ruleId: "versionCode-invalid",
        severity: "error",
        title: "Invalid versionCode",
        message: `versionCode is ${manifest.versionCode}. It must be a positive integer.`,
        suggestion: "Set a valid versionCode in your build.gradle file.",
      });
    }

    // cleartext traffic
    if (manifest.usesCleartextTraffic && manifest.targetSdk >= 28) {
      findings.push({
        scanner: "manifest",
        ruleId: "cleartext-traffic",
        severity: "warning",
        title: "Cleartext HTTP traffic is allowed",
        message:
          'android:usesCleartextTraffic="true" allows unencrypted HTTP connections. This is a security risk.',
        suggestion:
          'Set android:usesCleartextTraffic="false" and use HTTPS. If specific domains need HTTP, use a network security config.',
        policyUrl: "https://developer.android.com/privacy-and-security/security-config",
      });
    }

    // missing android:exported on components with intent filters (required API 31+)
    if (manifest.targetSdk >= 31) {
      const allComponents = [
        ...manifest.activities,
        ...manifest.services,
        ...manifest.receivers,
        ...manifest.providers,
      ];

      for (const comp of allComponents) {
        if (comp.hasIntentFilter && comp.exported === undefined) {
          findings.push({
            scanner: "manifest",
            ruleId: "missing-exported",
            severity: "error",
            title: `Missing android:exported on ${comp.name}`,
            message: `Component "${comp.name}" has an intent-filter but no android:exported attribute. This is required for apps targeting API 31+.`,
            suggestion: `Add android:exported="true" or android:exported="false" to the <activity>, <service>, <receiver>, or <provider> declaration for "${comp.name}".`,
            policyUrl:
              "https://developer.android.com/about/versions/12/behavior-changes-12#exported",
          });
        }
      }
    }

    // foreground service type required (API 34+)
    if (manifest.targetSdk >= 34) {
      const hasFgsPerm = manifest.permissions.includes("android.permission.FOREGROUND_SERVICE");

      if (hasFgsPerm) {
        for (const service of manifest.services) {
          if (!service.foregroundServiceType) {
            findings.push({
              scanner: "manifest",
              ruleId: "foreground-service-type-missing",
              severity: "error",
              title: `Missing foregroundServiceType on ${service.name}`,
              message: `Service "${service.name}" does not declare android:foregroundServiceType. This is required for apps targeting API 34+.`,
              suggestion: `Add android:foregroundServiceType to the <service> declaration. Valid types: camera, connectedDevice, dataSync, health, location, mediaPlayback, mediaProcessing, mediaProjection, microphone, phoneCall, remoteMessaging, shortService, specialUse, systemExempted.`,
              policyUrl:
                "https://developer.android.com/about/versions/14/changes/fgs-types-required",
            });
          }
        }
      }
    }

    // April 2026 policy: Geofencing foreground service no longer approved
    const hasBackgroundLocation = manifest.permissions.includes(
      "android.permission.ACCESS_BACKGROUND_LOCATION",
    );
    if (hasBackgroundLocation) {
      for (const service of manifest.services) {
        const fst = service.foregroundServiceType;
        if (!fst) continue;
        const num = Number(fst);
        const hasLocation =
          fst.split("|").some((t) => t.trim() === "location") || (!isNaN(num) && (num & 0x8) !== 0);
        if (hasLocation) {
          findings.push({
            scanner: "manifest",
            ruleId: "geofencing-foreground-service",
            severity: "warning",
            title: `Possible geofencing via foreground service "${service.name}"`,
            message: `Service "${service.name}" uses foregroundServiceType "location" and the app declares ACCESS_BACKGROUND_LOCATION. Google Play no longer approves geofencing as a foreground service use case (April 2026 policy). Compliance deadline: May 15, 2026.`,
            suggestion:
              'If this service performs geofencing, migrate to WorkManager or AlarmManager. If this is legitimate background location tracking (navigation, fitness), suppress this rule via .preflightrc.json: "disabledRules": ["geofencing-foreground-service"].',
            policyUrl: "https://support.google.com/googleplay/android-developer/answer/16926792",
          });
        }
      }
    }

    // Exported components without permission protection
    const allComponents = [
      ...manifest.activities,
      ...manifest.services,
      ...manifest.receivers,
      ...manifest.providers,
    ];

    for (const comp of allComponents) {
      if (comp.exported !== true) continue;
      if (comp.permission) continue;

      // Skip main launcher activity (expected to be exported without permission)
      const isLauncher =
        comp.intentActions?.includes("android.intent.action.MAIN") &&
        comp.intentCategories?.includes("android.intent.category.LAUNCHER");
      if (isLauncher) continue;

      findings.push({
        scanner: "manifest",
        ruleId: "exported-no-permission",
        severity: "warning",
        title: `Exported component "${comp.name}" has no permission`,
        message: `"${comp.name}" is exported without an android:permission attribute. Any app on the device can access this component.`,
        suggestion: `Add android:permission to restrict access, or set android:exported="false" if external access is not needed.`,
        policyUrl: "https://developer.android.com/privacy-and-security/security-tips#components",
      });
    }

    // minSdkVersion advisory
    if (manifest.minSdk < 21) {
      findings.push({
        scanner: "manifest",
        ruleId: "minSdk-below-21",
        severity: "info",
        title: `minSdkVersion ${manifest.minSdk} is very low`,
        message: `minSdkVersion ${manifest.minSdk} means your app supports very old devices (pre-Lollipop). This limits split APK support and modern features.`,
        suggestion:
          "Consider raising minSdkVersion to 21 or higher to take advantage of modern Android features and better app size optimization.",
      });
    }

    return findings;
  },
};
