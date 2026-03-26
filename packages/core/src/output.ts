import type { OutputFormat } from "@gpc-cli/config";
import process from "node:process";

// Minimal color helpers (no external dep, respects NO_COLOR / FORCE_COLOR)
function isColorEnabled(): boolean {
  if (process.env["NO_COLOR"] !== undefined && process.env["NO_COLOR"] !== "") return false;
  const fc = process.env["FORCE_COLOR"];
  if (fc === "1" || fc === "2" || fc === "3") return true;
  return process.stdout.isTTY ?? false;
}
function ansi(code: number, s: string): string {
  return isColorEnabled() ? `\x1b[${code}m${s}\x1b[0m` : s;
}
function bold(s: string): string {
  return ansi(1, s);
}
function dim(s: string): string {
  return ansi(2, s);
}

export function detectOutputFormat(): OutputFormat {
  return process.stdout.isTTY ? "table" : "json";
}

export function formatOutput(data: unknown, format: OutputFormat, redact = true): string {
  const safe = redact ? redactSensitive(data) : data;
  switch (format) {
    case "json":
      return formatJson(safe);
    case "yaml":
      return formatYaml(safe);
    case "markdown":
      return formatMarkdown(safe);
    case "table":
      return formatTable(safe);
    case "junit":
      return formatJunit(safe);
    default:
      return formatJson(safe);
  }
}

// ---------------------------------------------------------------------------
// Sensitive field redaction
// ---------------------------------------------------------------------------

export const SENSITIVE_KEYS = new Set([
  "private_key",
  "privateKey",
  "private_key_id",
  "privateKeyId",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "client_secret",
  "clientSecret",
  "token",
  "password",
  "secret",
  "credentials",
  "keyFile",
  "key_file",
  "serviceAccount",
  "service-account",
  "apiKey",
  "api_key",
  "auth_token",
  "bearer",
  "jwt",
  "signing_key",
  "keystore_password",
  "store_password",
  "key_password",
]);

const REDACTED = "[REDACTED]";

/** Recursively redact sensitive fields from data before output. */
export function redactSensitive(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitive(item));
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactSensitive(value);
      }
    }
    return result;
  }

  return data;
}

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function formatYaml(data: unknown, indent = 0): string {
  if (data === null || data === undefined) {
    return "null";
  }

  if (typeof data === "string") {
    return data.includes("\n")
      ? `|\n${data
          .split("\n")
          .map((l) => `${"  ".repeat(indent + 1)}${l}`)
          .join("\n")}`
      : data;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return String(data);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    return data
      .map((item) => {
        const value = formatYaml(item, indent + 1);
        const prefix = `${"  ".repeat(indent)}- `;
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          const lines = value.split("\n");
          return `${prefix}${lines[0]}\n${lines
            .slice(1)
            .map((l) => `${"  ".repeat(indent)}  ${l}`)
            .join("\n")}`;
        }
        return `${prefix}${value}`;
      })
      .join("\n");
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          return `${"  ".repeat(indent)}${key}:\n${formatYaml(value, indent + 1)}`;
        }
        return `${"  ".repeat(indent)}${key}: ${formatYaml(value, indent)}`;
      })
      .join("\n");
  }

  return String(data);
}

const DEFAULT_CELL_WIDTH = 60;

function computeMaxCellWidth(colCount: number): number {
  const cols = process.stdout.columns;
  if (cols && colCount > 0) {
    return Math.max(20, Math.floor(cols / colCount) - 2);
  }
  return DEFAULT_CELL_WIDTH;
}

function truncateCell(value: string, maxWidth = DEFAULT_CELL_WIDTH): string {
  if (value.length <= maxWidth) return value;
  return value.slice(0, maxWidth - 3) + "...";
}

function isNumericCell(value: string): boolean {
  return /^-?\d[\d,]*(\.\d+)?%?$/.test(value.trim());
}

function cellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if (Array.isArray(val)) return val.length === 0 ? "" : JSON.stringify(val);
    return JSON.stringify(val);
  }
  return String(val);
}

function formatTable(data: unknown): string {
  const rows = toRows(data);
  if (rows.length === 0) return "";

  const firstRow = rows[0];
  if (!firstRow) return "";
  const keys = Object.keys(firstRow);
  if (keys.length === 0) return "";

  const colCount = keys.length;
  const maxCellWidth = computeMaxCellWidth(colCount);

  const widths = keys.map((key) =>
    Math.max(
      key.length,
      ...rows.map((row) => truncateCell(cellValue(row[key]), maxCellWidth).length),
    ),
  );

  // Detect numeric columns (right-align numbers)
  const isNumeric = keys.map((key) =>
    rows.every((row) => {
      const v = cellValue(row[key]);
      return v === "" || isNumericCell(v);
    }),
  );

  const header = keys.map((key, i) => bold(key.padEnd(widths[i] ?? 0))).join("  ");
  const separator = widths.map((w) => dim("─".repeat(w))).join("  ");
  const body = rows
    .map((row) =>
      keys
        .map((key, i) => {
          const cell = truncateCell(cellValue(row[key]), maxCellWidth);
          const w = widths[i] ?? 0;
          return isNumeric[i] ? cell.padStart(w) : cell.padEnd(w);
        })
        .join("  "),
    )
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}

function formatMarkdown(data: unknown): string {
  const rows = toRows(data);
  if (rows.length === 0) return "";

  const firstRow = rows[0];
  if (!firstRow) return "";
  const keys = Object.keys(firstRow);
  if (keys.length === 0) return "";

  const widths = keys.map((key) =>
    Math.max(key.length, ...rows.map((row) => truncateCell(cellValue(row[key])).length)),
  );

  const header = `| ${keys.map((key, i) => key.padEnd(widths[i] ?? 0)).join(" | ")} |`;
  const separator = `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;
  const body = rows
    .map(
      (row) =>
        `| ${keys.map((key, i) => truncateCell(cellValue(row[key])).padEnd(widths[i] ?? 0)).join(" | ")} |`,
    )
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}

function toRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
    );
  }
  if (typeof data === "object" && data !== null) {
    return [data as Record<string, unknown>];
  }
  return [];
}

// ---------------------------------------------------------------------------
// JUnit XML output
// ---------------------------------------------------------------------------

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toTestCases(data: unknown, commandName: string): { cases: string[]; failures: number } {
  const cases: string[] = [];
  let failures = 0;

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const tc = buildTestCase(data[i], commandName, i);
      cases.push(tc.xml);
      if (tc.failed) failures++;
    }
  } else if (typeof data === "object" && data !== null) {
    const tc = buildTestCase(data, commandName);
    cases.push(tc.xml);
    if (tc.failed) failures++;
  } else if (typeof data === "string") {
    cases.push(
      `    <testcase name="${escapeXml(data)}" classname="gpc.${escapeXml(commandName)}" />`,
    );
  }

  return { cases, failures };
}

function buildTestCase(
  item: unknown,
  commandName: string,
  index = 0,
): { xml: string; failed: boolean } {
  if (typeof item !== "object" || item === null) {
    const text = String(item);
    return {
      xml: `    <testcase name="${escapeXml(text)}" classname="gpc.${escapeXml(commandName)}" />`,
      failed: false,
    };
  }

  const record = item as Record<string, unknown>;

  // Pick the first meaningful identifier, skipping sentinel dash/empty values
  // that commands use as display placeholders (e.g. `name: s["name"] || "-"`).
  const CANDIDATE_KEYS = [
    "name",
    "title",
    "sku",
    "id",
    "reviewId",
    "productId",
    "packageName",
    "track",
    "trackId",
    "versionCode",
    "region",
    "languageCode",
  ] as const;
  let resolvedName = `item-${index + 1}`;
  for (const key of CANDIDATE_KEYS) {
    const val = record[key];
    if (val != null && val !== "" && val !== "-") {
      resolvedName = String(val);
      break;
    }
  }
  const name = escapeXml(resolvedName);
  const classname = `gpc.${escapeXml(commandName)}`;

  // Detect threshold breach (vitals)
  const breached = record["breached"];
  if (breached === true) {
    const message = escapeXml(String(record["message"] ?? "threshold breached"));
    const details = escapeXml(
      String(record["details"] ?? record["metric"] ?? JSON.stringify(item)),
    );
    return {
      xml: `    <testcase name="${name}" classname="${classname}">\n      <failure message="${message}">${details}</failure>\n    </testcase>`,
      failed: true,
    };
  }

  return {
    xml: `    <testcase name="${name}" classname="${classname}" />`,
    failed: false,
  };
}

/**
 * Auto-pipe `output` to `$PAGER` when:
 * - stdout is a TTY
 * - row count exceeds terminal height
 * - a pager is available in the environment
 *
 * Falls back to `console.log(output)` when pagination is not applicable.
 */
export async function maybePaginate(output: string): Promise<void> {
  const isTTY = process.stdout.isTTY;
  const termHeight = process.stdout.rows ?? 24;
  const lineCount = output.split("\n").length;

  if (!isTTY || lineCount <= termHeight) {
    console.log(output);
    return;
  }

  const pager = process.env["GPC_PAGER"] ?? process.env["PAGER"] ?? "less";

  try {
    const { spawn } = await import("node:child_process");
    const child = spawn(pager, [], {
      stdio: ["pipe", "inherit", "inherit"],
      env: { ...process.env, LESS: process.env["LESS"] ?? "-FRX" },
    });
    child.stdin.write(output);
    child.stdin.end();
    await new Promise<void>((resolve) => child.on("close", resolve));
  } catch {
    // Pager not available — fall back to plain output
    console.log(output);
  }
}

export function formatJunit(data: unknown, commandName = "command"): string {
  const { cases, failures } = toTestCases(data, commandName);
  const tests = cases.length;

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="gpc" tests="${tests}" failures="${failures}" time="0">`,
    `  <testsuite name="${escapeXml(commandName)}" tests="${tests}" failures="${failures}">`,
    ...cases,
    "  </testsuite>",
    "</testsuites>",
  ];

  return lines.join("\n");
}
