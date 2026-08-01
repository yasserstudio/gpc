import { describe, it, expect } from "vitest";
import { gzipSync, deflateRawSync } from "node:zlib";
import {
  isGzip,
  isZip,
  gunzipIfNeeded,
  decodeCsvText,
  decodeStatsCsv,
  extractCsvEntriesFromZip,
} from "../src/reports/decode.js";
import {
  reportAccessDeniedError,
  reportBucketNotFoundError,
  reportObjectNotFoundError,
} from "../src/reports/errors.js";

// UTF-16LE bytes with BOM, matching how Play encodes stats CSVs.
function utf16leWithBom(s: string): Buffer {
  const body = Buffer.from(s, "utf16le");
  return Buffer.concat([Buffer.from([0xff, 0xfe]), body]);
}

// Minimal ZIP archive with stored (uncompressed) entries — enough for yauzl to read.
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
    local.writeUInt16LE(0, 8); // stored, no compression
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

describe("report decode helpers", () => {
  it("detects gzip and zip magic bytes", () => {
    expect(isGzip(gzipSync(Buffer.from("x")))).toBe(true);
    expect(isGzip(Buffer.from("plain"))).toBe(false);
    expect(isZip(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(isZip(Buffer.from("plain"))).toBe(false);
  });

  it("gunzipIfNeeded inflates gzip and passes through plain bytes", () => {
    const plain = Buffer.from("Date,Installs\n2026-06-01,10\n");
    expect(gunzipIfNeeded(gzipSync(plain)).toString()).toBe(plain.toString());
    expect(gunzipIfNeeded(plain).toString()).toBe(plain.toString());
  });

  it("decodeCsvText decodes UTF-16LE with BOM", () => {
    const text = "Date,Installs\n2026-06-01,42\n";
    expect(decodeCsvText(utf16leWithBom(text))).toBe(text);
  });

  it("decodeCsvText strips a UTF-8 BOM", () => {
    const text = "a,b\n1,2\n";
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]);
    expect(decodeCsvText(withBom)).toBe(text);
  });

  it("decodeCsvText decodes UTF-16BE with BOM", () => {
    const text = "hi,there\n";
    const le = Buffer.from(text, "utf16le");
    const be = Buffer.from(le);
    be.swap16();
    const withBom = Buffer.concat([Buffer.from([0xfe, 0xff]), be]);
    expect(decodeCsvText(withBom)).toBe(text);
  });

  it("decodeStatsCsv handles the real shape: gzipped UTF-16LE", () => {
    const text = "Date,Package Name,Daily Device Installs\n2026-06-01,com.example.app,7\n";
    const gzipped = gzipSync(utf16leWithBom(text));
    expect(decodeStatsCsv(gzipped)).toBe(text);
  });

  it("extractCsvEntriesFromZip returns decoded CSV entries only", async () => {
    const zip = makeZip([
      { name: "PlayApps_202606_ES.csv", content: utf16leWithBom("Order,Amount\n1,9.99\n") },
      { name: "readme.txt", content: Buffer.from("ignore me") },
    ]);
    const entries = await extractCsvEntriesFromZip(zip);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("PlayApps_202606_ES.csv");
    expect(entries[0].text).toBe("Order,Amount\n1,9.99\n");
  });

  it("extractCsvEntriesFromZip rejects a corrupt archive", async () => {
    await expect(extractCsvEntriesFromZip(deflateRawSync(Buffer.from("not a zip")))).rejects.toThrow();
  });
});

describe("report error factories", () => {
  it("access-denied carries code, exit 4, and a grant hint", () => {
    const e = reportAccessDeniedError("pubsite_prod_123");
    expect(e.code).toBe("REPORT_ACCESS_DENIED");
    expect(e.exitCode).toBe(4);
    expect(e.suggestion).toMatch(/download bulk reports/i);
    expect(e.message).toContain("pubsite_prod_123");
  });

  it("bucket-not-found points at the exact-URI override", () => {
    const e = reportBucketNotFoundError("pubsite_prod_x");
    expect(e.code).toBe("REPORT_BUCKET_NOT_FOUND");
    expect(e.exitCode).toBe(4);
    expect(e.suggestion).toMatch(/--bucket|reports\.bucket/);
  });

  it("object-not-found lists available dimensions when known", () => {
    const e = reportObjectNotFoundError({
      reportType: "installs",
      month: "2026-06",
      dimension: "carrier",
      available: ["overview", "country"],
    });
    expect(e.code).toBe("REPORT_OBJECT_NOT_FOUND");
    expect(e.suggestion).toContain("overview, country");
    expect(e.message).toContain("carrier");
  });
});
