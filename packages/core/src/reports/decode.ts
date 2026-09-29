import { gunzipSync } from "node:zlib";
import { fromBuffer, type Entry, type ZipFile } from "yauzl";

/**
 * Decoding helpers for Play bulk-report objects fetched from Google Cloud Storage.
 *
 * Two format facts about these objects, both confirmed the hard way (see GH bug report):
 *  1. Stats CSVs are served gzip-compressed. Depending on how they are fetched, the bytes
 *     may or may not be transparently decompressed, so we detect the gzip magic ourselves
 *     and inflate when present rather than trusting transport-layer transcoding.
 *  2. The CSVs are UTF-16 (little-endian, with a BOM), not UTF-8.
 *
 * Financial reports are delivered as ZIP archives containing one or more CSV entries.
 *
 * Everything here is pure and synchronous except ZIP extraction (yauzl is callback-based);
 * none of it needs network access, so it is unit-testable with in-memory fixtures.
 */

const GZIP_MAGIC = [0x1f, 0x8b];
const ZIP_MAGIC = [0x50, 0x4b]; // "PK"

export function isGzip(buf: Uint8Array): boolean {
  return buf.length >= 2 && buf[0] === GZIP_MAGIC[0] && buf[1] === GZIP_MAGIC[1];
}

export function isZip(buf: Uint8Array): boolean {
  return buf.length >= 2 && buf[0] === ZIP_MAGIC[0] && buf[1] === ZIP_MAGIC[1];
}

// Ceiling on inflated report size. The largest real-world stats CSVs are tens of MB; the
// cap exists so a malicious or corrupt object cannot balloon memory (gunzipSync throws
// ERR_BUFFER_TOO_LARGE-style errors instead, which callers wrap in a typed GpcError).
const MAX_INFLATED_BYTES = 512 * 1024 * 1024;

/** Inflate the buffer if it carries the gzip magic bytes; otherwise return it unchanged. */
export function gunzipIfNeeded(buf: Buffer): Buffer {
  return isGzip(buf) ? gunzipSync(buf, { maxOutputLength: MAX_INFLATED_BYTES }) : buf;
}

/**
 * Decode report CSV bytes to a string, honoring the byte-order mark. Play stats reports are
 * UTF-16LE with a BOM; UTF-16BE and UTF-8-BOM are handled defensively, and BOM-less bytes
 * fall back to UTF-8.
 */
export function decodeCsvText(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16BE: Node has no native decoder, so swap byte order into LE first.
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return swapped.toString("utf16le");
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  return buf.toString("utf8");
}

/**
 * Decode a single stats report object: inflate if gzipped, then decode UTF-16/UTF-8 to text.
 * This is the common path for `stats/**` objects (installs, crashes, ratings, ...).
 */
export function decodeStatsCsv(buf: Buffer): string {
  return decodeCsvText(gunzipIfNeeded(buf));
}

export interface ZipCsvEntry {
  name: string;
  text: string;
}

const ZIP_READ_TIMEOUT_MS = 30_000;
/** Financial report archives hold one CSV or a handful; anything far past that is hostile. */
const MAX_CSV_ENTRIES = 64;

export interface ExtractCsvEntriesOptions {
  /** Ceiling on the inflated size of a single CSV entry. Defaults to MAX_INFLATED_BYTES. */
  maxEntryBytes?: number;
  /** Ceiling on the decoded text of all entries combined. Defaults to MAX_INFLATED_BYTES. */
  maxTotalBytes?: number;
}

/**
 * Extract the CSV entries from a financial report ZIP archive, returned as decoded text.
 * Uses yauzl's `fromBuffer` (no file descriptor) so it behaves identically under the
 * Bun-compiled standalone binary, and is bounded by a timeout so a corrupt archive can
 * never hang the process (same hardening as the preflight AAB reader).
 *
 * Each entry is also bounded by `maxEntryBytes`: a ZIP entry's declared sizes are
 * attacker-controlled, so a small archive can otherwise inflate to gigabytes of buffers
 * (a 408 KB archive reached 1.35 GB RSS before this cap).
 */
export function extractCsvEntriesFromZip(
  buffer: Buffer,
  options: ExtractCsvEntriesOptions = {},
): Promise<ZipCsvEntry[]> {
  const maxEntryBytes = options.maxEntryBytes ?? MAX_INFLATED_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? MAX_INFLATED_BYTES;
  return new Promise<ZipCsvEntry[]>((resolve, reject) => {
    let settled = false;
    // Left ref'd on purpose: a buffer-backed read has no other pending handle, so an
    // unref'd timer would let the process exit before the rejection lands (same reasoning
    // as the preflight AAB reader). Every settle path clears it.
    const timer = setTimeout(() => {
      settleReject(new Error("Timed out reading report archive"));
    }, ZIP_READ_TIMEOUT_MS);

    function settleResolve(v: ZipCsvEntry[]): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    }
    function settleReject(e: Error): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    }

    try {
      fromBuffer(buffer, { lazyEntries: true }, (err, openedZip?: ZipFile) => {
        if (err || !openedZip) {
          settleReject(err ?? new Error("Failed to open report archive"));
          return;
        }
        const zipfile = openedZip;
        const entries: ZipCsvEntry[] = [];
        let pending = 0;
        let entriesDone = false;
        let csvEntries = 0;
        let totalBytes = 0;

        function fail(e: Error): void {
          try {
            zipfile.close();
          } catch {
            // best-effort close; the reject is what matters
          }
          settleReject(e);
        }
        function maybeResolve(): void {
          if (!settled && entriesDone && pending === 0) settleResolve(entries);
        }

        zipfile.on("entry", (entry: Entry) => {
          if (/\/$/.test(entry.fileName) || !/\.csv$/i.test(entry.fileName)) {
            zipfile.readEntry();
            return;
          }
          if (++csvEntries > MAX_CSV_ENTRIES) {
            fail(new Error(`Report archive holds more than ${MAX_CSV_ENTRIES} CSV entries`));
            return;
          }
          pending++;
          zipfile.openReadStream(entry, (streamErr, stream) => {
            if (streamErr || !stream) {
              fail(streamErr ?? new Error(`Failed to read ${entry.fileName}`));
              return;
            }
            const chunks: Buffer[] = [];
            let read = 0;
            stream.on("data", (c: Buffer) => {
              read += c.length;
              if (read > maxEntryBytes) {
                stream.destroy();
                fail(
                  new Error(
                    `Entry "${entry.fileName}" exceeds the ${maxEntryBytes}-byte limit for a report CSV`,
                  ),
                );
                return;
              }
              chunks.push(c);
            });
            stream.on("error", fail);
            stream.on("end", () => {
              // decodeStatsCsv can throw (corrupt gzip, ERR_BUFFER_TOO_LARGE). Inside a
              // stream listener that would escape as an uncaught exception and leave the
              // promise pending, so route it to the reject path instead.
              let text: string;
              try {
                text = decodeStatsCsv(Buffer.concat(chunks));
              } catch (e) {
                fail(e instanceof Error ? e : new Error(String(e)));
                return;
              }
              // The per-entry cap alone lets many entries under it add up to gigabytes.
              totalBytes += text.length;
              if (totalBytes > maxTotalBytes) {
                fail(new Error(`Report archive exceeds the ${maxTotalBytes}-byte total limit`));
                return;
              }
              entries.push({ name: entry.fileName, text });
              pending--;
              zipfile.readEntry();
              maybeResolve();
            });
          });
        });
        zipfile.on("end", () => {
          entriesDone = true;
          maybeResolve();
        });
        zipfile.on("error", fail);
        zipfile.readEntry();
      });
    } catch (e) {
      settleReject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
