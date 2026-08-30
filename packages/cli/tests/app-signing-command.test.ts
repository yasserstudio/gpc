import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Drives the REAL createProgram() so registration, global-flag resolution
// (-a/--app, -y/--yes, --output) and the action wiring are all exercised.

vi.mock("@gpc-cli/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gpc-cli/config")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({ app: "com.example.app" }),
    getCacheDir: () => "/tmp/gpc-test-cache",
  };
});

const enroll = vi.fn().mockResolvedValue({
  signingCertificate: { certificateHashSha256: "AA:BB" },
});
const rotateKey = vi.fn().mockResolvedValue({
  rotatedKeyCertificate: { certificateHashSha256: "CC:DD" },
});

vi.mock("../src/resolve.js", () => ({
  resolvePackageName: vi.fn().mockReturnValue("com.example.app"),
  getClient: vi.fn().mockResolvedValue({ appSigning: { enroll, rotateKey } }),
}));

const requireConfirm = vi.fn().mockResolvedValue(undefined);
vi.mock("../src/prompt.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/prompt.js")>();
  return { ...actual, requireConfirm };
});

const FILES: Record<string, Buffer> = {
  "/tmp/signing.pem": Buffer.from("-----BEGIN CERTIFICATE-----\nsigning\n"),
  "/tmp/upload.pem": Buffer.from("-----BEGIN CERTIFICATE-----\nupload\n"),
  "/tmp/lineage.bin": Buffer.from([0x01, 0x02, 0x03]),
  "/tmp/empty.pem": Buffer.alloc(0),
  "/tmp/private-key.pem": Buffer.from(
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----\n",
  ),
  "/tmp/not-a-cert.txt": Buffer.from("just some notes about the key\n"),
};

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn(async (path: unknown, ...rest: unknown[]) => {
      const key = String(path);
      if (key in FILES) return FILES[key];
      return (actual.readFile as unknown as (...a: unknown[]) => Promise<Buffer>)(path, ...rest);
    }),
  };
});

async function runCli(...args: string[]): Promise<void> {
  const argv = ["node", "gpc", ...args];
  const origArgv = process.argv;
  process.argv = argv;
  try {
    const { createProgram } = await import("../src/program.js");
    const program = await createProgram();
    await program.parseAsync(argv);
  } finally {
    process.argv = origArgv;
  }
}

const b64 = (path: string): string => (FILES[path] as Buffer).toString("base64");

describe("gpc app-signing", () => {
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    logs = [];
    errors = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => {
      logs.push(a.join(" "));
    });
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => {
      errors.push(a.join(" "));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  describe("enroll", () => {
    it("sends enrollExistingApp with the Cloud KMS key", async () => {
      await runCli(
        "app-signing",
        "enroll",
        "--existing-app",
        "--kms-key",
        "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1",
        "--yes",
        "--output",
        "json",
      );

      expect(enroll).toHaveBeenCalledWith("com.example.app", {
        enrollExistingApp: {
          cloudKmsKey: {
            cryptoKeyVersionResource:
              "projects/p/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1",
          },
        },
      });
      expect(logs.join("\n")).toContain("signingCertificate");
    });

    it("sends enrollNewApp with a base64-encoded certificate and upload certificate", async () => {
      await runCli(
        "app-signing",
        "enroll",
        "--new-app",
        "--kms-key",
        "kms/key/1",
        "--cert",
        "/tmp/signing.pem",
        "--upload-cert",
        "/tmp/upload.pem",
        "--yes",
      );

      expect(enroll).toHaveBeenCalledWith("com.example.app", {
        enrollNewApp: {
          cloudKmsKeyAndCert: {
            cloudKmsKey: { cryptoKeyVersionResource: "kms/key/1" },
            pemCertificate: b64("/tmp/signing.pem"),
          },
        },
        pemUploadCertificate: b64("/tmp/upload.pem"),
      });
    });

    it("warns that standard Play App Signing must be done in Play Console", async () => {
      await runCli("app-signing", "enroll", "--existing-app", "--kms-key", "kms/key/1", "--yes");

      const text = errors.join("\n");
      expect(text).toContain("self-hosted Google Cloud KMS keys only");
      expect(text).toContain("Play Console");
      expect(text).toContain("9842756");
    });

    it("asks for confirmation before enrolling", async () => {
      await runCli("app-signing", "enroll", "--existing-app", "--kms-key", "kms/key/1");
      expect(requireConfirm).toHaveBeenCalled();
    });

    it("rejects --new-app together with --existing-app", async () => {
      await expect(
        runCli("app-signing", "enroll", "--new-app", "--existing-app", "--kms-key", "k"),
      ).rejects.toMatchObject({ code: "USAGE_ERROR", exitCode: 2 });
      expect(enroll).not.toHaveBeenCalled();
    });

    it("requires one of --new-app or --existing-app", async () => {
      await expect(runCli("app-signing", "enroll", "--kms-key", "k")).rejects.toMatchObject({
        code: "USAGE_ERROR",
        exitCode: 2,
      });
      expect(enroll).not.toHaveBeenCalled();
    });

    it("requires --cert with --new-app", async () => {
      await expect(
        runCli("app-signing", "enroll", "--new-app", "--kms-key", "k"),
      ).rejects.toMatchObject({
        code: "USAGE_ERROR",
        suggestion: expect.stringContaining("certificate"),
      });
      expect(enroll).not.toHaveBeenCalled();
    });

    it("rejects an empty certificate file", async () => {
      await expect(
        runCli("app-signing", "enroll", "--new-app", "--kms-key", "k", "--cert", "/tmp/empty.pem"),
      ).rejects.toMatchObject({ code: "USAGE_ERROR" });
      expect(enroll).not.toHaveBeenCalled();
    });

    it("refuses a private key passed to --cert", async () => {
      await expect(
        runCli(
          "app-signing",
          "enroll",
          "--new-app",
          "--kms-key",
          "k",
          "--cert",
          "/tmp/private-key.pem",
        ),
      ).rejects.toMatchObject({
        code: "USAGE_ERROR",
        exitCode: 2,
        suggestion: expect.stringContaining("private key"),
      });
      expect(enroll).not.toHaveBeenCalled();
    });

    it("refuses a private key passed to --upload-cert", async () => {
      await expect(
        runCli(
          "app-signing",
          "enroll",
          "--existing-app",
          "--kms-key",
          "k",
          "--upload-cert",
          "/tmp/private-key.pem",
        ),
      ).rejects.toMatchObject({
        code: "USAGE_ERROR",
        exitCode: 2,
        suggestion: expect.stringContaining("private key"),
      });
      expect(enroll).not.toHaveBeenCalled();
    });

    it("refuses a file that is not a PEM certificate", async () => {
      await expect(
        runCli(
          "app-signing",
          "enroll",
          "--new-app",
          "--kms-key",
          "k",
          "--cert",
          "/tmp/not-a-cert.txt",
        ),
      ).rejects.toMatchObject({ code: "USAGE_ERROR", exitCode: 2 });
      expect(enroll).not.toHaveBeenCalled();
    });

    it("does not read certificate files on --dry-run", async () => {
      await runCli(
        "app-signing",
        "enroll",
        "--new-app",
        "--kms-key",
        "kms/key/1",
        "--cert",
        "/tmp/private-key.pem",
        "--dry-run",
        "--output",
        "json",
      );

      expect(enroll).not.toHaveBeenCalled();
      expect(logs.join("\n")).toContain("dryRun");
    });

    it("--dry-run previews without calling the API", async () => {
      await runCli(
        "app-signing",
        "enroll",
        "--existing-app",
        "--kms-key",
        "kms/key/1",
        "--dry-run",
        "--output",
        "json",
      );

      expect(enroll).not.toHaveBeenCalled();
      expect(logs.join("\n")).toContain("dryRun");
    });
  });

  describe("rotate", () => {
    it("sends the rotation reason, new key, certificate and lineage", async () => {
      await runCli(
        "app-signing",
        "rotate",
        "--kms-key",
        "kms/key/2",
        "--cert",
        "/tmp/signing.pem",
        "--lineage",
        "/tmp/lineage.bin",
        "--reason",
        "COMPROMISED_KEY",
        "--yes",
        "--output",
        "json",
      );

      expect(rotateKey).toHaveBeenCalledWith("com.example.app", {
        keyRotationReason: "COMPROMISED_KEY",
        rotatedCloudKmsKey: {
          cloudKmsKeyAndCert: {
            cloudKmsKey: { cryptoKeyVersionResource: "kms/key/2" },
            pemCertificate: b64("/tmp/signing.pem"),
          },
          signingCertificateLineage: b64("/tmp/lineage.bin"),
        },
      });
      expect(logs.join("\n")).toContain("rotatedKeyCertificate");
    });

    it("normalizes a lowercase reason", async () => {
      await runCli(
        "app-signing",
        "rotate",
        "--kms-key",
        "kms/key/2",
        "--cert",
        "/tmp/signing.pem",
        "--lineage",
        "/tmp/lineage.bin",
        "--reason",
        "routine-key-upgrade",
        "--yes",
      );

      expect(rotateKey).toHaveBeenCalledWith(
        "com.example.app",
        expect.objectContaining({ keyRotationReason: "ROUTINE_KEY_UPGRADE" }),
      );
    });

    it("refuses a private key passed to --lineage", async () => {
      await expect(
        runCli(
          "app-signing",
          "rotate",
          "--kms-key",
          "kms/key/2",
          "--cert",
          "/tmp/signing.pem",
          "--lineage",
          "/tmp/private-key.pem",
          "--reason",
          "COMPROMISED_KEY",
          "--yes",
        ),
      ).rejects.toMatchObject({
        code: "USAGE_ERROR",
        exitCode: 2,
        suggestion: expect.stringContaining("private key"),
      });
      expect(rotateKey).not.toHaveBeenCalled();
    });

    it("rejects an unknown reason", async () => {
      await expect(
        runCli(
          "app-signing",
          "rotate",
          "--kms-key",
          "kms/key/2",
          "--cert",
          "/tmp/signing.pem",
          "--lineage",
          "/tmp/lineage.bin",
          "--reason",
          "BECAUSE",
        ),
      ).rejects.toMatchObject({ code: "USAGE_ERROR", exitCode: 2 });
      expect(rotateKey).not.toHaveBeenCalled();
    });

    it("rejects KEY_ROTATION_REASON_UNSPECIFIED, which Google forbids", async () => {
      await expect(
        runCli(
          "app-signing",
          "rotate",
          "--kms-key",
          "kms/key/2",
          "--cert",
          "/tmp/signing.pem",
          "--lineage",
          "/tmp/lineage.bin",
          "--reason",
          "KEY_ROTATION_REASON_UNSPECIFIED",
        ),
      ).rejects.toMatchObject({ code: "USAGE_ERROR" });
      expect(rotateKey).not.toHaveBeenCalled();
    });

    it("asks for confirmation before rotating", async () => {
      await runCli(
        "app-signing",
        "rotate",
        "--kms-key",
        "kms/key/2",
        "--cert",
        "/tmp/signing.pem",
        "--lineage",
        "/tmp/lineage.bin",
        "--reason",
        "OTHER",
      );
      expect(requireConfirm).toHaveBeenCalled();
    });
  });
});
