import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock yauzl to avoid needing real ZIP files
vi.mock("yauzl", () => {
  const EventEmitter = require("node:events").EventEmitter;

  return {
    open: vi.fn(),
  };
});

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
import { open as yauzlOpen } from "yauzl";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

const mockedOpen = vi.mocked(yauzlOpen);

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
  });

  it("returns manifest and entries for a valid AAB", async () => {
    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("protobuf") },
      { fileName: "base/dex/classes.dex" },
      { fileName: "base/lib/arm64-v8a/libapp.so" },
    ]);

    mockedOpen.mockImplementation((_path, _opts, cb: any) => {
      cb(null, zipfile);
    });

    const result = await readAab("/fake/app.aab");
    expect(result.manifest.packageName).toBe("com.example.app");
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]!.path).toBe("base/manifest/AndroidManifest.xml");
  });

  it("throws when manifest is missing", async () => {
    const zipfile = createMockZipfile([{ fileName: "base/dex/classes.dex" }]);

    mockedOpen.mockImplementation((_path, _opts, cb: any) => {
      cb(null, zipfile);
    });

    await expect(readAab("/fake/app.aab")).rejects.toThrow(
      "missing base/manifest/AndroidManifest.xml",
    );
  });

  it("throws when ZIP fails to open", async () => {
    mockedOpen.mockImplementation((_path, _opts, cb: any) => {
      cb(new Error("Not a valid ZIP"));
    });

    await expect(readAab("/fake/bad.aab")).rejects.toThrow("Not a valid ZIP");
  });

  it("skips directory entries", async () => {
    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("pb") },
      { fileName: "base/dex/" }, // directory — should be skipped
      { fileName: "base/dex/classes.dex" },
    ]);

    mockedOpen.mockImplementation((_path, _opts, cb: any) => {
      cb(null, zipfile);
    });

    const result = await readAab("/fake/app.aab");
    // Directory entry should not appear in entries list
    expect(result.entries.find((e) => e.path === "base/dex/")).toBeUndefined();
    expect(result.entries.find((e) => e.path === "base/dex/classes.dex")).toBeDefined();
  });

  it("closes zipfile after reading", async () => {
    const zipfile = createMockZipfile([
      { fileName: "base/manifest/AndroidManifest.xml", data: Buffer.from("pb") },
    ]);

    mockedOpen.mockImplementation((_path, _opts, cb: any) => {
      cb(null, zipfile);
    });

    await readAab("/fake/app.aab");
    expect(zipfile.close).toHaveBeenCalled();
  });
});
