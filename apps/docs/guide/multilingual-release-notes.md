# Multilingual Release Notes

Google Play "What's new" is a 500-character field per locale. Most apps either copy English to every locale (looks lazy) or maintain translations by hand (doesn't scale). `gpc changelog generate --target play-store` solves it end-to-end in one command.

Per-locale budget enforcement shipped in v0.9.62. AI translation shipped in v0.9.63. Writing translated notes into a draft release shipped in v0.9.64.

::: tip One command, end to end
```bash
gpc changelog generate --target play-store --locales auto --ai --apply
```

From git commit to translated Play Store release notes, written into your draft release, in one command.
:::

## What this does

Extends `gpc changelog generate` (see the [main guide](/guide/changelog-generation)) with a `--target play-store` mode that emits per-locale output instead of GitHub-style markdown. The en-US source is lossless: same bullets as the GitHub target, clipped to 500 Unicode code points with a warning if over. Non-English locales are translated via your own LLM key when you pass `--ai`, or left as a `[needs translation]` placeholder for the offline `--format prompt` workflow.

## Quick start

```bash
# Translate via your own LLM key (BYO — Anthropic, OpenAI, Google, or Vercel AI Gateway)
gpc changelog generate --target play-store --locales auto --ai

# Explicit locales, no AI — placeholder text for non-source locales
gpc changelog generate --target play-store --locales en-US,fr-FR,de-DE

# Read locales from your live Play Store listing
gpc changelog generate --target play-store --locales auto --app com.example.app
```

Output (default `--format md`, with `--ai`):

```markdown
# Play Store release notes (v0.9.62 → v0.9.63)

## en-US (109/500)

- feat: AI-assisted Play Store translation via --ai

## fr-FR (130/500)

- Traduction des notes Play Store assistée par IA via --ai

## de-DE (124/500)

- KI-gestützte Play-Store-Übersetzung via --ai

## Summary

- en-US: 109/500 ✓
- fr-FR: 130/500 ✓
- de-DE: 124/500 ✓
```

Without `--ai`, non-source locales keep the `[needs translation]` placeholder:

```markdown
## fr-FR (needs translation)

[needs translation — pass --ai, or paste the prompt emitted by --format prompt]
```

## Locale resolution

| Mode                          | Behavior                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--locales en-US,fr-FR,de-DE` | Validate each against BCP 47 / Play Store's supported list, emit in order. Offline — no API call.                                                               |
| `--locales auto`              | Calls `client.listings.list()` for `--app` (or the active profile's default app), returns every locale with an existing listing. Authenticated; one round-trip. |

`--locales auto` never adds locales your Play listing doesn't already have. If you want a locale that isn't live yet, list it explicitly.

## The three formats

### `--format md` (default) — human-readable

Section per locale, character meter, summary block. Best for a quick local preview before deciding what to translate.

### `--format json` — CI-friendly

```bash
gpc changelog generate --target play-store --locales auto --format json --app com.example.app \
  | jq '.locales[] | select(.status == "over") | .language'
```

Shape:

```json
{
  "from": "v0.9.62",
  "to": "v0.9.63",
  "limit": 500,
  "sourceLanguage": "en-US",
  "locales": [
    {
      "language": "en-US",
      "text": "- feat: ...\n- fix: ...",
      "chars": 412,
      "limit": 500,
      "status": "ok"
    },
    {
      "language": "fr-FR",
      "text": "[needs translation ...]",
      "chars": 74,
      "limit": 500,
      "status": "placeholder"
    }
  ],
  "overflows": []
}
```

Status values: `ok`, `over`, `placeholder`, `empty`, `failed`.

When you pass `--ai`, the JSON output gains a top-level `ai` block:

```json
{
  "ai": {
    "path": "direct",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "tokensIn": 2374,
    "tokensOut": 646
  }
}
```

On the Gateway path the block also includes `runId` and `costUsd` (aggregate cost in USD for the run, fetched via one tagged `gateway.getSpendReport` call after all locales finish). On the direct-SDK path those fields are absent.

### `--format prompt` — translation-ready LLM prompt (offline / no-key path)

Emits a ready-to-paste prompt that includes the 500-char constraint, the source text, and each target locale. Use this when you don't want to pass an LLM key to GPC — paste into Claude, ChatGPT, or any LLM of your choice:

```bash
gpc changelog generate --target play-store --locales en-US,fr-FR,de-DE --format prompt | pbcopy
```

Combined with `gpc --dry-run ... --ai`, this is also how you inspect the exact per-locale prompt that would be sent before committing to an API call.

## AI translation

Add `--ai` to run each non-source locale through an LLM. The resolver auto-detects whichever provider key you have set, in priority order:

1. `AI_GATEWAY_API_KEY` — routes via the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). Unlocks 20+ providers through one interface, auto-fallback via `models: [...]`, and aggregate cost per run reported in USD.
2. `ANTHROPIC_API_KEY` — direct `@ai-sdk/anthropic`, defaults to `claude-sonnet-4-6`
3. `OPENAI_API_KEY` — direct `@ai-sdk/openai`, defaults to `gpt-4o-mini`
4. `GOOGLE_GENERATIVE_AI_API_KEY` — direct `@ai-sdk/google`, defaults to `gemini-2.5-flash`

Override with `--provider <anthropic|openai|google>` and `--model <id>` when you want a specific model (useful for comparing quality or cost across providers).

```bash
# Auto-detect
gpc changelog generate --target play-store --locales auto --ai

# Explicit provider + model
gpc changelog generate --target play-store --locales auto --ai \
  --provider anthropic --model claude-opus-4-7

# Preview the prompt without spending tokens
gpc --dry-run changelog generate --target play-store --locales auto --ai
```

**Reasoning models are explicitly avoided as defaults.** Translation is not a reasoning task — default models are picked to be non-reasoning so you don't pay for thinking tokens. Gemini 2.5 has `thinkingConfig.thinkingBudget: 0` applied automatically.

**When a locale fails**, `gpc` classifies the error and emits a structured placeholder in the output (`rate_limited`, `auth`, `safety_blocked`, `timeout`, `network`, `no_source`). Sensitive error strings never reach the output or your Play Store draft. Add `--strict` to fail CI when any locale fails.

**Lazy-loaded.** Running `gpc changelog generate` without `--ai` imports none of the four AI SDK deps. The cold-start budget is preserved for users who don't use this feature; a static-analysis test on the built bundle guards against accidental top-level imports.

## Strict mode

In play-store mode, `--strict` exits 1 if:

- Any commit subject triggers the project-voice linter (same rule as the github target)
- **Any locale's text exceeds 500 code points** (overflows are collected and reported together — not first-wins)
- **With `--ai`: any locale fails to translate** (failures are also collected, not first-wins)

Good for a CI gate before tagging:

```bash
gpc changelog generate --target play-store --locales auto --ai --strict
```

## Character counting

Play Store's 500-char limit is applied per Unicode code point. `gpc` counts via `[...text].length`, the same rule `gpc listings lint` uses. Emoji and CJK characters each count as one. When an AI-translated locale overflows, the text is truncated to 500 code points with a `…` ellipsis appended and `status: "over"` is set.

## Writing notes into a draft release

Add `--apply` to write the generated release notes directly into a draft release on the Play Store. This closes the loop: git commits become translated "What's new" text, live on the store.

```bash
# Full pipeline: generate, translate, write to draft
gpc changelog generate --target play-store --locales auto --ai --apply

# Target a specific track (default: production)
gpc changelog generate --target play-store --locales auto --ai --apply --track beta

# Preview first, no write
gpc --dry-run changelog generate --target play-store --locales auto --ai --apply
```

### How it works

1. Generates release notes from your git log (same as without `--apply`)
2. Translates non-source locales via `--ai` (optional but recommended)
3. Validates: locales with `placeholder` or `failed` status are blocked
4. Opens a Play Store edit, finds the draft release on `--track`, writes `releaseNotes[]`, validates, and commits
5. On 409 Conflict (stale edit), retries with a fresh edit automatically

### Requirements

- A draft release must exist on the target track. Upload an AAB first (`gpc releases upload`) to create one.
- `--apply` requires `--target play-store`
- `--apply` cannot be combined with `--format prompt` (use prompt mode for preview, apply mode for writing)

### Dry-run preview

Combined with `--dry-run`, `--apply` previews the exact payload that would be written:

```bash
gpc --dry-run changelog generate --target play-store --locales auto --ai --apply
```

This shows the release notes per locale and the track/versionCodes that would be updated, without touching the Play Store.

## Out of scope

- **Reading existing "What's new" history from the Play API** -- not planned; use `gpc listings pull` if you need that
- **Translation caching across runs** -- each `--ai` run translates fresh. Pipe output to a file if you want to reuse it.

## Related

- [`gpc changelog generate`](/commands/changelog#changelog-generate) — the command reference
- [Generating Release Notes](/guide/changelog-generation) — the github-target walkthrough
- [`gpc listings lint`](/commands/listings) — character-limit checks for title / shortDescription / fullDescription (separate field, same counting rule)
