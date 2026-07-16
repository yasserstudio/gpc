// Named exports only. No default export.

import { readFile } from "node:fs/promises";
import { fromBuffer, type Entry, type ZipFile } from "yauzl";
import type { ParsedManifest, ZipEntryInfo, EntryHeaderMap } from "./types.js";
import { decodeManifest } from "./manifest-parser.js";

const AAB_MANIFEST_PATH = "base/manifest/AndroidManifest.xml";
const APK_MANIFEST_PATH = "AndroidManifest.xml";
const SO_HEADER_BYTES = 4096;
const SO_PATH_RE = /(?:^|\/)lib\/[^/]+\/[^/]+\.so$/;

// Safety backstop. An offline scan of an in-memory buffer completes in well
// under a second; if the ZIP layer ever wedges we reject rather than hang the
// CLI forever (issue #89). The timer is intentionally left ref'd so it can
// actually fire on a wedged read (a buffer-backed scan has no other pending
// handle, so an unref'd timer would let the process exit before rejecting); it
// is cleared on every settle path so it never delays normal completion.
const SCAN_TIMEOUT_MS = 60_000;

interface AabContents {
  manifest: ParsedManifest;
  entries: ZipEntryInfo[];
  nativeLibHeaders: EntryHeaderMap;
}

function detectManifestPath(filePath: string): string {
  return filePath.toLowerCase().endsWith(".apk") ? APK_MANIFEST_PATH : AAB_MANIFEST_PATH;
}

/**
 * Open an AAB or APK file, extract the manifest and ZIP entry list.
 *
 * Reads the archive into memory and parses with yauzl's `fromBuffer`. This
 * deliberately avoids the file-descriptor path (`yauzl.open`): the standalone
 * binary (compiled with Bun) hands yauzl's fd-slicer a null descriptor, which
 * crashed the offline scanner with `self2.context.fd` and then hung because the
 * open handle kept the event loop alive (issue #89). A buffer-backed reader
 * behaves identically on Node and the standalone binary.
 */
export async function readAab(aabPath: string): Promise<AabContents> {
  const manifestPath = detectManifestPath(aabPath);

  let buffer: Buffer;
  try {
    buffer = await readFile(aabPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not read ${aabPath}: ${msg}`, { cause: err });
  }

  const { zipfile, entries, manifestBuf, soHeaders } = await openAndScan(buffer, manifestPath);
  zipfile.close();

  if (!manifestBuf) {
    const fileType = aabPath.toLowerCase().endsWith(".apk") ? "APK" : "AAB";
    throw new Error(
      `${fileType} is missing ${manifestPath}. This does not appear to be a valid Android ${fileType === "APK" ? "application package" : "App Bundle"}.`,
    );
  }

  let manifest: ParsedManifest;
  try {
    manifest = decodeManifest(manifestBuf);
  } catch (err) {
    // Some AABs have manifests that protobufjs cannot fully parse
    // (e.g., larger bundles with complex resource tables, ESM/CJS interop issues).
    // Fall back to a minimal manifest so non-manifest scanners can still run.
    const errMsg = err instanceof Error ? err.message : String(err);
    manifest = createFallbackManifest();
    manifest._parseError = `Manifest could not be fully parsed: ${errMsg}. Manifest-dependent checks will be skipped.`;
  }

  return { manifest, entries, nativeLibHeaders: soHeaders };
}

function createFallbackManifest(): ParsedManifest {
  return {
    packageName: "",
    versionCode: 0,
    versionName: "",
    minSdk: 0,
    targetSdk: 0,
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
  };
}

/**
 * Parse ZIP from an in-memory buffer, iterate entries, collect entry list and
 * manifest buffer. yauzl's lazyEntries mode ensures we control iteration — the
 * "end" event only fires after the last readEntry() call with no more entries.
 *
 * The returned promise is guaranteed to settle exactly once: every error path
 * routes through `settleReject`, and a bounded timeout is a final backstop so a
 * wedged read can never hang the caller (issue #89).
 */
function openAndScan(
  buffer: Buffer,
  manifestPath: string = AAB_MANIFEST_PATH,
): Promise<{
  zipfile: ZipFile;
  entries: ZipEntryInfo[];
  manifestBuf: Buffer | null;
  soHeaders: EntryHeaderMap;
}> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Timed out reading the archive. The file may be corrupt or truncated."));
      }
    }, SCAN_TIMEOUT_MS);

    function settleResolve(value: {
      zipfile: ZipFile;
      entries: ZipEntryInfo[];
      manifestBuf: Buffer | null;
      soHeaders: EntryHeaderMap;
    }): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }

    function settleReject(error: Error): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    }

    try {
      fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) {
          settleReject(err ?? new Error("Failed to open AAB file"));
          return;
        }

        const entries: ZipEntryInfo[] = [];
        const soHeaders: EntryHeaderMap = new Map();
        let manifestBuf: Buffer | null = null;
        let pendingStreams = 0;
        let entrysDone = false;

        function fail(error: Error): void {
          if (settled) return;
          try {
            zipfile.close();
          } catch {
            // best-effort close; the reject below is what matters
          }
          settleReject(error);
        }

        function maybeResolve(): void {
          if (!settled && entrysDone && pendingStreams === 0) {
            settleResolve({ zipfile, entries, manifestBuf, soHeaders });
          }
        }

        function readEntryStream(
          entry: Entry,
          onData: (buf: Buffer) => void,
          maxBytes?: number,
        ): void {
          pendingStreams++;
          zipfile.openReadStream(entry, (streamErr, stream) => {
            if (streamErr || !stream) {
              fail(streamErr ?? new Error(`Failed to read ${entry.fileName}`));
              return;
            }
            const chunks: Buffer[] = [];
            let totalBytes = 0;
            let done = false;
            stream.on("data", (chunk: Buffer) => {
              chunks.push(chunk);
              totalBytes += chunk.length;
              if (maxBytes && totalBytes >= maxBytes) {
                stream.destroy(); // stop decompressing early
              }
            });
            stream.on("error", (e: Error) => {
              // stream.destroy() may emit an error on some Node versions; ignore it
              if (maxBytes && totalBytes >= maxBytes) return;
              fail(e);
            });
            const finish = () => {
              if (done) return;
              done = true;
              const buf = Buffer.concat(chunks);
              onData(maxBytes ? buf.subarray(0, maxBytes) : buf);
              pendingStreams--;
              maybeResolve();
            };
            stream.on("end", finish);
            stream.on("close", () => {
              // close fires after destroy(); end may not fire
              if (totalBytes > 0 && maxBytes) finish();
            });
          });
        }

        zipfile.on("error", fail);

        zipfile.on("entry", (entry: Entry) => {
          if (settled) return;
          try {
            const path = entry.fileName;

            // Collect entry metadata (skip directories)
            if (!path.endsWith("/")) {
              entries.push({
                path,
                compressedSize: entry.compressedSize,
                uncompressedSize: entry.uncompressedSize,
              });
            }

            // Extract manifest content
            if (path === manifestPath) {
              readEntryStream(entry, (buf) => {
                manifestBuf = buf;
              });
            }
            // Extract first N bytes of .so files for ELF header analysis (early stream destroy)
            else if (SO_PATH_RE.test(path)) {
              readEntryStream(
                entry,
                (buf) => {
                  soHeaders.set(path, buf);
                },
                SO_HEADER_BYTES,
              );
            }

            zipfile.readEntry();
          } catch (e) {
            fail(e instanceof Error ? e : new Error(String(e)));
          }
        });

        zipfile.on("end", () => {
          entrysDone = true;
          maybeResolve();
        });

        zipfile.readEntry();
      });
    } catch (err) {
      // fromBuffer threw synchronously (e.g. malformed buffer) — never hang.
      settleReject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
