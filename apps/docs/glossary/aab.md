---
outline: deep
---

# AAB (Android App Bundle)

An AAB is Google Play's preferred upload format for Android apps. It is a zipped container that includes your compiled code, resources, and manifest, plus metadata that lets Google Play generate per-device optimized APKs at install time.

## Why it matters

Since August 2021, new apps on Google Play must ship as AABs. Existing apps can still upload APKs, but AABs unlock dynamic delivery features: per-language resource stripping, per-density image delivery, Play Asset Delivery for large assets, and Play Feature Delivery for on-demand modules.

Result: smaller download sizes for end users, which improves install conversion. A 50 MB APK typically becomes a 20-30 MB install via AAB.

## How GPC handles it

```bash
gpc releases upload app.aab --track internal
```

GPC accepts AABs and APKs interchangeably. The `gpc releases upload` command handles both, routing to the correct Google Play Developer API endpoint based on file extension.

Before upload, run the compliance scanner:

```bash
gpc preflight app.aab
```

Nine offline scanners check your AAB against Play Store policies: target SDK, permissions, native libraries, secrets, billing SDKs, privacy trackers, metadata limits, and size.

## Common issues

- **"APK has an invalid signature"** — the AAB was signed for one keystore but uploaded to an app configured for another. GPC does not re-sign; use your build tool's signing config.
- **"targetSdkVersion too low"** — Google raises the required target SDK annually. `gpc preflight` catches this before upload.
- **"Native libraries must include 64-bit versions"** — all Play Store apps must include arm64 and x86_64 for native code. Preflight flags this.

## Related

- [APK](/glossary/apk) — the older, unbundled format
- [Fastlane Metadata Format](/glossary/fastlane-metadata-format) — metadata directory shape GPC reads and writes
- [`gpc releases upload`](/commands/releases) — the upload command
- [`gpc preflight`](/commands/preflight) — pre-upload compliance scanner
- [`gpc bundle analyze`](/commands/bundle) — per-module size breakdown
