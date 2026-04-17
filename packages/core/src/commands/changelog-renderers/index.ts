import type { GeneratedChangelog, OutputMode } from "../changelog-generate.js";
import { renderMarkdown } from "./markdown.js";
import { renderJson } from "./json.js";
import { renderPrompt } from "./prompt.js";

export type Renderer = (g: GeneratedChangelog) => string;

export const RENDERERS: Record<OutputMode, Renderer> = {
  md: renderMarkdown,
  json: renderJson,
  prompt: renderPrompt,
};

export { renderMarkdown, renderJson, renderPrompt };
export {
  renderPlayStore,
  renderPlayStoreMd,
  renderPlayStoreJson,
  renderPlayStorePrompt,
  buildLocaleBundle,
  PLAY_STORE_LIMIT,
  PLACEHOLDER_TEXT,
} from "./play-store.js";
export type {
  LocaleBundle,
  LocaleEntry,
  PlayStoreFormat,
  PlayStoreRenderOptions,
} from "./play-store.js";
