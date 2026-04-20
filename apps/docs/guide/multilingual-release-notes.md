# Multilingual Release Notes

Google Play "What's new" is a 500-character field per locale. Most apps either copy English to every locale (looks lazy) or maintain translations by hand (doesn't scale). `gpc changelog generate --target play-store` solves it end-to-end in one command.

Shipped in v0.9.62. AI translation ships in v0.9.63; writing translated notes back into a draft release ships in v0.9.64.

::: tip The end-state
By v0.9.64:

```bash
gpc changelog generate --target play-store --locales auto --ai --apply
```

From git commit to translated Play Store release notes, live on the store, in one command.
:::

## What this does

Extends `gpc changelog generate` (see the [main guide](/guide/changelog-generation)) with a `--target play-store` mode that emits per-locale output instead of GitHub-style markdown. The en-US source is lossless: same bullets as the GitHub target, clipped to 500 Unicode code points with a warning if over. Non-English locales get a `[needs translation]` placeholder you fill in via `--format prompt` (today) or `--ai` (v0.9.63+).

## Quick start

```bash
# Explicit locales
gpc changelog generate --target play-store --locales en-US,fr-FR,de-DE

# Read locales from your live Play Store listing
gpc changelog generate --target play-store --locales auto --app com.example.app
```

Output (default `--format md`):

```markdown
# Play Store release notes (v0.9.61 → v0.9.62)

## en-US (412/500)

- feat: shell completion walker
- fix: correct vitals lmk endpoint

## fr-FR (needs translation)

[needs translation — pass --ai once v0.9.63 ships, or paste the prompt emitted by --format prompt]

## de-DE (needs translation)

[needs translation — pass --ai once v0.9.63 ships, or paste the prompt emitted by --format prompt]

## Summary

- en-US: 412/500 ✓
- fr-FR: placeholder
- de-DE: placeholder
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
  "from": "v0.9.61",
  "to": "v0.9.62",
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

Status values: `ok`, `over`, `placeholder`, `empty`.

### `--format prompt` — translation-ready LLM prompt

The bridge to v0.9.63. Emits a ready-to-paste prompt that includes the 500-char constraint, the source text, and each target locale. Pipe to your LLM of choice today; wait for `--ai` in v0.9.63 if you'd rather stay in the terminal.

```bash
gpc changelog generate --target play-store --locales en-US,fr-FR,de-DE --format prompt | pbcopy
```

## Strict mode

In play-store mode, `--strict` exits 1 if:

- Any commit subject triggers the project-voice linter (same rule as the github target)
- **Any locale's text exceeds 500 code points** (overflows are collected and reported together — not first-wins)

Good for a CI gate before tagging:

```bash
gpc changelog generate --target play-store --locales auto --strict
```

## Character counting

Play Store's 500-char limit is applied per Unicode code point. `gpc` counts via `[...text].length`, the same rule `gpc listings lint` uses. Emoji and CJK characters each count as one.

## Out of scope (today)

- **AI translation** — opt-in via `--ai` in [v0.9.63](https://github.com/yasserstudio/gpc/milestones)
- **Writing notes into a draft release** — `--apply` in v0.9.64 writes `recentChanges[]` on your current edit
- **Reading existing "What's new" history from the Play API** — not planned; use `gpc listings pull` if you need that

## Related

- [`gpc changelog generate`](/commands/changelog#changelog-generate) — the command reference
- [Generating Release Notes](/guide/changelog-generation) — the github-target walkthrough
- [`gpc listings lint`](/commands/listings) — character-limit checks for title / shortDescription / fullDescription (separate field, same counting rule)
