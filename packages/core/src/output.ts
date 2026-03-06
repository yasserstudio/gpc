import type { OutputFormat } from "@gpc/config";
import process from "node:process";

export function detectOutputFormat(): OutputFormat {
  return process.stdout.isTTY ? "table" : "json";
}

export function formatOutput(data: unknown, format: OutputFormat): string {
  switch (format) {
    case "json":
      return formatJson(data);
    case "yaml":
      return formatYaml(data);
    case "markdown":
      return formatMarkdown(data);
    case "table":
      return formatTable(data);
    default:
      return formatJson(data);
  }
}

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function formatYaml(data: unknown, indent = 0): string {
  if (data === null || data === undefined) {
    return "null";
  }

  if (typeof data === "string") {
    return data.includes("\n") ? `|\n${data.split("\n").map((l) => `${"  ".repeat(indent + 1)}${l}`).join("\n")}` : data;
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
          return `${prefix}${lines[0]}\n${lines.slice(1).map((l) => `${"  ".repeat(indent)}  ${l}`).join("\n")}`;
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

function formatTable(data: unknown): string {
  const rows = toRows(data);
  if (rows.length === 0) return "";

  const keys = Object.keys(rows[0]!);
  if (keys.length === 0) return "";

  const widths = keys.map((key) =>
    Math.max(key.length, ...rows.map((row) => String(row[key] ?? "").length)),
  );

  const header = keys.map((key, i) => key.padEnd(widths[i]!)).join("  ");
  const separator = widths.map((w) => "-".repeat(w)).join("  ");
  const body = rows
    .map((row) =>
      keys.map((key, i) => String(row[key] ?? "").padEnd(widths[i]!)).join("  "),
    )
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}

function formatMarkdown(data: unknown): string {
  const rows = toRows(data);
  if (rows.length === 0) return "";

  const keys = Object.keys(rows[0]!);
  if (keys.length === 0) return "";

  const widths = keys.map((key) =>
    Math.max(key.length, ...rows.map((row) => String(row[key] ?? "").length)),
  );

  const header = `| ${keys.map((key, i) => key.padEnd(widths[i]!)).join(" | ")} |`;
  const separator = `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;
  const body = rows
    .map(
      (row) =>
        `| ${keys.map((key, i) => String(row[key] ?? "").padEnd(widths[i]!)).join(" | ")} |`,
    )
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}

function toRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    );
  }
  if (typeof data === "object" && data !== null) {
    return [data as Record<string, unknown>];
  }
  return [];
}
