// Named exports only. No default export.

import { readFile } from "node:fs/promises";
import type { PreflightScanner, PreflightContext, PreflightFinding } from "../types.js";
import { collectSourceFiles } from "../scan-files.js";

interface BillingPattern {
  ruleId: string;
  name: string;
  pattern: RegExp;
  message: string;
  suggestion: string;
}

const BILLING_PATTERNS: BillingPattern[] = [
  {
    ruleId: "billing-stripe-sdk",
    name: "Stripe SDK",
    pattern: /(?:com\.stripe|@stripe\/|stripe-android|StripeSdk)/,
    message: "Stripe SDK detected. Google Play requires Play Billing for in-app purchases of digital goods.",
    suggestion: "If selling digital goods, use Google Play Billing Library. Stripe is only allowed for physical goods, services, or out-of-app purchases.",
  },
  {
    ruleId: "billing-braintree-sdk",
    name: "Braintree SDK",
    pattern: /(?:com\.braintreepayments|braintree-android)/,
    message: "Braintree SDK detected. Google Play requires Play Billing for digital in-app purchases.",
    suggestion: "Use Google Play Billing Library for digital goods. Braintree is only allowed for physical goods and services.",
  },
  {
    ruleId: "billing-paypal-sdk",
    name: "PayPal SDK",
    pattern: /(?:com\.paypal|paypal-android)/,
    message: "PayPal SDK detected. Google Play requires Play Billing for digital in-app purchases.",
    suggestion: "Use Google Play Billing Library for digital goods. PayPal is allowed for physical goods only.",
  },
  {
    ruleId: "billing-razorpay-sdk",
    name: "Razorpay SDK",
    pattern: /(?:com\.razorpay)/,
    message: "Razorpay SDK detected. If used for digital goods, this may violate Google Play billing policy.",
    suggestion: "Ensure Razorpay is only used for physical goods/services. Digital goods require Play Billing.",
  },
  {
    ruleId: "billing-checkout-sdk",
    name: "Alternative checkout SDK",
    pattern: /(?:com\.adyen|com\.checkout|com\.square\.sdk)/,
    message: "Alternative payment SDK detected. Google Play requires Play Billing for digital goods.",
    suggestion: "Verify this payment SDK is only used for physical goods or services, not digital content.",
  },
];

const SCAN_EXTENSIONS = new Set([
  ".kt", ".java", ".xml", ".gradle",
  ".ts", ".js", ".tsx", ".jsx", ".json",
]);

export const billingScanner: PreflightScanner = {
  name: "billing",
  description: "Detects non-Play billing SDKs that may violate Google Play billing policy",
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

      for (const bp of BILLING_PATTERNS) {
        if (detectedSdks.has(bp.ruleId)) continue; // Only report each SDK once

        if (bp.pattern.test(content)) {
          const relativePath = filePath.startsWith(dir)
            ? filePath.slice(dir.length + 1)
            : filePath;

          detectedSdks.add(bp.ruleId);
          findings.push({
            scanner: "billing",
            ruleId: bp.ruleId,
            severity: "warning",
            title: `${bp.name} detected`,
            message: `${bp.message} Found in ${relativePath}.`,
            suggestion: bp.suggestion,
            policyUrl: "https://support.google.com/googleplay/android-developer/answer/10281818",
          });
        }
      }
    }

    return findings;
  },
};

