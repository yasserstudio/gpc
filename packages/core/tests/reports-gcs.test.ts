import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { gzipSync } from "node:zlib";
import { listReportObjects, downloadReportObject } from "../src/reports/gcs.js";
import {
  listReports,
  downloadStatsReport,
  downloadFinancialReport,
} from "../src/commands/reports.js";

const auth = { getAccessToken: async () => "test-token" };
const BUCKET = "pubsite_prod_42";

// UTF-16LE bytes with BOM, matching how Play encodes stats CSVs.
function utf16leWithBom(s: string): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(s, "utf16le")]);
}

// Minimal stored-entry ZIP (same fixture as reports-decode.test.ts).
function makeZip(files: { name: string; content: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const crcTable = (() => {
    const t: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const crc = crc32(f.content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.content.length, 18);
    local.writeUInt32LE(f.content.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, f.content);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(f.content.length, 20);
    cd.writeUInt32LE(f.content.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + f.content.length;
  }
  const centralBuf = Buffer.concat(central);
  const bodyBuf = Buffer.concat(chunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(bodyBuf.length, 16);
  return Buffer.concat([bodyBuf, centralBuf, eocd]);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function bytesResponse(status: number, body: Buffer): Response {
  return new Response(new Uint8Array(body), { status });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // Disable the retry loop so failure-path tests don't sit through backoff sleeps.
  process.env["GPC_MAX_RETRIES"] = "0";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env["GPC_MAX_RETRIES"];
});

describe("GCS reports layer", () => {
  it("listReportObjects maps items, sends auth header and query params", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        items: [
          {
            name: "stats/installs/installs_com.example_202606_overview.csv",
            size: "392",
            updated: "2026-07-01T00:00:00Z",
          },
        ],
        nextPageToken: "tok",
      }),
    );

    const result = await listReportObjects(auth, BUCKET, {
      prefix: "stats/installs/",
      maxResults: 5,
      pageToken: "prev",
    });

    expect(result.objects).toEqual([
      {
        name: "stats/installs/installs_com.example_202606_overview.csv",
        size: 392,
        updated: "2026-07-01T00:00:00Z",
      },
    ]);
    expect(result.nextPageToken).toBe("tok");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`/b/${BUCKET}/o?`);
    expect(url).toContain("prefix=stats%2Finstalls%2F");
    expect(url).toContain("maxResults=5");
    expect(url).toContain("pageToken=prev");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-token");
  });

  it("maps 403 to REPORT_ACCESS_DENIED with the Play Console grant suggestion", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: { code: 403 } }));
    await expect(listReportObjects(auth, BUCKET, { prefix: "stats/" })).rejects.toMatchObject({
      code: "REPORT_ACCESS_DENIED",
      exitCode: 4,
      suggestion: expect.stringContaining("download bulk reports"),
    });
  });

  it("maps list 404 to REPORT_BUCKET_NOT_FOUND", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: { code: 404 } }));
    await expect(listReportObjects(auth, BUCKET, { prefix: "stats/" })).rejects.toMatchObject({
      code: "REPORT_BUCKET_NOT_FOUND",
      exitCode: 4,
    });
  });

  it("maps fetch rejection to NETWORK_ERROR exit 5", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(listReportObjects(auth, BUCKET, { prefix: "stats/" })).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      exitCode: 5,
    });
  });

  it("maps 401 to REPORT_AUTH_REJECTED exit 3 (distinct from the 403 grant error)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));
    await expect(listReportObjects(auth, BUCKET, { prefix: "stats/" })).rejects.toMatchObject({
      code: "REPORT_AUTH_REJECTED",
      exitCode: 3,
    });
  });

  it("retries transient 5xx and succeeds", async () => {
    process.env["GPC_MAX_RETRIES"] = "2";
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { items: [] }));
    const result = await listReportObjects(auth, BUCKET, { prefix: "stats/" });
    expect(result.objects).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps a 200 with non-JSON body (captive portal) to NETWORK_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>login</html>", { status: 200 }));
    await expect(listReportObjects(auth, BUCKET, { prefix: "stats/" })).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      exitCode: 5,
    });
  });

  it("downloadReportObject returns bytes and maps 404 to REPORT_OBJECT_NOT_FOUND", async () => {
    fetchMock.mockResolvedValueOnce(bytesResponse(200, Buffer.from("hello")));
    const buf = await downloadReportObject(auth, BUCKET, "stats/x.csv");
    expect(buf.toString("utf8")).toBe("hello");
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain(encodeURIComponent("stats/x.csv"));
    expect(url).toContain("alt=media");

    fetchMock.mockResolvedValueOnce(jsonResponse(404, {}));
    await expect(downloadReportObject(auth, BUCKET, "stats/x.csv")).rejects.toMatchObject({
      code: "REPORT_OBJECT_NOT_FOUND",
      exitCode: 4,
    });
  });
});

describe("listReports", () => {
  it("folds the month into the prefix server-side when the package is known", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        items: [
          { name: "stats/installs/installs_com.example_202606_overview.csv", size: "2" },
          { name: "stats/installs/installs_com.example_202606_country.csv", size: "3" },
        ],
      }),
    );

    const result = await listReports(auth, BUCKET, "installs", {
      packageName: "com.example",
      month: { year: 2026, month: 6 },
    });

    // Server-side narrowing keeps pagination consistent: a month-filtered page can never
    // be empty while more pages exist.
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(decodeURIComponent(url)).toContain("prefix=stats/installs/installs_com.example_202606");
    expect(result.reports.map((r) => r.name)).toEqual([
      "stats/installs/installs_com.example_202606_overview.csv",
      "stats/installs/installs_com.example_202606_country.csv",
    ]);
  });

  it("month filter without a package uses digit boundaries (no id false positives)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        items: [
          { name: "stats/installs/installs_com.app_202605_overview.csv", size: "1" },
          { name: "stats/installs/installs_com.app_202606_overview.csv", size: "2" },
          // digit run 5202606374 contains "202606" but is not the month
          { name: "stats/installs/installs_com.app5202606374_202605_overview.csv", size: "3" },
        ],
      }),
    );

    const result = await listReports(auth, BUCKET, "installs", {
      month: { year: 2026, month: 6 },
    });
    expect(result.reports.map((r) => r.name)).toEqual([
      "stats/installs/installs_com.app_202606_overview.csv",
    ]);
  });

  it("ignores the package for financial types (account-level reports)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [] }));
    await listReports(auth, BUCKET, "earnings", { packageName: "com.example" });
    const url = decodeURIComponent(fetchMock.mock.calls[0]?.[0] as string);
    expect(url).toContain("prefix=earnings/");
    expect(url).not.toContain("com.example");
  });
});

describe("downloadStatsReport", () => {
  it("picks the requested dimension, gunzips and decodes UTF-16LE", async () => {
    const csv = "Date,Package name\n2026-06-01,com.example\n";
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [
            { name: "stats/installs/installs_com.example_202606_overview.csv", size: "1" },
            { name: "stats/installs/installs_com.example_202606_country.csv", size: "1" },
          ],
        }),
      )
      .mockResolvedValueOnce(bytesResponse(200, gzipSync(utf16leWithBom(csv))));

    const result = await downloadStatsReport(
      auth,
      BUCKET,
      "com.example",
      "installs",
      { year: 2026, month: 6 },
      "country",
    );

    expect(result.objectName).toBe("stats/installs/installs_com.example_202606_country.csv");
    expect(result.csv).toBe(csv);
  });

  it("reports available dimensions when the requested one is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        items: [
          { name: "stats/installs/installs_com.example_202606_overview.csv", size: "1" },
          { name: "stats/installs/installs_com.example_202606_country.csv", size: "1" },
        ],
      }),
    );

    await expect(
      downloadStatsReport(
        auth,
        BUCKET,
        "com.example",
        "installs",
        { year: 2026, month: 6 },
        "device",
      ),
    ).rejects.toMatchObject({
      code: "REPORT_OBJECT_NOT_FOUND",
      suggestion: expect.stringContaining("overview, country"),
    });
  });

  it("matches reviews reports without a dimension suffix", async () => {
    const csv = "Package Name,Review Text\n";
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [{ name: "reviews/reviews_com.example_202606.csv", size: "1" }],
        }),
      )
      .mockResolvedValueOnce(bytesResponse(200, utf16leWithBom(csv)));

    const result = await downloadStatsReport(
      auth,
      BUCKET,
      "com.example",
      "reviews",
      { year: 2026, month: 6 },
      "overview",
    );
    expect(result.objectName).toBe("reviews/reviews_com.example_202606.csv");
    expect(result.csv).toBe(csv);
  });
});

describe("downloadFinancialReport", () => {
  it("downloads a monthly earnings zip and extracts its CSV entries", async () => {
    const zip = makeZip([{ name: "earnings_202606.csv", content: Buffer.from("a,b\n1,2\n") }]);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [
            { name: "earnings/earnings_202605.zip", size: "1" },
            { name: "earnings/earnings_202606.zip", size: "1" },
          ],
        }),
      )
      .mockResolvedValueOnce(bytesResponse(200, zip));

    const result = await downloadFinancialReport(auth, BUCKET, "earnings", {
      year: 2026,
      month: 6,
    });

    expect(result.objectName).toBe("earnings/earnings_202606.zip");
    expect(result.kind).toBe("zip");
    if (result.kind === "zip") {
      expect(result.entries).toEqual([{ name: "earnings_202606.csv", text: "a,b\n1,2\n" }]);
    }
  });

  it("returns plain CSV objects as text", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [{ name: "play_balance/play_balance_202606.csv", size: "1" }],
        }),
      )
      .mockResolvedValueOnce(bytesResponse(200, Buffer.from("c,d\n3,4\n")));

    const result = await downloadFinancialReport(auth, BUCKET, "play_balance", {
      year: 2026,
      month: 6,
    });
    expect(result.kind).toBe("csv");
    if (result.kind === "csv") expect(result.text).toBe("c,d\n3,4\n");
  });

  it("lists available months when the requested month has no report", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        items: [
          { name: "earnings/earnings_202604.zip", size: "1" },
          { name: "earnings/earnings_202605.zip", size: "1" },
        ],
      }),
    );

    await expect(
      downloadFinancialReport(auth, BUCKET, "earnings", { year: 2026, month: 6 }),
    ).rejects.toMatchObject({
      code: "REPORT_OBJECT_NOT_FOUND",
      suggestion: expect.stringContaining("2026-04, 2026-05"),
    });
  });

  it("never matches a month token embedded in a longer digit run (merchant ids)", async () => {
    const zip = makeZip([{ name: "earnings_202606.csv", content: Buffer.from("a\n") }]);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [
            // id 5202607374 contains "202607" — must not shadow the real June archive
            { name: "earnings/earnings_202605_5202607374.zip", size: "1" },
            { name: "earnings/earnings_202606_5202607374.zip", size: "1" },
          ],
        }),
      )
      .mockResolvedValueOnce(bytesResponse(200, zip));

    const result = await downloadFinancialReport(auth, BUCKET, "earnings", {
      year: 2026,
      month: 6,
    });
    expect(result.objectName).toBe("earnings/earnings_202606_5202607374.zip");
  });

  it("skips extraction when extractEntries is false (raw archive save)", async () => {
    // Deliberately corrupt zip bytes: raw save must still succeed.
    const corrupt = Buffer.concat([Buffer.from([0x50, 0x4b]), Buffer.from("garbage")]);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { items: [{ name: "earnings/earnings_202606.zip", size: "1" }] }),
      )
      .mockResolvedValueOnce(bytesResponse(200, corrupt));

    const result = await downloadFinancialReport(
      auth,
      BUCKET,
      "earnings",
      { year: 2026, month: 6 },
      { extractEntries: false },
    );
    expect(result.kind).toBe("zip");
    if (result.kind === "zip") {
      expect(result.entries).toEqual([]);
      expect(result.raw.equals(corrupt)).toBe(true);
    }
  });

  it("wraps an unreadable archive in REPORT_ARCHIVE_UNREADABLE exit 4", async () => {
    const corrupt = Buffer.concat([Buffer.from([0x50, 0x4b]), Buffer.from("garbage")]);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { items: [{ name: "earnings/earnings_202606.zip", size: "1" }] }),
      )
      .mockResolvedValueOnce(bytesResponse(200, corrupt));

    await expect(
      downloadFinancialReport(auth, BUCKET, "earnings", { year: 2026, month: 6 }),
    ).rejects.toMatchObject({ code: "REPORT_ARCHIVE_UNREADABLE", exitCode: 4 });
  });
});
