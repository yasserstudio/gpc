---
outline: deep
---

# APK (Android Package Kit)

An APK is the original Android install format: a zipped container with compiled code, resources, and manifest, ready to install directly on a device.

## Why it matters

APKs are still the install format Android devices actually run. The difference between APKs and AABs is *who generates the APK*: with an APK upload, you generate one APK that every device gets. With an AAB upload, Google Play generates a per-device optimized APK from your bundle.

APKs are still valid for sideloading, internal distribution outside Play Store, Amazon Appstore submissions, and legacy apps on Play Store. New apps on Play Store must use AAB.

## How GPC handles it

```bash
gpc releases upload app.apk --track internal
```

GPC accepts APKs for existing apps and for test-track uploads. The command is identical to the AAB upload; the file extension determines the API endpoint.

For internal sharing without a track release:

```bash
gpc internal-sharing upload app.apk
```

## Common issues

- **"APK required for new apps but AAB uploaded"** and vice versa. Play Console enforces this at the app level; use whichever your app was registered with.
- **"Version code already exists"** — every APK upload requires a unique `versionCode`. Bump it before building.
- **Larger download sizes vs AAB** — APKs do not benefit from Play's dynamic delivery. Expect 30-50% larger installs than the same app shipped as AAB.

## Related

- [AAB](/glossary/aab) — the modern, bundle-based format
- [`gpc releases upload`](/commands/releases)
- [`gpc internal-sharing`](/commands/internal-sharing) — test APK distribution without a track release
- [`gpc preflight`](/commands/preflight) — works on APKs too
