import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock yauzl to avoid needing real ZIP files. The reader uses fromBuffer
// (no file descriptor) so the standalone binary and Node behave the same (#89).
vi.mock("yauzl", () => ({
  fromBuffer: vi.fn(),
}));

// Mock the file read so tests do not need a real file on disk.
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-aab-bytes")),
}));

// Mock manifest parser
vi.mock("../src/preflight/manifest-parser.js", () => ({
  decodeManifest: vi.fn().mockReturnValue({
    packageName: "com.example.app",
    versionCode: 1,
    versionName: "1.0",
    minSdk: 24,
    targetSdk: 35,
    debuggable: false,
    testOnly: false,
    usesCleartextTraffic: false,
    extractNativeLibs: true,
    permissions: [],
    features: [],
    activities: [],
    services: [],
    receivers: [],
    providers: [],
  }),
}));

import { readAab } from "../src/preflight/aab-reader";
import { decodeManifest } from "../src/preflight/manifest-parser";
import { fromBuffer as yauzlFromBuffer } from "yauzl";
import { readFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

const mockedFromBuffer = vi.mocked(yauzlFromBuffer);
const mockedDecodeManifest = vi.mocked(decodeManifest);
const mockedReadFile = vi.mocked(readFile);

function createMockZipfile(entries: Array<{ fileName: string; data?: Buffer }>) {
  const emitter = new EventEmitter() as EventEmitter & {
    readEntry: () => void;
    openReadStream: (entry: unknown, cb: (err: Error | null, stream?: Readable) => void) => void;
    close: () => void;
    entryCount: number;
  };

  let idx = 0;
  const entryList = entries.map((e) => ({
    fileName: e.fileName,
    compressedSize: e.data?.length ?? 100,
    uncompressedSize: e.data?.length ?? 200,
  }));

  emitter.entryCount = entries.length;
  emitter.close = vi.fn();

  emitter.readEntry = () => {
    if (idx < entryList.length) {
      const entry = entryList[idx]!;
      idx++;
      process.nextTick(() => emitter.emit("entry", entry));
    } else {
      process.nextTick(() => emitter.emit("end"));
    }
  };

  emitter.openReadStream = (
    _entry: unknown,
    cb: (err: Error | null, stream?: Readable) => void,
  ) => {
    const e = entries[idx - 1];
    const stream = new Readable({
      read() {
        this.push(e?.data ?? Buffer.from("mock"));
        this.push(null);
      },
    });
    cb(null, stream);
  };

  return emitter;
}

describe("readAab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default: readFile resolves to a buffer unless a test overrides it.
    mockedReadFile.mockResolvedValue(Buffer.from("fake-aab-bytes"));
  });

  it("returns manifest and entries for a valid AAB", async () => {
    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("protobuf") },
      { fileName: "base/dex/classes.dex" },
      { fileName: "base/lib/arm64-v8a/libapp.so" },
    ]);

    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => {
      cb(null, zipfile);
    });

    const result = await readAab("/fake/app.aab");
    expect(result.manifest.packageName).toBe("com.example.app");
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]!.path).toBe("base/manifest/AndroidManifest.xml");
  });

  it("reads the archive into a buffer (no file-descriptor path, #89)", async () => {
    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("pb") },
    ]);
    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => cb(null, zipfile));

    await readAab("/fake/app.aab");
    expect(mockedReadFile).toHaveBeenCalledWith("/fake/app.aab");
    // The buffer from readFile is what gets parsed — not a path/fd.
    expect(mockedFromBuffer.mock.calls[0]![0]).toBeInstanceOf(Buffer);
  });

  it("throws when manifest is missing", async () => {
    const zipfile = createMockZipfile([{ fileName: "base/dex/classes.dex" }]);

    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => {
      cb(null, zipfile);
    });

    await expect(readAab("/fake/app.aab")).rejects.toThrow(
      "missing base/manifest/AndroidManifest.xml",
    );
  });

  it("throws when ZIP fails to open", async () => {
    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => {
      cb(new Error("Not a valid ZIP"));
    });

    await expect(readAab("/fake/bad.aab")).rejects.toThrow("Not a valid ZIP");
  });

  it("rejects (does not hang) when the zipfile emits an error mid-scan (#89)", async () => {
    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("pb") },
    ]);
    // Instead of streaming entries, emit an error — the old code could leave the
    // promise unsettled and the process hanging. It must now reject.
    zipfile.readEntry = () => {
      process.nextTick(() => zipfile.emit("error", new Error("corrupt central directory")));
    };

    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => cb(null, zipfile));

    await expect(readAab("/fake/corrupt.aab")).rejects.toThrow("corrupt central directory");
    expect(zipfile.close).toHaveBeenCalled();
  });

  it("rejects with a clear message when the file cannot be read", async () => {
    mockedReadFile.mockRejectedValue(
      Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" }),
    );

    await expect(readAab("/does/not/exist.aab")).rejects.toThrow(
      "Could not read /does/not/exist.aab",
    );
    // Never even reached the ZIP layer.
    expect(mockedFromBuffer).not.toHaveBeenCalled();
  });

  it("skips directory entries", async () => {
    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("pb") },
      { fileName: "base/dex/" }, // directory — should be skipped
      { fileName: "base/dex/classes.dex" },
    ]);

    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => {
      cb(null, zipfile);
    });

    const result = await readAab("/fake/app.aab");
    // Directory entry should not appear in entries list
    expect(result.entries.find((e) => e.path === "base/dex/")).toBeUndefined();
    expect(result.entries.find((e) => e.path === "base/dex/classes.dex")).toBeDefined();
  });

  it("returns fallback manifest when decodeManifest throws any error (Bug AB regression)", async () => {
    // Simulate the "protobuf.Root is not a constructor" error
    mockedDecodeManifest.mockImplementation(() => {
      throw new TypeError("protobuf.Root is not a constructor");
    });

    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("bad-protobuf") },
      { fileName: "base/dex/classes.dex" },
    ]);

    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => {
      cb(null, zipfile);
    });

    const result = await readAab("/fake/app.aab");
    // Should not throw — should fall back to empty manifest with _parseError
    expect(result.manifest._parseError).toContain("protobuf.Root is not a constructor");
    expect(result.manifest.packageName).toBe("");
    expect(result.entries).toHaveLength(2);
  });

  it("returns fallback manifest when decodeManifest throws index out of range", async () => {
    mockedDecodeManifest.mockImplementation(() => {
      throw new RangeError("index out of range: 64934 + 10 > 64934");
    });

    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("large-pb") },
    ]);

    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => {
      cb(null, zipfile);
    });

    const result = await readAab("/fake/app.aab");
    expect(result.manifest._parseError).toContain("index out of range");
  });

  it("closes zipfile after reading", async () => {
    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("pb") },
    ]);

    mockedFromBuffer.mockImplementation((_buf: any, _opts: any, cb: any) => {
      cb(null, zipfile);
    });

    await readAab("/fake/app.aab");
    expect(zipfile.close).toHaveBeenCalled();
  });
});
