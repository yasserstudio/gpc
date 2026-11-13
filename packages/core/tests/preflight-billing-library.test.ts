import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { runPreflight } from "../src/preflight/orchestrator";
import type { PreflightFinding, PreflightResult } from "../src/preflight/types";

// Real AABs built by Gradle and stripped to their base manifest (see the README
// next to them). This suite drives the real reader: no readAab mock.
const FIXTURES = fileURLToPath(new URL("./fixtures/billing-library/", import.meta.url));
/** The day this check was built (Nov 13, 2026): 7 is past its extension deadline, 8 is in its info year. */
const SCAN_DAY = "2026-11-13T12:00:00Z";

const aab = (name: string) => join(FIXTURES, `${name}.aab`);

const RULES = ["billing-library-deprecated", "billing-library-version-unknown"];

function billingFindings(result: PreflightResult): PreflightFinding[] {
  return result.findings.filter((f) => RULES.includes(f.ruleId));
}

async function scan(name: string, configPath?: string): Promise<PreflightResult> {
  return runPreflight({ aabPath: aab(name), configPath: configPath ?? missingConfig });
}

/** Run on a given UTC instant and return the only Billing Library finding, if any. */
async function findingOn(name: string, iso: string): Promise<PreflightFinding | undefined> {
  vi.setSystemTime(new Date(iso));
  const found = billingFindings(await scan(name));
  expect(found.length).toBeLessThanOrEqual(1);
  return found[0];
}

let tmp: string;
let missingConfig: string;

beforeEach(async () => {
  // Only Date is faked, so the reader's real async I/O keeps running.
  vi.useFakeTimers({ toFake: ["Date"] });
  tmp = await mkdtemp(join(tmpdir(), "gpc-billing-"));
  // Point at a config file that does not exist so a stray .preflightrc.json in
  // the working directory can never change the result.
  missingConfig = join(tmp, "absent.json");
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(tmp, { recursive: true, force: true });
});

async function writeConfig(config: object): Promise<string> {
  const path = join(tmp, "preflightrc.json");
  await writeFile(path, JSON.stringify(config));
  return path;
}

describe("Billing Library version check (real AABs)", () => {
  it("rates Billing Library 7 as an error on 2026-11-13, past its extension deadline", async () => {
    const f = await findingOn("billing-7", SCAN_DAY);
    expect(f?.ruleId).toBe("billing-library-deprecated");
    expect(f?.scanner).toBe("policy");
    expect(f?.severity).toBe("error");
    expect(f?.message).toContain("7.1.1");
    expect(f?.message).toContain("2026-11-01");
    expect(f?.message).toContain("Google Play Billing Library");
    expect(f?.suggestion).toContain("Billing Library 8 or later");
    expect(f?.suggestion).toContain(
      "https://developer.android.com/google/play/billing/migrate-gpblv8",
    );
    expect(f?.policyUrl).toBe("https://developer.android.com/google/play/billing/deprecation-faq");
  });

  it("reads the version through billing-ktx: 8 is info on 2026-11-13", async () => {
    const f = await findingOn("billing-ktx-8", SCAN_DAY);
    expect(f?.ruleId).toBe("billing-library-deprecated");
    expect(f?.severity).toBe("info");
    expect(f?.message).toContain("8.3.0");
    expect(f?.message).toContain("2027-08-31");
    expect(f?.suggestion).toContain("Billing Library 9 or later");
  });

  it("starts the info window exactly 12 months before the update deadline", async () => {
    expect(await findingOn("billing-ktx-8", "2026-08-30T23:59:59Z")).toBeUndefined();
    expect((await findingOn("billing-ktx-8", "2026-08-31T00:00:00Z"))?.severity).toBe("info");
  });

  it("treats the update deadline day as not yet past (UTC)", async () => {
    expect((await findingOn("billing-ktx-8", "2027-08-30T12:00:00Z"))?.severity).toBe("info");
    expect((await findingOn("billing-ktx-8", "2027-08-31T23:59:59Z"))?.severity).toBe("info");
    expect((await findingOn("billing-ktx-8", "2027-09-01T00:00:00Z"))?.severity).toBe("warning");
  });

  it("warns between the deadlines and points to the extension form", async () => {
    const f = await findingOn("billing-ktx-8", "2027-10-01T12:00:00Z");
    expect(f?.severity).toBe("warning");
    expect(f?.message).toContain("2027-08-31");
    expect(f?.message).toContain("2027-11-01");
    expect(f?.suggestion).toContain("Policy status");
  });

  it("treats the extension deadline day as not yet past (UTC)", async () => {
    expect((await findingOn("billing-ktx-8", "2027-10-31T12:00:00Z"))?.severity).toBe("warning");
    expect((await findingOn("billing-ktx-8", "2027-11-01T23:59:59Z"))?.severity).toBe("warning");
    const after = await findingOn("billing-ktx-8", "2027-11-02T00:00:00Z");
    expect(after?.severity).toBe("error");
    expect(after?.message).toContain("2027-11-01");
  });

  it("gives no finding for Billing Library 9 on 2026-11-13", async () => {
    expect(await findingOn("billing-9", SCAN_DAY)).toBeUndefined();
  });

  it("gives no Billing Library finding for an app without billing", async () => {
    expect(await findingOn("no-billing", "2030-01-01T00:00:00Z")).toBeUndefined();
  });

  it("reports an unknown version when the meta-data was stripped", async () => {
    const f = await findingOn("billing-8-no-meta", SCAN_DAY);
    expect(f?.ruleId).toBe("billing-library-version-unknown");
    expect(f?.severity).toBe("info");
    expect(f?.message).toContain("com.google.android.play.billingclient.version");
  });

  it("applies severityOverrides to the rule", async () => {
    vi.setSystemTime(new Date(SCAN_DAY));
    const configPath = await writeConfig({
      severityOverrides: { "billing-library-deprecated": "warning" },
    });
    const result = await scan("billing-7", configPath);
    expect(billingFindings(result).map((f) => f.severity)).toEqual(["warning"]);
  });

  it("suppresses both rules through disabledRules", async () => {
    vi.setSystemTime(new Date(SCAN_DAY));
    const configPath = await writeConfig({ disabledRules: RULES });
    expect(billingFindings(await scan("billing-7", configPath))).toEqual([]);
    expect(billingFindings(await scan("billing-8-no-meta", configPath))).toEqual([]);
  });

  it("flips a failOn: error run to failed for Billing Library 7", async () => {
    vi.setSystemTime(new Date(SCAN_DAY));
    const without = await scan(
      "billing-7",
      await writeConfig({ failOn: "error", disabledRules: RULES }),
    );
    expect(without.passed).toBe(true);
    const withRule = await scan("billing-7", await writeConfig({ failOn: "error" }));
    expect(withRule.passed).toBe(false);
  });
});
