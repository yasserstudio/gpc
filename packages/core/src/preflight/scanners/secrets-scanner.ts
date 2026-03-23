// Named exports only. No default export.

import { readFile } from "node:fs/promises";
import type { PreflightScanner, PreflightContext, PreflightFinding, FindingSeverity } from "../types.js";
import { collectSourceFiles } from "../scan-files.js";

interface SecretPattern {
  ruleId: string;
  name: string;
  pattern: RegExp;
  severity: FindingSeverity;
  suggestion: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    ruleId: "secret-aws-key",
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: "critical",
    suggestion: "Use environment variables or AWS Secrets Manager. Never hardcode AWS credentials.",
  },
  {
    ruleId: "secret-google-api-key",
    name: "Google API Key",
    pattern: /AIza[0-9A-Za-z\-_]{35}/,
    severity: "critical",
    suggestion: "Move Google API keys to local.properties or environment variables. Restrict keys in Google Cloud Console.",
  },
  {
    ruleId: "secret-stripe-key",
    name: "Stripe Secret Key",
    pattern: /sk_live_[0-9a-zA-Z]{24,}/,
    severity: "critical",
    suggestion: "Never ship Stripe secret keys in client code. Use your backend server for Stripe API calls.",
  },
  {
    ruleId: "secret-stripe-restricted",
    name: "Stripe Restricted Key",
    pattern: /rk_live_[0-9a-zA-Z]{24,}/,
    severity: "critical",
    suggestion: "Stripe restricted keys should not be in client code. Use server-side integration.",
  },
  {
    ruleId: "secret-private-key",
    name: "Private Key",
    pattern: /-----BEGIN\s+(RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    severity: "critical",
    suggestion: "Remove private keys from source code. Store them in a secure key management system.",
  },
  {
    ruleId: "secret-firebase-key",
    name: "Firebase API Key in code",
    pattern: /["']AIza[0-9A-Za-z\-_]{35}["']/,
    severity: "warning",
    suggestion: "Firebase API keys in client code are normal for google-services.json, but verify they are restricted in Google Cloud Console.",
  },
  {
    ruleId: "secret-generic-token",
    name: "Generic API Token",
    pattern: /(?:api[_-]?key|api[_-]?secret|auth[_-]?token|access[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9\-_]{20,}["']/i,
    severity: "warning",
    suggestion: "Avoid hardcoding tokens. Use BuildConfig fields, environment variables, or a secrets manager.",
  },
];

const SCAN_EXTENSIONS = new Set([
  ".ts", ".js", ".tsx", ".jsx", ".kt", ".java",
  ".xml", ".json", ".properties", ".yaml", ".yml",
  ".gradle",
]);

export const secretsScanner: PreflightScanner = {
  name: "secrets",
  description: "Scans source code for hardcoded credentials and API keys",
  requires: ["sourceDir"],

  async scan(ctx: PreflightContext): Promise<PreflightFinding[]> {
    const dir = ctx.sourceDir!;
    const findings: PreflightFinding[] = [];
    const files = await collectSourceFiles(dir, SCAN_EXTENSIONS);

    for (const filePath of files) {
      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.pattern.test(line)) {
            const relativePath = filePath.startsWith(dir)
              ? filePath.slice(dir.length + 1)
              : filePath;

            findings.push({
              scanner: "secrets",
              ruleId: pattern.ruleId,
              severity: pattern.severity,
              title: `${pattern.name} found in ${relativePath}:${i + 1}`,
              message: `Potential ${pattern.name} detected at ${relativePath} line ${i + 1}.`,
              suggestion: pattern.suggestion,
            });
            break; // Only report first match per line
          }
        }
      }
    }

    return findings;
  },
};

