# GPC

## What this codebase does

TypeScript CLI for the Google Play Developer API v3. Monorepo (pnpm + Turborepo) with 7 packages under `@gpc-cli/*`. Users are Android developers and CI pipelines that upload APK/AAB, manage releases/rollouts, sync store listings, and monitor vitals. Published to npm and as standalone binaries.

## Auth shape

- `packages/auth/src/authenticator.ts` — `createAuthClient()` returns a google-auth-library client from service account JSON, OAuth refresh token, or ADC
- `packages/auth/src/credential-store.ts` — reads/writes tokens to `~/.config/gpc/`; redacts secrets in all verbose/debug output
- `packages/config/src/loader.ts` — `loadConfig()` / `findConfigFile()` resolves profiles, env vars, and `.gpcrc.json`
- `packages/core/src/auth-guard.ts` — validates auth before any API call; exits with code 3 on auth failure
- Service account key paths resolved from `GPC_SERVICE_ACCOUNT_KEY` env var or config file

## Threat model

1. **Credential leakage**: service account JSON keys or OAuth tokens exposed in logs, error output, JSON mode, or debug traces. Highest impact — full API access to the user's Play Console.
2. **Supply chain compromise**: malicious npm dependency executing install scripts or injecting code at runtime. GPC runs in CI pipelines with publish credentials.
3. **API input injection**: user-supplied package names, track names, or release notes passed unsanitized to Google Play API requests.
4. **Local file read via path traversal**: AAB/APK paths, Fastlane metadata directories, and `--notes-dir` resolved from user input.

## Project-specific patterns to flag

- Any code path that logs, prints, or serializes a value from `credential-store.ts`, `authenticator.ts`, or env vars matching `*KEY*`, `*TOKEN*`, `*SECRET*` without redaction
- `yauzl` ZIP extraction in `packages/core/src/preflight/aab-reader.ts` — path traversal via crafted ZIP entry names (Zip Slip)
- `protobufjs` deserialization of AAB manifest data — untrusted binary input from user-supplied files
- AI SDK calls in `packages/core/src/changelog/` pass user commit messages to LLM providers — prompt injection via crafted git commit subjects
- Dynamic `import()` in `packages/core/src/plugins/` loads user-specified plugin paths — arbitrary code execution if path is attacker-controlled

## Known false-positives

- `packages/auth/tests/` contains fake service account JSON fixtures — intentional test data, not real credentials
- `e2e/` tests spawn the CLI binary and check exit codes — process.exec calls are test harness, not command injection
- `packages/core/src/preflight/` reads and parses AAB/APK binary files — file system access is the core feature, not a vulnerability
- `.dev/` directory (gitignored) contains internal docs with example API responses — not production code
