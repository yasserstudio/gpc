// Named exports only. No default export.

import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import { formatOutput } from "@gpc-cli/core";
import type { EnrollAppRequest, KeyRotationReason, RotateAppSigningKeyRequest } from "@gpc-cli/api";

import { resolvePackageName, getClient } from "../resolve.js";
import { getOutputFormat } from "../format.js";
import { requireConfirm } from "../prompt.js";
import { isDryRun, printDryRun } from "../dry-run.js";
import { bold, yellow, dim } from "../colors.js";

const HELP_CENTER = "https://support.google.com/googleplay/android-developer/answer/9842756";

const ROTATION_REASONS: KeyRotationReason[] = [
  "COMPROMISED_KEY",
  "USE_STRONGER_KEY",
  "USE_SAME_KEY_FOR_MULTIPLE_APPS",
  "ROUTINE_KEY_UPGRADE",
  "OTHER",
];

function usageError(message: string, suggestion: string): Error {
  return Object.assign(new Error(message), {
    code: "USAGE_ERROR",
    exitCode: 2,
    suggestion,
  });
}

/**
 * Read a file and return it base64-encoded, as the API's `bytes` fields expect.
 *
 * A mistyped path can hand Google a private key, so every flag rejects key-looking
 * contents; `requirePem` additionally requires the certificate flags to look like a
 * PEM certificate. File contents are never logged.
 */
async function readFileAsBase64(
  path: string,
  flag: string,
  expected: string,
  requirePem = false,
): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  let contents: Buffer;
  try {
    contents = await readFile(path);
  } catch {
    throw Object.assign(new Error(`Cannot read ${flag} file: ${path}`), {
      code: "FILE_NOT_FOUND",
      exitCode: 2,
      suggestion: `Check the path passed to ${flag}.`,
    });
  }
  if (contents.length === 0) {
    throw usageError(`${flag} file is empty: ${path}`, `Provide ${expected}.`);
  }
  // No flag here ever takes a private key, so refuse one before it is uploaded --
  // including the binary lineage file, where the check simply never matches.
  const text = contents.toString("utf8");
  if (text.includes("PRIVATE KEY")) {
    throw usageError(
      `${flag} file looks like a private key: ${path}`,
      `Never pass a private key to ${flag}; provide ${expected}.`,
    );
  }
  if (requirePem) {
    if (!text.includes("-----BEGIN CERTIFICATE-----")) {
      throw usageError(
        `${flag} file is not a PEM certificate: ${path}`,
        `Provide ${expected}: a file containing "-----BEGIN CERTIFICATE-----".`,
      );
    }
  }
  return contents.toString("base64");
}

/**
 * Print the self-hosted-Cloud-KMS-only warning. Google is explicit that standard
 * Play App Signing enrollment cannot be done through this API, so make that
 * impossible to miss before anything is sent.
 */
function printAdvancedApiWarning(lines: string[]): void {
  console.error("");
  console.error(bold(yellow("⚠  Advanced API — self-hosted Google Cloud KMS keys only.")));
  console.error("");
  console.error("   Standard Play App Signing (Google-generated or Google-managed keys)");
  console.error("   CANNOT be set up through this API. Do that in Play Console instead.");
  console.error("");
  console.error("   This command is strictly for organizations with mandatory compliance,");
  console.error("   regulatory, or policy requirements to keep key custody in an external");
  console.error("   Cloud KMS instance. It requires an active Cloud KMS key with Decrypt and");
  console.error("   Sign IAM permissions already granted to Google Play.");
  console.error("");
  for (const line of lines) console.error(`   ${line}`);
  console.error("");
  console.error(dim(`   ${HELP_CENTER}`));
  console.error("");
}

export function registerAppSigningCommands(program: Command): void {
  const cmd = program
    .command("app-signing")
    .description("Play App Signing with a self-hosted Google Cloud KMS key (advanced)");

  cmd
    .command("enroll")
    .description("Enroll an app in Play App Signing using a self-hosted Cloud KMS key")
    .requiredOption("--kms-key <resource-name>", "Cloud KMS cryptoKeyVersion resource name")
    .option("--new-app", "Enroll an app not yet published to Open testing or Production")
    .option("--existing-app", "Enroll an app that is already published")
    .option("--cert <pem-file>", "PEM certificate for the Cloud KMS key (required with --new-app)")
    .option("--upload-cert <pem-file>", "PEM certificate for the upload key (optional)")
    .action(
      async (opts: {
        kmsKey: string;
        newApp?: boolean;
        existingApp?: boolean;
        cert?: string;
        uploadCert?: string;
      }) => {
        if (opts.newApp && opts.existingApp) {
          throw usageError(
            "--new-app and --existing-app are mutually exclusive",
            "Pass exactly one: --new-app for an app not yet on Open testing or Production, --existing-app otherwise.",
          );
        }
        if (!opts.newApp && !opts.existingApp) {
          throw usageError(
            "One of --new-app or --existing-app is required",
            "Pass --new-app for an app not yet on Open testing or Production, --existing-app otherwise.",
          );
        }
        if (opts.newApp && !opts.cert) {
          throw usageError(
            "--cert is required with --new-app",
            "Google requires the certificate associated with the Cloud KMS key when enrolling a new app.",
          );
        }

        const config = await loadConfig();
        const packageName = resolvePackageName(program.opts()["app"], config);
        const format = getOutputFormat(program, config);

        // Check dry-run before touching the filesystem, the same way rotate does.
        if (isDryRun(program)) {
          printDryRun(
            {
              command: "app-signing enroll",
              action: "enroll",
              target: packageName,
              details: {
                mode: opts.newApp ? "new-app" : "existing-app",
                cryptoKeyVersionResource: opts.kmsKey,
                uploadCertificate: Boolean(opts.uploadCert),
              },
            },
            format,
            formatOutput,
          );
          return;
        }

        const request: EnrollAppRequest = opts.newApp
          ? {
              enrollNewApp: {
                cloudKmsKeyAndCert: {
                  cloudKmsKey: { cryptoKeyVersionResource: opts.kmsKey },
                  pemCertificate: await readFileAsBase64(
                    opts.cert as string,
                    "--cert",
                    "the certificate in PEM format",
                    true,
                  ),
                },
              },
            }
          : { enrollExistingApp: { cloudKmsKey: { cryptoKeyVersionResource: opts.kmsKey } } };

        if (opts.uploadCert) {
          request.pemUploadCertificate = await readFileAsBase64(
            opts.uploadCert,
            "--upload-cert",
            "the upload certificate in PEM format",
            true,
          );
        }

        printAdvancedApiWarning([
          `App:        ${packageName}`,
          `Mode:       ${opts.newApp ? "new app (not yet on Open testing or Production)" : "existing app"}`,
          `Cloud KMS:  ${opts.kmsKey}`,
        ]);
        await requireConfirm(`Enroll "${packageName}" with this self-hosted key?`, program);

        const client = await getClient(config);
        const result = await client.appSigning.enroll(packageName, request);
        console.log(formatOutput(result, format));
      },
    );

  cmd
    .command("rotate")
    .description("Rotate the signing key of an app enrolled with a self-hosted Cloud KMS key")
    .requiredOption("--kms-key <resource-name>", "New Cloud KMS cryptoKeyVersion resource name")
    .requiredOption("--cert <pem-file>", "PEM certificate for the new Cloud KMS key")
    .requiredOption("--lineage <file>", "Signing certificate lineage file (proof of rotation)")
    .requiredOption("--reason <reason>", `Rotation reason: ${ROTATION_REASONS.join(", ")}`)
    .action(async (opts: { kmsKey: string; cert: string; lineage: string; reason: string }) => {
      const reason = opts.reason.toUpperCase().replace(/-/g, "_") as KeyRotationReason;
      if (!ROTATION_REASONS.includes(reason)) {
        throw usageError(
          `Invalid --reason "${opts.reason}"`,
          `Use one of: ${ROTATION_REASONS.join(", ")}`,
        );
      }

      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const format = getOutputFormat(program, config);

      if (isDryRun(program)) {
        printDryRun(
          {
            command: "app-signing rotate",
            action: "rotate the signing key of",
            target: packageName,
            details: { cryptoKeyVersionResource: opts.kmsKey, keyRotationReason: reason },
          },
          format,
          formatOutput,
        );
        return;
      }

      const request: RotateAppSigningKeyRequest = {
        keyRotationReason: reason,
        rotatedCloudKmsKey: {
          cloudKmsKeyAndCert: {
            cloudKmsKey: { cryptoKeyVersionResource: opts.kmsKey },
            pemCertificate: await readFileAsBase64(
              opts.cert,
              "--cert",
              "the certificate in PEM format",
              true,
            ),
          },
          signingCertificateLineage: await readFileAsBase64(
            opts.lineage,
            "--lineage",
            "the signing certificate lineage produced by apksigner",
          ),
        },
      };

      printAdvancedApiWarning([
        "Only apps enrolled with a self-hosted Cloud KMS key can rotate keys here.",
        "For standard Play App Signing, request rotation in the Play Console UI.",
        "",
        `App:        ${packageName}`,
        `New key:    ${opts.kmsKey}`,
        `Reason:     ${reason}`,
      ]);
      await requireConfirm(`Rotate the signing key for "${packageName}"?`, program);

      const client = await getClient(config);
      const result = await client.appSigning.rotateKey(packageName, request);
      console.log(formatOutput(result, format));
    });
}
