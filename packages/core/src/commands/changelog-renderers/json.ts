import type { GeneratedChangelog } from "../changelog-generate.js";

export function renderJson(g: GeneratedChangelog): string {
  return JSON.stringify(g, null, 2);
}
