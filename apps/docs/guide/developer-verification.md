# Developer Verification

Google is rolling out mandatory identity verification and app registration for all Android developers. All apps must be registered by verified developers to be installable on [certified Android devices](https://www.android.com/certified/partners/). This page covers what's changing, the timeline, and how GPC fits into the new workflow.

## Why this is happening

Android developer verification links real-world entities (individuals and organizations) with their apps. It deters bad actors, makes it harder to repeatedly spread harm, and boosts user confidence in the ecosystem.

## What you need to do

Three steps:

1. **Sign up** — create an account in the appropriate console (see [Find your path](#find-your-path) below)
2. **Verify your identity** — provide official documentation to confirm your identity
3. **Register your package names** — prove app ownership by providing the APK signed with your private key

### If you're on Google Play

Most Play developers need to do very little:

- **Identity verification** — your existing Play Console verified identity already meets the new requirements. Confirm your account info under Developer Account on the **Settings** page.
- **Package registration** — Google will auto-register most Play apps using information you've already provided. Google expects to auto-register **98% of all Play apps**. The remaining 2% will need manual registration. Starting March 2026, auto-registration results are displayed above the app list in Play Console.
- **New Play apps** — automatically registered when you create them. If the package name is already used by another developer, you'll be prompted to pick another.
- **Non-Play apps** — if you also distribute outside Play, you'll be able to register those apps and keys within Play Console too.

See the [Play Console PDF guide](https://developer.android.com/static/guides/pdf-guides/pdc-guide.pdf) for a step-by-step walkthrough.

### If you're on the Android Developer Console

The following requirements apply to developers who distribute **only outside Google Play**:

### Identity verification requirements

**For individuals:**
- Legal name and address
- Government-issued photo ID (passport, state ID, driving license, permanent resident card)
- Proof of address document (utility bill, insurance statement, bank statement)
- Contact email and phone number (verified with OTP)

**For organizations — all of the above, plus:**
- D-U-N-S number (free to obtain from Dun & Bradstreet)
- Organization website verified via Google Search Console
- Official organization documents (certificate of incorporation, IRS documents, SEC filings, or business credit reports)

### Package name registration

Once verified, register your apps in your console's **Packages** page:

1. Enter your package name
2. Add your app signing key's SHA-256 certificate fingerprint
3. Prove ownership by signing and uploading an APK with your private key

Registered package names are linked to your verified developer identity. If multiple developers use the same package name, priority goes to the developer whose signing key accounts for over 50% of total known installs.

### Find your path

| If you distribute apps... | Next steps |
|---------------------------|------------|
| **Only on Google Play** | Use your existing [Play Console account](https://developer.android.com/developer-verification/guides/google-play-console). No new identity verification needed — your existing Play verification is sufficient. |
| **Both on and off Google Play** | Use your existing [Play Console account](https://developer.android.com/developer-verification/guides/google-play-console). You'll be able to register non-Play apps and keys there too. |
| **Only outside of Google Play** | Create an account in the [Android Developer Console](https://developer.android.com/developer-verification/guides/android-developer-console). |

### Distribution options

| | Full distribution | Limited distribution | Sideloading (unregistered) |
|---|---|---|---|
| **Best for** | Organizations and professional developers | Students, hobbyists, personal use | Developers who are not verified |
| **Identity verification** | Required | Not required | Not required |
| **Distribution** | Any app store or channel | Up to 20 devices | Any channel (outside verified app stores) |
| **User experience** | No change from today | Accept invitation from a developer you know | Advanced flow with extra safeguards |

### Limited distribution accounts

A free account type for non-commercial use:

- No identity verification or registration fee required
- Share apps with up to 20 explicitly authorized devices
- Designed for hobbyists, learners, and classroom projects
- Early access signup available now, global launch August 2026

### What happens to unregistered apps

After enforcement begins, unregistered apps cannot be installed normally on certified Android devices. Google is adding an **advanced flow** for sideloading unverified apps with extra safeguards:

1. Enable developer mode in system settings
2. Confirm no coercion with a safety check
3. Restart phone and reauthenticate
4. One-day waiting period with biometric/PIN verification
5. Install the app (option to enable for 7 days or indefinitely)

This is designed to break the cycle of scam-driven coercion while preserving choice for informed users.

## Timeline

| Date | Milestone |
|------|-----------|
| **August 2025** | New requirements [announced](https://android-developers.googleblog.com/2025/08/elevating-android-security.html) |
| **November 2025** | Early access began |
| **March 2026** | Registration opens to all developers |
| **June 2026** | Limited distribution accounts early access |
| **August 2026** | Limited distribution and advanced flow launch globally |
| **September 2026** | Enforcement begins in Brazil, Indonesia, Singapore, Thailand |
| **2027+** | Global enforcement rollout |

## Key concepts

- **Android Developer Console (ADC)** — console for developers who distribute apps only outside Google Play
- **Google Play Console (PDC)** — console for developers who distribute apps on Google Play
- **Package name registration** — creating a formal, verifiable link between your app's package name and signing keys
- **App signing key** — the certificate used to [sign your APK](https://developer.android.com/studio/publish/app-signing)
- **Certified Android devices** — devices where verification requirements are enforced, regardless of download source

## How GPC helps today

GPC already covers workflows relevant to verified developers:

### Preflight scanning

```bash
gpc preflight app.aab
```

Runs 9 offline policy scanners including targetSdk compliance, permissions, and signing checks — catches issues before upload.

### Auth and account verification

```bash
gpc doctor
```

Validates your credentials, tests API connectivity, and confirms your app is accessible in your developer account.

### Status monitoring

```bash
gpc status
```

Full health snapshot — releases, vitals, reviews — in one command.

## What's coming in GPC

Google hasn't exposed public APIs for developer verification or app registration yet. Android Studio integration is expected in the coming months, which may signal programmatic access is coming.

When APIs become available, GPC plans to add:

- **`gpc doctor` verification check** — warn if your developer account is not verified or if deadlines are approaching
- **Registration status in `gpc status`** — show whether your app is registered alongside releases and vitals
- **Preflight verification scanner** — check app registration status before upload
- **`gpc verify` commands** — check and manage verification and registration programmatically

## Resources

- [Developer verification overview](https://developer.android.com/developer-verification)
- [Play Console registration guide](https://developer.android.com/developer-verification/guides/google-play-console)
- [Android Developer Console registration guide](https://developer.android.com/developer-verification/guides/android-developer-console)
- [Limited distribution accounts](https://developer.android.com/developer-verification/guides/limited-distribution)
- [Verification rollout announcement](https://android-developers.googleblog.com/2026/03/android-developer-verification-rolling-out-to-all-developers.html)
- [Advanced flow blog post](https://android-developers.googleblog.com/2026/03/android-developer-verification.html)
- [Android Developer Console guide (PDF)](https://developer.android.com/static/guides/pdf-guides/adc-guide.pdf)
- [Play Console guide (PDF)](https://developer.android.com/static/guides/pdf-guides/pdc-guide.pdf)
