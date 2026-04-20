---
outline: deep
---

# Play Edit Lifecycle

The Play Edit Lifecycle is the atomic-session model used by the Google Play Developer API. Instead of making individual changes to an app, you open an "edit" (a versioned session), make all your changes within it, then commit or discard the whole edit.

## Why it matters

The edit model prevents partial writes. If you upload an AAB, update release notes, and change the rollout percentage, all three changes land together at commit time, or none of them land. No half-applied state, no inconsistency between what Play Console shows and what users got.

Every programmatic Play Store operation goes through an edit: AAB uploads, metadata changes, track management, rollout updates, listing changes. The edit lifecycle is why Play Store workflows are robust but verbose to script directly.

## How GPC handles it

GPC abstracts the edit lifecycle entirely. Every command that mutates state (`gpc releases upload`, `gpc listings push`, `gpc releases promote`) handles the open/edit/commit cycle internally. You never see the edit ID.

For advanced workflows where you need to batch multiple changes into one edit, use the plugin SDK or the `@gpc-cli/api` package directly. The SDK exposes the raw edit lifecycle:

```typescript
import { createClient } from "@gpc-cli/api";

const client = createClient({ auth });
const edit = await client.edits.insert({ packageName: "com.example.app" });
// make changes...
await client.edits.commit({ editId: edit.id, packageName: "com.example.app" });
```

If a command fails mid-edit, GPC discards the edit automatically. No stuck edits waiting in Play Console.

## Common issues

- **"Edit has been cancelled"** — the Play API auto-cancels edits after 7 days of inactivity. Rare for GPC since commands complete quickly, but possible if a long-running pipeline is interrupted.
- **Concurrent edits** — Play Store allows only one open edit per app per account at a time. Two parallel CI jobs running `gpc releases upload` on the same app will serialize.
- **Rollout changes via separate edit** — increasing an in-progress rollout opens a new edit even though it modifies an existing release.

## Related

- [`gpc releases`](/commands/releases) — commands that use edits under the hood
- [Architecture Guide](/advanced/architecture) — how GPC wraps the edit lifecycle
- [SDK Usage](/advanced/sdk-usage) — direct access to edits via `@gpc-cli/api`
- [AAB](/glossary/aab) — the upload artifact delivered within an edit
