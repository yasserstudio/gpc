// Named exports only. No default export.

import { readdir, stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";
import { lintListing, DEFAULT_LIMITS } from "../../utils/listing-text.js";

const SAFE_LANG = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;

const FILE_MAP: Record<string, string> = {
  "title.txt": "title",
  "short_description.txt": "shortDescription",
  "full_description.txt": "fullDescription",
  "video.txt": "video",
};

const SCREENSHOT_DIRS = [
  "phoneScreenshots",
  "sevenInchScreenshots",
  "tenInchScreenshots",
  "tvScreenshots",
  "wearScreenshots",
];

const MIN_PHONE_SCREENSHOTS = 2;
const RECOMMENDED_PHONE_SCREENSHOTS = 4;

export const metadataScanner: PreflightScanner = {
  name: "metadata",
  description: "Checks store listing metadata for character limits, required fields, and screenshots",
  requires: ["metadataDir"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const dir = ctx.metadataDir!;
    const findings: PreflightFinding[] = [];

    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      findings.push({
        scanner: "metadata",
        ruleId: "metadata-dir-not-found",
        severity: "error",
        title: "Metadata directory not found",
        message: `Cannot read metadata directory: ${dir}`,
        suggestion: "Check the path to your metadata directory. Expected Fastlane format: <dir>/<lang>/title.txt, short_description.txt, etc.",
      });
      return findings;
    }

    const locales = entries.filter((e) => SAFE_LANG.test(e));
    if (locales.length === 0) {
      findings.push({
        scanner: "metadata",
        ruleId: "no-locales-found",
        severity: "error",
        title: "No locale directories found",
        message: `No valid locale directories found in ${dir}. Expected subdirectories like en-US/, fr-FR/, etc.`,
        suggestion: "Create locale directories with listing files: <dir>/en-US/title.txt",
      });
      return findings;
    }

    for (const lang of locales) {
      const langDir = join(dir, lang);
      const langStat = await stat(langDir).catch(() => null);
      if (!langStat?.isDirectory()) continue;

      // Read listing fields
      const fields: Record<string, string> = {};
      for (const [fileName, field] of Object.entries(FILE_MAP)) {
        const filePath = join(langDir, fileName);
        try {
          const content = await readFile(filePath, "utf-8");
          fields[field] = content.trimEnd();
        } catch {
          // File doesn't exist — field is empty
        }
      }

      // Lint character limits
      const lintResult = lintListing(lang, fields, DEFAULT_LIMITS);
      for (const field of lintResult.fields) {
        if (field.status === "over") {
          findings.push({
            scanner: "metadata",
            ruleId: `listing-${field.field}-over-limit`,
            severity: "error",
            title: `${lang}: ${field.field} exceeds ${field.limit} character limit`,
            message: `${field.field} is ${field.chars} characters (limit: ${field.limit}). Google Play will reject this listing.`,
            suggestion: `Shorten ${field.field} to ${field.limit} characters or fewer.`,
          });
        } else if (field.status === "warn") {
          findings.push({
            scanner: "metadata",
            ruleId: `listing-${field.field}-near-limit`,
            severity: "info",
            title: `${lang}: ${field.field} is ${field.pct}% of limit`,
            message: `${field.field} is ${field.chars}/${field.limit} characters (${field.pct}%).`,
          });
        }
      }

      // Check for missing title
      if (!fields["title"]?.trim()) {
        findings.push({
          scanner: "metadata",
          ruleId: "listing-missing-title",
          severity: "error",
          title: `${lang}: Missing title`,
          message: `No title.txt found or file is empty for locale ${lang}.`,
          suggestion: "Create a title.txt file with your app name (max 30 characters).",
        });
      }

      // Check screenshot count
      let totalScreenshots = 0;
      let phoneScreenshots = 0;

      for (const ssDir of SCREENSHOT_DIRS) {
        const ssPath = join(langDir, "images", ssDir);
        try {
          const ssEntries = await readdir(ssPath);
          const imageFiles = ssEntries.filter((f) =>
            /\.(png|jpe?g|webp)$/i.test(f),
          );
          totalScreenshots += imageFiles.length;
          if (ssDir === "phoneScreenshots") {
            phoneScreenshots = imageFiles.length;
          }
        } catch {
          // Screenshot directory doesn't exist
        }
      }

      if (phoneScreenshots < MIN_PHONE_SCREENSHOTS && totalScreenshots === 0) {
        findings.push({
          scanner: "metadata",
          ruleId: "listing-no-screenshots",
          severity: "warning",
          title: `${lang}: No screenshots found`,
          message: `No screenshot images found for locale ${lang}. Google Play requires at least 2 phone screenshots.`,
          suggestion: `Add PNG or JPEG screenshots to ${lang}/images/phoneScreenshots/`,
          policyUrl: "https://support.google.com/googleplay/android-developer/answer/9866151",
        });
      } else if (phoneScreenshots < RECOMMENDED_PHONE_SCREENSHOTS && phoneScreenshots > 0) {
        findings.push({
          scanner: "metadata",
          ruleId: "listing-few-screenshots",
          severity: "info",
          title: `${lang}: Only ${phoneScreenshots} phone screenshot(s)`,
          message: `Found ${phoneScreenshots} phone screenshot(s). Google recommends at least ${RECOMMENDED_PHONE_SCREENSHOTS} for better store presence.`,
        });
      }
    }

    // Check for privacy policy URL
    const defaultLang = locales.includes("en-US") ? "en-US" : locales[0]!;
    const privacyPath = join(dir, defaultLang, "privacy_policy_url.txt");
    try {
      const url = await readFile(privacyPath, "utf-8");
      if (!url.trim()) throw new Error("empty");
    } catch {
      findings.push({
        scanner: "metadata",
        ruleId: "listing-no-privacy-policy",
        severity: "warning",
        title: "No privacy policy URL",
        message: "No privacy_policy_url.txt found in metadata. A privacy policy is required for most apps on Google Play.",
        suggestion: `Create ${defaultLang}/privacy_policy_url.txt with a link to your privacy policy.`,
        policyUrl: "https://support.google.com/googleplay/android-developer/answer/9859455",
      });
    }

    // Summary
    findings.push({
      scanner: "metadata",
      ruleId: "metadata-summary",
      severity: "info",
      title: `${locales.length} locale(s) found`,
      message: `Scanned metadata for: ${locales.join(", ")}`,
    });

    return findings;
  },
};
