// Named exports only. No default export.

import { open as yauzlOpen, type Entry, type ZipFile } from "yauzl";
import type { ParsedManifest, ZipEntryInfo } from "./types.js";
import { decodeManifest } from "./manifest-parser.js";

const MANIFEST_PATH = "base/manifest/AndroidManifest.xml";

interface AabContents {
  manifest: ParsedManifest;
  entries: ZipEntryInfo[];
}

/**
 * Open an AAB file, extract the manifest and ZIP entry list.
 * Uses yauzl for streaming — does not load the entire file into memory.
 */
export async function readAab(aabPath: string): Promise<AabContents> {
  const { zipfile, entries, manifestBuf } = await openAndScan(aabPath);
  zipfile.close();

  if (!manifestBuf) {
    throw new Error(
      `AAB is missing ${MANIFEST_PATH}. This does not appear to be a valid Android App Bundle.`,
    );
  }

  let manifest: ParsedManifest;
  try {
    manifest = decodeManifest(manifestBuf);
  } catch (err) {
    // Some AABs have manifests that protobufjs cannot fully parse
    // (e.g., larger bundles with complex resource tables).
    // Fall back to a minimal manifest so non-manifest scanners can still run.
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("index out of range") || errMsg.includes("invalid wire type")) {
      manifest = createFallbackManifest();
      manifest._parseError = `Manifest could not be fully parsed: ${errMsg}. Manifest-dependent checks will be skipped.`;
    } else {
      throw err;
    }
  }

  return { manifest, entries };
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
): Promise<{ zipfile: ZipFile; entries: ZipEntryInfo[]; manifestBuf: Buffer | null }> {
  return new Promise((resolve, reject) => {
    yauzlOpen(aabPath, { lazyEntries: true, autoClose: false }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error("Failed to open AAB file"));
        return;
      }

      const entries: ZipEntryInfo[] = [];
      let manifestBuf: Buffer | null = null;
      let rejected = false;

      function fail(error: Error): void {
        if (!rejected) {
          rejected = true;
          zipfile.close();
          reject(error);
        }
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
        if (path === MANIFEST_PATH) {
          zipfile.openReadStream(entry, (streamErr, stream) => {
            if (streamErr || !stream) {
              fail(streamErr ?? new Error("Failed to read manifest entry"));
              return;
            }

            const chunks: Buffer[] = [];
            stream.on("data", (chunk: Buffer) => chunks.push(chunk));
            stream.on("error", (e: Error) => fail(e));
            stream.on("end", () => {
              manifestBuf = Buffer.concat(chunks);
              // Continue to next entry after reading the manifest stream
              zipfile.readEntry();
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        if (!rejected) {
          resolve({ zipfile, entries, manifestBuf });
        }
      });

      zipfile.readEntry();
    });
  });
}
