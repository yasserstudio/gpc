// Named exports only. No default export.

import type { PreflightScanner, PreflightContext, PreflightFinding, FindingSeverity } from "../types.js";

interface RestrictedPermission {
  permission: string;
  severity: FindingSeverity;
  title: string;
  message: string;
  suggestion: string;
  policyUrl: string;
}

const RESTRICTED_PERMISSIONS: RestrictedPermission[] = [
  // SMS permissions — only for default SMS handler
  {
    permission: "android.permission.READ_SMS",
    severity: "critical",
    title: "READ_SMS requires declaration form",
    message: "READ_SMS is restricted to default SMS/phone/assistant handler apps. Google Play requires a Permissions Declaration Form and may reject apps using this permission without approval.",
    suggestion: "Remove READ_SMS unless your app is a default SMS handler. Use the SMS Retriever API or one-tap SMS consent for OTP verification.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820",
  },
  {
    permission: "android.permission.SEND_SMS",
    severity: "critical",
    title: "SEND_SMS requires declaration form",
    message: "SEND_SMS is restricted to default SMS handler apps.",
    suggestion: "Remove SEND_SMS unless your app is a default SMS handler.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820",
  },
  {
    permission: "android.permission.RECEIVE_SMS",
    severity: "critical",
    title: "RECEIVE_SMS requires declaration form",
    message: "RECEIVE_SMS is restricted to default SMS handler apps.",
    suggestion: "Remove RECEIVE_SMS. Use the SMS Retriever API for OTP verification instead.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820",
  },
  {
    permission: "android.permission.RECEIVE_MMS",
    severity: "critical",
    title: "RECEIVE_MMS requires declaration form",
    message: "RECEIVE_MMS is restricted to default SMS handler apps.",
    suggestion: "Remove RECEIVE_MMS unless your app is a default SMS handler.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820",
  },
  {
    permission: "android.permission.RECEIVE_WAP_PUSH",
    severity: "critical",
    title: "RECEIVE_WAP_PUSH requires declaration form",
    message: "RECEIVE_WAP_PUSH is restricted to default SMS handler apps.",
    suggestion: "Remove RECEIVE_WAP_PUSH unless your app is a default SMS handler.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820",
  },
  // Call log permissions
  {
    permission: "android.permission.READ_CALL_LOG",
    severity: "critical",
    title: "READ_CALL_LOG requires declaration form",
    message: "READ_CALL_LOG is restricted to default phone/assistant handler apps.",
    suggestion: "Remove READ_CALL_LOG unless your app is a default phone or assistant handler.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820",
  },
  {
    permission: "android.permission.WRITE_CALL_LOG",
    severity: "critical",
    title: "WRITE_CALL_LOG requires declaration form",
    message: "WRITE_CALL_LOG is restricted to default phone handler apps.",
    suggestion: "Remove WRITE_CALL_LOG unless your app is a default phone handler.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820",
  },
  {
    permission: "android.permission.PROCESS_OUTGOING_CALLS",
    severity: "critical",
    title: "PROCESS_OUTGOING_CALLS requires declaration form",
    message: "PROCESS_OUTGOING_CALLS is restricted to default phone handler apps.",
    suggestion: "Remove PROCESS_OUTGOING_CALLS unless your app is a default phone handler.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10208820",
  },
  // Broad visibility
  {
    permission: "android.permission.QUERY_ALL_PACKAGES",
    severity: "error",
    title: "QUERY_ALL_PACKAGES requires justification",
    message: "QUERY_ALL_PACKAGES grants broad package visibility. Google Play requires justification and may reject apps using this without approval.",
    suggestion: "Replace with targeted <queries> elements in your manifest to declare specific packages you need to interact with.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10158779",
  },
  // All files access
  {
    permission: "android.permission.MANAGE_EXTERNAL_STORAGE",
    severity: "error",
    title: "MANAGE_EXTERNAL_STORAGE (All Files Access) requires declaration form",
    message: "All Files Access is restricted to file managers, backup apps, antivirus, and document management apps.",
    suggestion: "Use scoped storage APIs or the Storage Access Framework (SAF) instead. Only use MANAGE_EXTERNAL_STORAGE if your app's core functionality requires broad file access.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10467955",
  },
  // Background location
  {
    permission: "android.permission.ACCESS_BACKGROUND_LOCATION",
    severity: "error",
    title: "ACCESS_BACKGROUND_LOCATION requires declaration and review",
    message: "Background location access requires a Permissions Declaration Form, privacy policy, and video demonstration. Extended review times apply.",
    suggestion: "Use foreground location with a foreground service instead. Only use background location if it is essential to your app's core functionality.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/9799150",
  },
  // Photo/video permissions (May 2025 enforcement)
  {
    permission: "android.permission.READ_MEDIA_IMAGES",
    severity: "error",
    title: "READ_MEDIA_IMAGES requires declaration or photo picker",
    message: "Photo/Video Permissions policy requires either an approved declaration form or use of the Android photo picker for one-time image access.",
    suggestion: "Use the Android photo picker (ACTION_PICK_IMAGES) for profile pictures and one-time use. Only declare READ_MEDIA_IMAGES if your app's core functionality requires broad gallery access.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/14115180",
  },
  {
    permission: "android.permission.READ_MEDIA_VIDEO",
    severity: "error",
    title: "READ_MEDIA_VIDEO requires declaration or photo picker",
    message: "Photo/Video Permissions policy requires either an approved declaration form or use of the Android photo picker for one-time video access.",
    suggestion: "Use the Android photo picker for one-time video selection. Only declare READ_MEDIA_VIDEO if your app's core functionality requires broad video access.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/14115180",
  },
  // Install packages
  {
    permission: "android.permission.REQUEST_INSTALL_PACKAGES",
    severity: "error",
    title: "REQUEST_INSTALL_PACKAGES requires justification",
    message: "REQUEST_INSTALL_PACKAGES is restricted to apps whose core purpose is installing other packages.",
    suggestion: "Remove REQUEST_INSTALL_PACKAGES unless your app is an app store, package manager, or OTA updater.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/12085295",
  },
  // Exact alarm
  {
    permission: "android.permission.USE_EXACT_ALARM",
    severity: "warning",
    title: "USE_EXACT_ALARM is restricted",
    message: "USE_EXACT_ALARM is only for alarm, timer, and calendar apps. Google Play may reject apps using this without justification.",
    suggestion: "Use SCHEDULE_EXACT_ALARM instead if possible, or remove exact alarm usage if your app does not need precise timing.",
    policyUrl: "https://developer.android.com/about/versions/14/changes/schedule-exact-alarms",
  },
  // Full-screen intent
  {
    permission: "android.permission.USE_FULL_SCREEN_INTENT",
    severity: "warning",
    title: "USE_FULL_SCREEN_INTENT requires declaration",
    message: "Full-screen intents are restricted to alarm and calling apps on Android 14+. A declaration form is required.",
    suggestion: "Remove USE_FULL_SCREEN_INTENT unless your app is an alarm clock or calling app.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/13392821",
  },
  // Accessibility service
  {
    permission: "android.permission.BIND_ACCESSIBILITY_SERVICE",
    severity: "error",
    title: "BIND_ACCESSIBILITY_SERVICE requires declaration and justification",
    message: "Accessibility services must support users with disabilities. A declaration form and detailed justification are required.",
    suggestion: "Only use BIND_ACCESSIBILITY_SERVICE if your app genuinely assists users with disabilities. Misuse leads to rejection.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/10964491",
  },
  // VPN
  {
    permission: "android.permission.BIND_VPN_SERVICE",
    severity: "error",
    title: "BIND_VPN_SERVICE is restricted to VPN apps",
    message: "BIND_VPN_SERVICE is only for apps whose core functionality is providing VPN services.",
    suggestion: "Remove BIND_VPN_SERVICE unless your app is a VPN provider.",
    policyUrl: "https://support.google.com/googleplay/android-developer/answer/9888170",
  },
];

/** Map from permission string to restriction info for fast lookups. */
const RESTRICTED_MAP = new Map(RESTRICTED_PERMISSIONS.map((r) => [r.permission, r]));

export const permissionsScanner: PreflightScanner = {
  name: "permissions",
  description: "Audits declared permissions against Google Play restricted permissions policies",
  requires: ["manifest"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const manifest = ctx.manifest!;
    const findings: PreflightFinding[] = [];
    const allowed = new Set(ctx.config.allowedPermissions);

    for (const perm of manifest.permissions) {
      if (allowed.has(perm)) continue;

      const restriction = RESTRICTED_MAP.get(perm);
      if (restriction) {
        findings.push({
          scanner: "permissions",
          ruleId: `restricted-${perm.split(".").pop()?.toLowerCase() || perm}`,
          severity: restriction.severity,
          title: restriction.title,
          message: restriction.message,
          suggestion: restriction.suggestion,
          policyUrl: restriction.policyUrl,
        });
      }
    }

    // Data safety reminders for permissions that imply data collection
    const dataPermissions = [
      { perm: "android.permission.ACCESS_FINE_LOCATION", data: "precise location" },
      { perm: "android.permission.ACCESS_COARSE_LOCATION", data: "approximate location" },
      { perm: "android.permission.READ_CONTACTS", data: "contacts" },
      { perm: "android.permission.CAMERA", data: "photos/videos via camera" },
      { perm: "android.permission.RECORD_AUDIO", data: "audio recordings" },
      { perm: "android.permission.READ_CALENDAR", data: "calendar events" },
      { perm: "android.permission.BODY_SENSORS", data: "health/fitness data" },
      { perm: "android.permission.ACTIVITY_RECOGNITION", data: "physical activity" },
    ];

    const collectedData: string[] = [];
    for (const { perm, data } of dataPermissions) {
      if (manifest.permissions.includes(perm)) {
        collectedData.push(data);
      }
    }

    if (collectedData.length > 0) {
      findings.push({
        scanner: "permissions",
        ruleId: "data-safety-reminder",
        severity: "info",
        title: "Data Safety declaration reminder",
        message: `Your app declares permissions that imply collecting: ${collectedData.join(", ")}. Ensure your Data Safety form in Play Console accurately reflects this data collection.`,
        suggestion: "Review your Data Safety declaration at Play Console > Policy > App content > Data safety.",
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/10787469",
      });
    }

    return findings;
  },
};
