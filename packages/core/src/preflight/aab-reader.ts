// Named exports only. No default export.

import { open as yauzlOpen, type Entry, type ZipFile } from "yauzl";
import type { ParsedManifest, ZipEntryInfo, EntryHeaderMap } from "./types.js";
import { decodeManifest } from "./manifest-parser.js";

const AAB_MANIFEST_PATH = "base/manifest/AndroidManifest.xml";
const APK_MANIFEST_PATH = "AndroidManifest.xml";
const SO_HEADER_BYTES = 256;
const SO_PATH_RE = /\/lib\/[^/]+\/[^/]+\.so$/;

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
 * Uses yauzl for streaming — does not load the entire file into memory.
 */
export async function readAab(aabPath: string): Promise<AabContents> {
  const manifestPath = detectManifestPath(aabPath);
  const { zipfile, entries, manifestBuf, soHeaders } = await openAndScan(aabPath, manifestPath);
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
 * Open ZIP, iterate entries, collect entry list and manifest buffer.
 * yauzl's lazyEntries mode ensures we control iteration — the "end" event
 * only fires after the last readEntry() call with no more entries.
 */
function openAndScan(
  aabPath: string,
  manifestPath: string = AAB_MANIFEST_PATH,
): Promise<{
  zipfile: ZipFile;
  entries: ZipEntryInfo[];
  manifestBuf: Buffer | null;
  soHeaders: EntryHeaderMap;
}> {
  return new Promise((resolve, reject) => {
    yauzlOpen(aabPath, { lazyEntries: true, autoClose: false }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error("Failed to open AAB file"));
        return;
      }

      const entries: ZipEntryInfo[] = [];
      const soHeaders: EntryHeaderMap = new Map();
      let manifestBuf: Buffer | null = null;
      let rejected = false;
      let pendingStreams = 0;
      let entrysDone = false;

      function fail(error: Error): void {
        if (!rejected) {
          rejected = true;
          zipfile.close();
          reject(error);
        }
      }

      function maybeResolve(): void {
        if (!rejected && entrysDone && pendingStreams === 0) {
          resolve({ zipfile, entries, manifestBuf, soHeaders });
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
        if (rejected) return;
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
      });

      zipfile.on("end", () => {
        entrysDone = true;
        maybeResolve();
      });

      zipfile.readEntry();
    });
  });
}
