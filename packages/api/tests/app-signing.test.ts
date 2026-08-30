import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createApiClient } from "../src/client";
import { resolveBucket } from "../src/rate-limiter";
import type { EnrollAppRequest, RotateAppSigningKeyRequest } from "../src/types";

const BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const PKG = "com.example.app";
const KMS_KEY =
  "projects/acme/locations/global/keyRings/play/cryptoKeys/signing/cryptoKeyVersions/1";

function mockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockAuth() {
  return { getAccessToken: vi.fn().mockResolvedValue("test-token") };
}

describe("appSigning (self-hosted Cloud KMS)", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeClient() {
    return createApiClient({ auth: mockAuth(), maxRetries: 0 });
  }

  it("enroll POSTs to appSigning:enrollApp with the enrollNewApp body", async () => {
    const response = {
      signingCertificate: { certificateHashSha256: "AA:BB" },
      uploadCertificate: { certificateHashSha256: "CC:DD" },
    };
    mockFetch.mockResolvedValueOnce(mockResponse(response));

    const request: EnrollAppRequest = {
      enrollNewApp: {
        cloudKmsKeyAndCert: {
          cloudKmsKey: { cryptoKeyVersionResource: KMS_KEY },
          pemCertificate: "cGVt",
        },
      },
      pemUploadCertificate: "dXBsb2Fk",
    };

    const result = await makeClient().appSigning.enroll(PKG, request);

    expect(result).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/appSigning:enrollApp`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it("enroll sends enrollExistingApp when that oneof branch is used", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ signingCertificate: { certificateHashSha1: "11:22" } }),
    );

    await makeClient().appSigning.enroll(PKG, {
      enrollExistingApp: { cloudKmsKey: { cryptoKeyVersionResource: KMS_KEY } },
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      enrollExistingApp: { cloudKmsKey: { cryptoKeyVersionResource: KMS_KEY } },
    });
  });

  it("enroll percent-encodes the package name in the path", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ signingCertificate: {} }));

    await makeClient().appSigning.enroll("com.example/evil", {
      enrollExistingApp: { cloudKmsKey: { cryptoKeyVersionResource: KMS_KEY } },
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/com.example%2Fevil/appSigning:enrollApp`);
  });

  it("rotateKey POSTs to appSigning:rotateAppSigningKey with reason and rotated key", async () => {
    const response = { rotatedKeyCertificate: { certificateHashSha256: "EE:FF" } };
    mockFetch.mockResolvedValueOnce(mockResponse(response));

    const request: RotateAppSigningKeyRequest = {
      keyRotationReason: "COMPROMISED_KEY",
      rotatedCloudKmsKey: {
        cloudKmsKeyAndCert: {
          cloudKmsKey: { cryptoKeyVersionResource: KMS_KEY },
          pemCertificate: "cGVt",
        },
        signingCertificateLineage: "bGluZWFnZQ==",
      },
    };

    const result = await makeClient().appSigning.rotateKey(PKG, request);

    expect(result).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/${PKG}/appSigning:rotateAppSigningKey`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it("appSigning paths resolve to the default rate-limit bucket", () => {
    expect(resolveBucket(`/${PKG}/appSigning:enrollApp`)).toBe("default");
    expect(resolveBucket(`/${PKG}/appSigning:rotateAppSigningKey`)).toBe("default");
  });

  it("exposes enroll and rotateKey as functions (coverage guard)", () => {
    const client = createApiClient({ accessToken: "fake", baseUrl: "https://fake.example.com" });
    expect(typeof client.appSigning.enroll).toBe("function");
    expect(typeof client.appSigning.rotateKey).toBe("function");
  });
});
