import { GpcError } from "../errors.js";
import { isValidBcp47 } from "./bcp47.js";

const PACKAGE_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){1,}$/;
const SKU_RE = /^[a-zA-Z0-9._]+$/;
const TRACK_NAMES = ["internal", "alpha", "beta", "production"];
const CUSTOM_TRACK_RE = /^[a-zA-Z0-9\-_]+$/;

export function validatePackageName(name: string): void {
  if (!name || !PACKAGE_NAME_RE.test(name)) {
    throw new GpcError(
      `Invalid package name: "${name}"`,
      "INVALID_PACKAGE_NAME",
      2,
      "Package name must be a valid Android application ID (e.g., com.example.myapp)",
    );
  }
}

export function validateVersionCode(code: string | number): void {
  const num = typeof code === "string" ? parseInt(code, 10) : code;
  if (!Number.isInteger(num) || num < 1) {
    throw new GpcError(
      `Invalid version code: "${code}"`,
      "INVALID_VERSION_CODE",
      2,
      "Version code must be a positive integer (e.g., 142)",
    );
  }
}

export function validateLanguageCode(code: string): void {
  if (!code || !isValidBcp47(code)) {
    throw new GpcError(
      `Invalid language code: "${code}"`,
      "INVALID_LANGUAGE_CODE",
      2,
      "Language code must be a valid BCP-47 tag supported by Google Play (e.g., en-US, ja-JP, fr-FR)",
    );
  }
}

export function validateTrackName(name: string): void {
  if (!name) {
    throw new GpcError(
      "Track name is required",
      "INVALID_TRACK_NAME",
      2,
      "Specify a track: internal, alpha, beta, production, or a custom track name",
    );
  }
  if (!TRACK_NAMES.includes(name) && !CUSTOM_TRACK_RE.test(name)) {
    throw new GpcError(
      `Invalid track name: "${name}"`,
      "INVALID_TRACK_NAME",
      2,
      `Valid tracks: ${TRACK_NAMES.join(", ")}, or a custom track matching [a-zA-Z0-9-_]+`,
    );
  }
}

export function validateSku(sku: string): void {
  if (!sku || !SKU_RE.test(sku)) {
    throw new GpcError(
      `Invalid product ID (SKU): "${sku}"`,
      "INVALID_SKU",
      2,
      "Product ID must contain only letters, numbers, dots, and underscores (e.g., premium_upgrade)",
    );
  }
}
