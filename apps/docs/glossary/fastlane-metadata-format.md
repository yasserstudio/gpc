---
outline: deep
---

# Fastlane Metadata Format

The Fastlane metadata format is a directory convention originated by Fastlane's `supply` action for organizing Google Play listing content on disk. One directory per locale, one text file per field.

```
metadata/
  en-US/
    title.txt
    short_description.txt
    full_description.txt
    video.txt
    images/
      icon/
      featureGraphic/
      phoneScreenshots/
  fr-FR/
    ...
```

## Why it matters

The Fastlane metadata format is the de facto standard for Android app metadata stored in a repository. Thousands of existing projects already have their listings organized this way. Any tool that wants to be drop-in compatible with the Fastlane ecosystem reads and writes this format.

For teams migrating from Fastlane to another tool, format compatibility is the difference between a one-afternoon migration and a week-long rewrite of their metadata directory.

## How GPC handles it

GPC reads and writes the Fastlane metadata format natively.

Download all listings from Play Store into a local directory:

```bash
gpc listings pull --dir metadata/
```

Upload local changes back to Play Store:

```bash
gpc listings push --dir metadata/
```

Sync images:

```bash
gpc listings images upload --lang en-US --type phoneScreenshots ./screens/*.png
```

If you have an existing Fastlane metadata directory from `fastlane supply init`, GPC works with it unchanged. The directory layout, filename conventions, and field names are all identical.

## Common issues

- **Locale directory mismatch** — Play Store locales use BCP 47 (`en-US`, `fr-FR`, `pt-BR`). Fastlane sometimes used older codes (`en_US`). GPC reads both and normalizes to BCP 47 on write.
- **Images exceeding Play Store limits** — `gpc preflight` checks image dimensions and counts against Play Store specs.
- **Missing required fields** — if a locale is missing `title.txt` or `short_description.txt`, Play Store rejects the listing. `gpc listings push --dry-run` surfaces the missing files before committing.

## Related

- [`gpc listings`](/commands/listings) — all metadata commands
- [Store Listings & Screenshots Guide](/guide/screenshots) — end-to-end metadata workflow
- [Migrate from Fastlane](/migration/from-fastlane) — switching from Fastlane supply
- [AAB](/glossary/aab) — what you upload alongside the metadata
