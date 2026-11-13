# GPC

GPC is a command-line tool for publishing and operating Android apps on Google Play through Google's public APIs, plus offline checks that run before an upload.

## Preflight

**Preflight**:
An offline check of an app bundle (and optionally its source and store metadata) against Google Play rules, run before anything is uploaded.
_Avoid_: lint, validation (validation is Google's server-side check during an upload)

**Finding**:
One problem or advisory reported by preflight, with a rule ID and a severity.
_Avoid_: issue, violation, error (error is one severity)

## Billing

**Billing Library**:
Google's Android library that apps use to sell in-app products and subscriptions through Google Play. Public text names it "Google Play Billing Library" on first mention; "PBL" is internal shorthand only.
_Avoid_: PBL (in public text), billing SDK, billing client

**Billing Library version**:
The version of the Billing Library an app bundle ships, as recorded in its merged manifest.
_Avoid_: billing version, PBL level

**Update deadline**:
The date after which Google Play rejects new apps and app updates built on a given Billing Library major version, unless the developer has been granted an extension.
_Avoid_: deprecation date, end of life

**Extension deadline**:
The later date, requested per app through a form in Play Console, until which an app may keep shipping updates on an unsupported Billing Library version. After it, the version is unsupported with no exceptions.
_Avoid_: grace period
