export interface ChecklistItem {
  id: string;
  title: string;
  status: "done" | "action-needed" | "cannot-detect";
  detail?: string;
  actionUrl?: string;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  completed: number;
  total: number;
}

export interface ChecklistInput {
  authenticated: boolean;
  accountEmail?: string;
  appAccessible?: boolean;
  bundleCount?: number;
  hasGeneratedApks?: boolean;
  interactiveAnswers?: Record<string, boolean>;
}

const PLAY_CONSOLE_SETTINGS = "https://play.google.com/console/developers/settings";
const VERIFICATION_PAGE = "https://developer.android.com/developer-verification";
const PLAY_APP_SIGNING = "https://support.google.com/googleplay/android-developer/answer/9842756";
const QUALITY_REQUIREMENTS_ANNOUNCEMENT =
  "https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html";
const RESTORE_CREDENTIALS_DOCS =
  "https://developer.android.com/identity/sign-in/restore-credentials";

export function buildChecklist(input: ChecklistInput): ChecklistResult {
  const items: ChecklistItem[] = [];
  const answers = input.interactiveAnswers ?? {};

  items.push({
    id: "account-active",
    title: "Play Console account active",
    status: input.authenticated ? "done" : "action-needed",
    detail: input.authenticated
      ? `Authenticated as ${input.accountEmail ?? "unknown"}`
      : "Could not authenticate with Google Play",
    actionUrl: input.authenticated ? undefined : "https://play.google.com/console",
  });

  items.push(
    resolveManualStep(
      "identity-verified",
      "Identity verification complete",
      "Confirm your identity is verified under Developer Account in Play Console Settings",
      PLAY_CONSOLE_SETTINGS,
      answers,
    ),
  );

  items.push(
    resolveManualStep(
      "enforcement-markets",
      "Verification enforcement timeline reviewed",
      "Enforcement begins September 30, 2026, first in Brazil, Indonesia, Singapore, and Thailand. Apps distributed there need a verified developer identity and a registered package name. Apps using Play App Signing are auto-registered.",
      VERIFICATION_PAGE,
      answers,
    ),
  );

  items.push(
    resolveManualStep(
      "auto-registration-reviewed",
      "Auto-registration results reviewed",
      "Check the registration status banner above your app list in Play Console",
      PLAY_CONSOLE_SETTINGS,
      answers,
    ),
  );

  items.push(
    resolveManualStep(
      "all-apps-registered",
      "All Play apps registered in Play Console",
      "As of July 15, 2026, every app on your account must be registered in Play Console to meet Android developer verification requirements. Unregistered apps risk removal from Google Play. Apps using Play App Signing are auto-registered; register any others manually.",
      PLAY_CONSOLE_SETTINGS,
      answers,
    ),
  );

  items.push(
    resolveManualStep(
      "memory-quality-thresholds",
      "Memory quality requirements reviewed",
      "Starting February 2027, apps and games must meet Google Play's dynamic memory, bitmap memory, and DEX code optimization thresholds (at least 25% coverage using R8 or another shrinking tool); apps that miss them may see reduced visibility and publishing capabilities. Review the dynamic memory metrics, out of memory crash filters, and DEX optimization insights in Play Console under Android vitals. Source: " +
        QUALITY_REQUIREMENTS_ANNOUNCEMENT,
      QUALITY_REQUIREMENTS_ANNOUNCEMENT,
      answers,
    ),
  );

  items.push(
    resolveManualStep(
      "restore-credentials",
      "Zero-Tap Sign-In (Restore Credentials API) implemented",
      "Starting April 2027, apps that support user sign-in must restore the signed-in state when a user moves to a new Android device, using the Android Restore Credentials API, to keep full publishing capabilities and optimal Play Store visibility. Games are currently exempt. Adopt the Restore Credentials API in your sign-in flow. Source: " +
        QUALITY_REQUIREMENTS_ANNOUNCEMENT,
      RESTORE_CREDENTIALS_DOCS,
      answers,
    ),
  );

  if (input.appAccessible !== undefined) {
    items.push({
      id: "app-accessible",
      title: "App accessible via API",
      status: input.appAccessible ? "done" : "action-needed",
      detail: input.appAccessible
        ? "App is reachable through the Play Developer API"
        : "Could not access app via API",
    });
  }

  if (input.bundleCount !== undefined) {
    items.push({
      id: "bundle-uploaded",
      title: "At least one bundle uploaded",
      status: input.bundleCount > 0 ? "done" : "action-needed",
      detail:
        input.bundleCount > 0
          ? `${input.bundleCount} bundle${input.bundleCount !== 1 ? "s" : ""} on file`
          : "No bundles found. Upload an AAB with: gpc publish",
    });
  }

  if (input.hasGeneratedApks !== undefined) {
    items.push({
      id: "play-app-signing",
      title: "Play App Signing enrolled",
      status: input.hasGeneratedApks ? "done" : "action-needed",
      detail: input.hasGeneratedApks
        ? "Google manages your app signing key"
        : "App may not be enrolled in Play App Signing",
      actionUrl: input.hasGeneratedApks ? undefined : PLAY_APP_SIGNING,
    });
  }

  items.push(
    resolveManualStep(
      "additional-keys",
      "Additional signing keys registered",
      "If you distribute outside Play with a different key, register it in Play Console",
      VERIFICATION_PAGE,
      answers,
    ),
  );

  const completed = items.filter((i) => i.status === "done").length;
  return { items, completed, total: items.length };
}

function resolveManualStep(
  id: string,
  title: string,
  detail: string,
  actionUrl: string,
  answers: Record<string, boolean>,
): ChecklistItem {
  if (id in answers) {
    return {
      id,
      title,
      status: answers[id] ? "done" : "action-needed",
      detail,
      actionUrl: answers[id] ? undefined : actionUrl,
    };
  }
  return { id, title, status: "cannot-detect", detail, actionUrl };
}

export function renderChecklistMarkdown(result: ChecklistResult, accountEmail: string): string {
  const lines: string[] = [
    "# Developer Verification Checklist",
    "",
    `Account: ${accountEmail}`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    `Progress: ${result.completed}/${result.total}`,
    "",
  ];

  for (const item of result.items) {
    const check = item.status === "done" ? "x" : " ";
    lines.push(`- [${check}] ${item.title}`);
    if (item.detail) lines.push(`  ${item.detail}`);
    if (item.actionUrl && item.status !== "done") lines.push(`  ${item.actionUrl}`);
  }

  lines.push("");
  return lines.join("\n");
}
