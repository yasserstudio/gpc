---
"@gpc-cli/api": patch
"@gpc-cli/core": patch
"@gpc-cli/cli": patch
---

feat(enterprise): publish private apps to Managed Google Play via the Play Custom App Publishing API

GPC is now the first Android publishing CLI with Managed Google Play support. The previous `gpc enterprise` commands were fiction — they called nonexistent URLs, wrapped a nonexistent list method, and missed the multipart binary upload entirely. This release rewrites the enterprise surface end-to-end.

**New:**
- `gpc enterprise publish <bundle> --account <id> --title "<title>"` — one-shot private app publishing in a single CLI call
- `gpc enterprise create --account <id> --bundle <path> --title "<title>"` — explicit-arg version of publish
- Repeatable `--org-id` / `--org-name` flags for target enterprise organizations
- Permanent-private confirmation prompt before create/publish (skip with `--yes`)
- `gpc doctor` now probes the Play Custom App Publishing API and flags missing permissions or unconfigured APIs
- New docs guide at `apps/docs/guide/enterprise-publishing.md` — full walkthrough from account setup to CI/CD
- `HttpClient.uploadCustomApp<T>` — new multipart resumable upload method for the Custom App API (reusable infrastructure)
- `ResumableUploadOptions.initialMetadata` — new option on the resumable upload helper for APIs that accept metadata in the session-initiation POST

**Fixed:**
- `gpc enterprise` entirely rewritten to call the correct Google API URL (`/accounts/{id}/customApps` via the upload endpoint, was `/organizations/{id}/apps` against a non-upload URL)
- `gpc enterprise create` now actually uploads the bundle binary (the previous implementation just posted JSON metadata with no file, which would have failed against the real API)
- `gpc enterprise` docs corrected: `--account` is the developer account ID from your Play Console URL, not a Google Workspace or Cloud Identity organization ID

**Removed:**
- `gpc enterprise list` — Google's Play Custom App Publishing API has no list method. Use `gpc apps list` instead; private apps appear in your regular developer account.
- `listEnterpriseApps` export from `@gpc-cli/core`
- `CustomAppsListResponse` export from `@gpc-cli/api`

**Deprecated:**
- `gpc enterprise --org` — renamed to `--account`. `--org` still works in v0.9.56 with a deprecation warning, will be removed in a future version.
