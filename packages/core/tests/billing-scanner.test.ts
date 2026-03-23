import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { billingScanner } from "../src/preflight/scanners/billing-scanner";
import type { PreflightContext } from "../src/preflight/types";
import { DEFAULT_PREFLIGHT_CONFIG } from "../src/preflight/types";

function makeCtx(sourceDir: string): PreflightContext {
  return { sourceDir, config: { ...DEFAULT_PREFLIGHT_CONFIG } };
}

describe("billingScanner", () => {
  const tmpDir = join(tmpdir(), "gpc-test-billing-scanner");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns no findings for clean code", async () => {
    await writeFile(
      join(tmpDir, "App.kt"),
      `
      import com.android.billingclient.api.BillingClient
      class App { }
    `,
    );
    const findings = await billingScanner.scan(makeCtx(tmpDir));
    expect(findings).toEqual([]);
  });

  it("detects Stripe SDK in Kotlin", async () => {
    await writeFile(
      join(tmpDir, "Payment.kt"),
      `
      import com.stripe.android.PaymentConfiguration
    `,
    );
    const findings = await billingScanner.scan(makeCtx(tmpDir));
    const f = findings.find((f) => f.ruleId === "billing-stripe-sdk");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("warning");
  });

  it("detects Stripe SDK in package.json", async () => {
    await writeFile(
      join(tmpDir, "package.json"),
      `{
      "dependencies": { "@stripe/stripe-react-native": "^1.0.0" }
    }`,
    );
    const findings = await billingScanner.scan(makeCtx(tmpDir));
    expect(findings.some((f) => f.ruleId === "billing-stripe-sdk")).toBe(true);
  });

  it("detects Braintree SDK", async () => {
    await writeFile(
      join(tmpDir, "build.gradle"),
      `
      implementation 'com.braintreepayments.api:card:4.0.0'
    `,
    );
    const findings = await billingScanner.scan(makeCtx(tmpDir));
    expect(findings.some((f) => f.ruleId === "billing-braintree-sdk")).toBe(true);
  });

  it("detects PayPal SDK", async () => {
    await writeFile(
      join(tmpDir, "build.gradle"),
      `
      implementation 'com.paypal.checkout:android-sdk:1.0.0'
    `,
    );
    const findings = await billingScanner.scan(makeCtx(tmpDir));
    expect(findings.some((f) => f.ruleId === "billing-paypal-sdk")).toBe(true);
  });

  it("reports each SDK only once", async () => {
    await writeFile(join(tmpDir, "A.kt"), `import com.stripe.android.X`);
    await writeFile(join(tmpDir, "B.kt"), `import com.stripe.android.Y`);
    const findings = await billingScanner.scan(makeCtx(tmpDir));
    const stripeFindings = findings.filter((f) => f.ruleId === "billing-stripe-sdk");
    expect(stripeFindings).toHaveLength(1);
  });

  it("includes policy URL in findings", async () => {
    await writeFile(join(tmpDir, "Pay.kt"), `import com.stripe.android.X`);
    const findings = await billingScanner.scan(makeCtx(tmpDir));
    expect(findings[0]!.policyUrl).toBeDefined();
    expect(findings[0]!.policyUrl).toContain("google");
  });
});
