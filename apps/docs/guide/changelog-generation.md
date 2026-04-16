# Generating Release Notes

Writing release notes by hand is the slowest step in every release. `gpc changelog generate` (v0.9.61+) reads your local git log, clusters related commits, lints against your project's voice, and emits one of three outputs: canonical GitHub Release markdown, structured JSON, or a paste-ready prompt for Claude or ChatGPT.

::: tip One command end-to-end
For most releases:

```bash
gpc changelog generate | gh release create v0.9.61 -F -
```

That's it. No copy-paste, no formatting fixes, no template hunting.
:::

## What this does

`gpc changelog generate` produces release notes that match the [GitHub Release notes template](/advanced/conventions#github-release-notes-template) used by GPC and projects that follow conventional commits. It takes a git ref range (defaults to "since the latest `v*` tag") and produces:

- **`--format md`** (default): the canonical `## What's Changed` markdown, ready to paste into `gh release create -F -`
- **`--format json`**: the structured intermediate — clusters, headline candidates, jargon warnings — for tooling
- **`--format prompt`**: a paste-ready LLM prompt with project voice rules + clustered commits + headline candidates, so you (or a teammate) can ask Claude to draft a polished narrative

The smart layer goes beyond grouping commits by prefix. It clusters related commits using a combination of:

1. **File-path overlap** — commits touching the same top-2 directory components cluster together
2. **Subject keyword similarity** — Jaccard similarity on stemmed tokens above 0.4
3. **Time proximity** — within 2 days and any shared file

It also detects revert pairs (drops both sides), merges fixup commits (`wip`, `fix typo`, `address review`) into their parent, canonicalizes verb form (`Added` → `add`), and warns when a commit subject contains internal jargon you've ruled out of public release notes (`mutex`, `token bucket`, `homedir`, etc.).

## Quick start

Generate notes for the next release:

```bash
gpc changelog generate
```

```markdown
## What's Changed

- feat: shell completion walker
- feat: hidden __complete subcommand for dynamic shell completion
- fix: pre-release code review follow-ups for completion v2
- docs: sync Tests badge to 1,914
- release: v0.9.60 — Smarter Tab-Completion

**Full Changelog**: https://github.com/yasserstudio/gpc/compare/v0.9.59...v0.9.60
```

Pipe directly into `gh`:

```bash
gpc changelog generate | gh release create v0.9.61 -F -
```

## Choosing a ref range

By default, `--from` is the most recent `v*` tag (`git describe --tags --match 'v*' --abbrev=0`) and `--to` is `HEAD`. Override either:

```bash
# Notes between two specific tags
gpc changelog generate --from v0.9.58 --to v0.9.60

# Notes for a feature branch about to be merged
gpc changelog generate --from main --to my-feature-branch

# Notes since a specific commit
gpc changelog generate --from a3b4c5d --to HEAD
```

If your repo has no `v*` tags yet, the default ref resolution fails with a clear suggestion to pass `--from` explicitly or create your first tag.

## The three output modes

### `--format md` — paste-ready markdown (default)

Emits the canonical template byte-for-byte, with one bullet per visible commit, grouped by type in the order: `breaking → feat → fix → perf → docs → ci → release → other`.

```bash
gpc changelog generate --format md
```

This mode is **lossless** — every commit that wasn't filtered (chore/refactor/test/build/style/merge) appears as its own bullet. That's intentional: the markdown renderer doesn't try to summarize. Use prompt mode for that.

### `--format json` — structured for tooling

Emits the intermediate representation: clusters, headline candidates, warnings, the full parsed commit list, and the resolved ref range.

```bash
gpc changelog generate --format json | jq '.headlineCandidates[0].label'
```

Useful for CI pipelines that need to inspect the result programmatically — for example, posting headline candidates to Slack, or feeding clusters to a custom renderer.

### `--format prompt` — LLM workflow

Emits a paste-ready prompt with:

- Voice rules sourced from project conventions (terse, present tense, no jargon, drop scopes, write a single-sentence highlight)
- The full clustered commit list with file paths and diff weights
- Top-3 headline candidates by cluster weight
- A target output format that matches the canonical template

```bash
gpc changelog generate --format prompt | pbcopy
```

Paste into Claude or ChatGPT and ask "write the release notes." The LLM does what humans already do manually: turn 15 raw commits into a 1-sentence highlight + 5 curated bullets. The CLI stays dependency-free; the LLM lives where you already use it.

## Smart features

### Commit clustering

Five commits all touching `packages/cli/src/commands/completion.ts` are one feature, not five bullets. The clustering algorithm groups them so the prompt-mode renderer can hand the LLM a structured "this is one thing" hint.

In markdown mode, clustering shows up indirectly — the lossless emit gives you everything, and the prompt mode is where you go when you want a curated single-bullet-per-cluster view.

### Headline scoring

The largest cluster by `+lines/-lines` weight becomes the suggested headline, with `feat` types winning ties over `fix`/`perf`. The top 3 candidates appear in `--format json` and `--format prompt` output:

```
HEADLINE CANDIDATES (largest first):
  completion subsystem (weight 828, 11 commits, primary feat)
  vitals API (weight 220, 4 commits, primary fix)
  docs refresh (weight 95, 3 commits, primary docs)
```

### Jargon linting

Every emitted commit subject is scanned for words that don't belong in user-facing release notes — `mutex`, `token bucket`, `barrel exports`, `homedir`, `at module level`, etc. Hits emit a stderr warning:

```
warn: jargon: "mutex" in subject "fix: race condition in mutex acquisition" (a3b4c5d)
(1 warning — review before publishing)
```

Use `--strict` to escalate warnings to a non-zero exit code — handy in CI to enforce voice consistency before tagging:

```bash
gpc changelog generate --strict --format md
# exits 1 if any warnings, prints them to stderr, output still goes to stdout
```

### Scope dropping

Conventional-commit scopes (`feat(cli):`) are dropped per project convention — public release notes don't need package scope. A scope-leak warning fires once per generation as a reminder:

```
warn: scope: dropped per project convention (e.g., "cli" in a3b4c5d)
```

## Common workflows

### Cut a release end-to-end

```bash
# Pick the version
VERSION=v0.9.61

# Generate, review, then publish in one pipe
gpc changelog generate | tee release-notes.md
# review release-notes.md, edit if needed
gh release create $VERSION -F release-notes.md
```

### Polished narrative via Claude

```bash
gpc changelog generate --format prompt | pbcopy
# Paste into Claude with: "Write the release notes per the rules."
# Copy Claude's output, then:
gh release create v0.9.61 -F -
```

### Enforce voice in CI

```yaml
# .github/workflows/release.yml
- run: pnpm exec gpc changelog generate --strict --from ${{ github.event.before }} --to ${{ github.event.after }}
```

The `--strict` flag means any jargon hit fails the workflow, forcing the author to clean up commit messages or accept a documented exception.

### Dry-run a release branch

```bash
git checkout my-feature-branch
gpc changelog generate --from main --to HEAD
```

Shows what your branch's release notes would look like before you merge.

## Output details

### Section order

Sections appear in this fixed order, with empty sections pruned:

1. `breaking` — anything with `feat!:` or `breaking:` prefix
2. `feat`
3. `fix`
4. `perf`
5. `docs`
6. `ci`
7. `release` — squashed release commits (e.g., `release: v0.9.60 — Smarter Tab-Completion`)
8. `other` — commits with non-conventional or unknown prefixes

Commits with these prefixes are **filtered out** of the visible output (still in the JSON `commits[]` for tooling): `chore`, `refactor`, `test`, `build`, `style`, `merge`.

### Repository URL

The `Full Changelog` link is built from the local git remote (`git remote get-url origin`). Both HTTPS (`https://github.com/owner/repo.git`) and SSH (`git@github.com:owner/repo.git`) remotes are recognized. Override with `--repo`:

```bash
gpc changelog generate --repo yasserstudio/gpc
```

The `--repo` value must match `owner/name` format (no URLs, no paths). Bad values are rejected with exit code 2.

## What this is NOT

- **Not a Play Store release notes generator** — the existing `gpc publish --notes-from-git` and `gpc releases create --notes-from-git` flags continue to handle Play Store `recentChanges[]` (per-locale, 500-char limit, different format). Per-locale Play Store output ships as `--target play-store` in v0.9.61's follow-up.
- **Not a `CHANGELOG.md` generator** — GPC publishes its release notes as GitHub Releases, not a `CHANGELOG.md` file. If you want a `CHANGELOG.md` workflow, pipe the output to a file: `gpc changelog generate >> CHANGELOG.md`.
- **Not an AI rewrite** (yet) — the CLI itself stays dependency-free. AI translation lands in a future version (`--ai`, BYO key via Vercel AI SDK). For v0.9.61, the LLM-prompt mode is the integration point.

## Reference

See the [`changelog` command reference](/commands/changelog) for the full options table and exit codes.

## Related

- [Release strategy](/advanced/conventions#github-release-notes-template) — the template this command targets
- [`gpc publish`](/commands/publish) — end-to-end upload + release workflow
- [`gpc releases create`](/commands/releases) — manage Play Console releases
