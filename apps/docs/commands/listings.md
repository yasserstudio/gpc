---
outline: deep
---

<CommandHeader
  name="gpc listings"
  description="Manage store listings, metadata, images, and country availability. Fastlane supply compatible."
  usage="gpc listings <subcommand> [options]"
  :badges="['--json', '--dry-run', '--locale']"
/>

## Commands

| Command                                             | Description                                    |
| --------------------------------------------------- | ---------------------------------------------- |
| [`listings get`](#listings-get)                     | Get store listing(s)                           |
| [`listings update`](#listings-update)               | Update a store listing                         |
| [`listings delete`](#listings-delete)               | Delete a store listing for a language          |
| [`listings pull`](#listings-pull)                   | Download listings to Fastlane-format directory |
| [`listings push`](#listings-push)                   | Upload listings from Fastlane-format directory |
| [`listings images list`](#listings-images-list)     | List images for a language and type            |
| [`listings images upload`](#listings-images-upload) | Upload an image                                |
| [`listings images delete`](#listings-images-delete) | Delete an image                                |
| [`listings images sync`](#listings-images-sync)     | Sync local image directory to Google Play      |
| [`listings availability`](#listings-availability)   | Get country availability for a track           |

## `listings get`

Retrieve store listing details for one language or all languages.

### Synopsis

```bash
gpc listings get [options]
```

### Options

| Flag     | Short | Type     | Default | Description                                        |
| -------- | ----- | -------- | ------- | -------------------------------------------------- |
| `--lang` |       | `string` |         | Language code (BCP 47). Omit to get all languages. |

### Example

Get the default language listing:

```bash
gpc listings get --app com.example.myapp
```

Get a specific language:

```bash
gpc listings get --app com.example.myapp --lang ja-JP
```

```json
{
  "language": "ja-JP",
  "title": "My App",
  "shortDescription": "Short description in Japanese",
  "fullDescription": "Full description in Japanese",
  "video": ""
}
```

---

## `listings update`

Update a store listing for a specific language.

### Synopsis

```bash
gpc listings update --lang <language> [options]
```

### Options

| Flag                            | Short | Type     | Default        | Description                           |
| ------------------------------- | ----- | -------- | -------------- | ------------------------------------- |
| `--lang`                        |       | `string` | **(required)** | Language code (BCP 47)                |
| `--title`                       |       | `string` |                | App title (max 30 chars)              |
| `--short`                       |       | `string` |                | Short description (max 80 chars)      |
| `--full`                        |       | `string` |                | Full description (max 4000 chars)     |
| `--full-file`                   |       | `string` |                | Read full description from a file     |
| `--video`                       |       | `string` |                | YouTube video URL                     |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review     |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review |

### Example

Update title and short description:

```bash
gpc listings update \
  --app com.example.myapp \
  --lang en-US \
  --title "My App" \
  --short "The best app for productivity"
```

Update full description from a file:

```bash
gpc listings update \
  --app com.example.myapp \
  --lang en-US \
  --full-file ./metadata/en-US/full_description.txt
```

Preview changes without applying:

```bash
gpc listings update \
  --app com.example.myapp \
  --lang en-US \
  --title "New Title" \
  --dry-run
```

---

## `listings delete`

Delete a store listing for a specific language.

### Synopsis

```bash
gpc listings delete --lang <language>
```

### Options

| Flag                            | Short | Type     | Default        | Description                           |
| ------------------------------- | ----- | -------- | -------------- | ------------------------------------- |
| `--lang`                        |       | `string` | **(required)** | Language code (BCP 47)                |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review     |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review |

### Example

```bash
gpc listings delete --app com.example.myapp --lang fr-FR
```

---

## `listings pull`

Download all store listings to a local Fastlane-compatible directory structure.

### Synopsis

```bash
gpc listings pull [options]
```

### Options

| Flag    | Short | Type     | Default    | Description           |
| ------- | ----- | -------- | ---------- | --------------------- |
| `--dir` |       | `string` | `metadata` | Output directory path |

### Example

```bash
gpc listings pull --app com.example.myapp --dir ./metadata
```

**Text metadata only.** This command downloads titles, short descriptions, full descriptions, and video URLs for every locale. It does NOT pull images — use `gpc listings images export` for those (they write to a separate directory layout). See the [Store Listings & Screenshots guide](../guide/screenshots.md) for the full story and how to sync both.

```
metadata/
  en-US/
    title.txt
    short_description.txt
    full_description.txt
    video.txt
  ja-JP/
    title.txt
    short_description.txt
    full_description.txt
    video.txt
```

```json
{
  "directory": "./metadata",
  "languages": ["en-US", "ja-JP"],
  "count": 2
}
```

---

## `listings push`

Upload store listings from a local Fastlane-compatible directory structure. **Text metadata only** (titles, descriptions, video URLs). Does NOT upload images — for screenshots and graphics, use `gpc listings images upload` per-file. See the [Store Listings & Screenshots guide](../guide/screenshots.md) for a shell-loop pattern that uploads an entire image tree.

### Synopsis

```bash
gpc listings push [options]
```

### Options

| Flag                            | Short | Type      | Default    | Description                                 |
| ------------------------------- | ----- | --------- | ---------- | ------------------------------------------- |
| `--dir`                         |       | `string`  | `metadata` | Source directory path                       |
| `--dry-run`                     |       | `boolean` | `false`    | Preview changes without applying            |
| `--force`                       |       | flag      |            | Push even if fields exceed character limits |
| `--changes-not-sent-for-review` |       | flag      |            | Commit without sending for review           |
| `--error-if-in-review`          |       | flag      |            | Fail if changes are already in review       |

### Example

Push all metadata:

```bash
gpc listings push --app com.example.myapp --dir ./metadata
```

Preview what would change:

```bash
gpc listings push --app com.example.myapp --dir ./metadata --dry-run
```

```json
{
  "dryRun": true,
  "changes": [
    { "language": "en-US", "field": "title", "action": "update" },
    { "language": "ja-JP", "field": "fullDescription", "action": "update" }
  ]
}
```

---

## `listings images list`

List all images for a specific language and image type.

### Synopsis

```bash
gpc listings images list --lang <language> --type <type>
```

### Options

| Flag     | Short | Type     | Default        | Description            |
| -------- | ----- | -------- | -------------- | ---------------------- |
| `--lang` |       | `string` | **(required)** | Language code (BCP 47) |
| `--type` |       | `string` | **(required)** | Image type (see below) |

Valid image types: `phoneScreenshots`, `sevenInchScreenshots`, `tenInchScreenshots`, `tvScreenshots`, `wearScreenshots`, `icon`, `featureGraphic`, `tvBanner`.

### Example

```bash
gpc listings images list \
  --app com.example.myapp \
  --lang en-US \
  --type phoneScreenshots
```

```json
{
  "images": [
    { "id": "1", "sha256": "abc123", "url": "https://lh3.googleusercontent.com/..." },
    { "id": "2", "sha256": "def456", "url": "https://lh3.googleusercontent.com/..." }
  ]
}
```

---

## `listings images upload`

Upload an image file to a specific language and image type slot.

### Synopsis

```bash
gpc listings images upload <file> --lang <language> --type <type>
```

### Options

| Flag                            | Short | Type     | Default        | Description                           |
| ------------------------------- | ----- | -------- | -------------- | ------------------------------------- |
| `--lang`                        |       | `string` | **(required)** | Language code (BCP 47)                |
| `--type`                        |       | `string` | **(required)** | Image type                            |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review     |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review |

### Example

```bash
gpc listings images upload ./screenshots/home.png \
  --app com.example.myapp \
  --lang en-US \
  --type phoneScreenshots
```

---

## `listings images delete`

Delete a specific image by ID.

### Synopsis

```bash
gpc listings images delete --lang <language> --type <type> --id <imageId>
```

### Options

| Flag                            | Short | Type     | Default        | Description                           |
| ------------------------------- | ----- | -------- | -------------- | ------------------------------------- |
| `--lang`                        |       | `string` | **(required)** | Language code (BCP 47)                |
| `--type`                        |       | `string` | **(required)** | Image type                            |
| `--id`                          |       | `string` | **(required)** | Image ID to delete                    |
| `--changes-not-sent-for-review` |       | flag     |                | Commit without sending for review     |
| `--error-if-in-review`          |       | flag     |                | Fail if changes are already in review |

### Example

```bash
gpc listings images delete \
  --app com.example.myapp \
  --lang en-US \
  --type phoneScreenshots \
  --id 1
```

---

## `listings images export`

Download all images (or a filtered subset) from Google Play to a local directory. Useful for bootstrapping a Fastlane metadata directory from your current store state, or backing up screenshots before a risky re-upload.

### Synopsis

```bash
gpc listings images export [options]
```

### Options

| Flag     | Short | Type     | Default  | Description                                                |
| -------- | ----- | -------- | -------- | ---------------------------------------------------------- |
| `--dir`  |       | `string` | `images` | Output directory path                                      |
| `--lang` |       | `string` |          | Language code (BCP 47). If omitted, exports all languages. |
| `--type` |       | `string` |          | Image type. If omitted, exports all types.                 |

### Example — export everything

```bash
gpc listings images export \
  --app com.example.myapp \
  --dir ./images
```

Creates the following structure (one directory per language, each containing one directory per image type, files numbered sequentially):

```
images/
  en-US/
    icon/
      1.png
    featureGraphic/
      1.png
    phoneScreenshots/
      1.png
      2.png
      3.png
    sevenInchScreenshots/
      1.png
    tenInchScreenshots/
      1.png
  ja-JP/
    ...
```

::: warning Layout note
This is **not** the same layout as Fastlane's `metadata/android/<lang>/images/<type>/` format. GPC's image export uses `<dir>/<lang>/<type>/` without the nested `images/` subdirectory. The exported files are suitable for re-upload via `gpc listings images upload` per-file, but cannot be round-tripped via `gpc listings push` (which only handles text metadata). See the [Store Listings & Screenshots guide](../guide/screenshots.md) for the round-trip pattern and limitations.
:::

### Example — export only phone screenshots for one locale

```bash
gpc listings images export \
  --app com.example.myapp \
  --dir ./screens \
  --lang en-US \
  --type phoneScreenshots
```

---

## `listings images sync`

Sync a local image directory to Google Play. Compares local file SHA-256 against Google's `Image.sha256` field and uploads only changed files. Operates inside a single edit for efficiency. Deletes are applied before uploads to avoid per-type image count limits.

### Synopsis

```bash
gpc listings images sync [options]
```

### Options

| Flag                            | Short | Type      | Default  | Description                                                                                              |
| ------------------------------- | ----- | --------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `--dir`                         |       | `string`  | `images` | Local image directory path                                                                               |
| `--lang`                        |       | `string`  |          | Filter to a single language code (BCP 47). If omitted, syncs all languages found in `--dir`.            |
| `--type`                        |       | `string`  |          | Filter to a single image type. If omitted, syncs all types. See valid types below.                      |
| `--delete`                      |       | flag      |          | Remove remote images that are not present locally. Opt-in; no deletions occur without this flag.         |
| `--dry-run`                     |       | `boolean` | `false`  | Preview uploads and deletes without executing any changes.                                               |
| `--changes-not-sent-for-review` |       | flag      |          | Commit without sending for review                                                                        |
| `--error-if-in-review`          |       | flag      |          | Fail if changes are already in review                                                                    |

Valid image types: `icon`, `featureGraphic`, `tvBanner`, `phoneScreenshots`, `sevenInchScreenshots`, `tenInchScreenshots`, `tvScreenshots`, `wearScreenshots`.

The command expects the same `<dir>/<lang>/<type>/` layout produced by `gpc listings images export`.

### Example — sync all images

```bash
gpc listings images sync \
  --app com.example.myapp \
  --dir ./images
```

```
Synced 18 images: 14 skipped (unchanged), uploaded 4
```

### Example — sync one locale with deletions

```bash
gpc listings images sync \
  --app com.example.myapp \
  --dir ./images \
  --lang en-US \
  --delete
```

### Example — preview changes without applying

```bash
gpc listings images sync \
  --app com.example.myapp \
  --dir ./images \
  --dry-run
```

```json
{
  "dryRun": true,
  "changes": [
    { "lang": "en-US", "type": "phoneScreenshots", "file": "1.png", "action": "upload" },
    { "lang": "en-US", "type": "phoneScreenshots", "file": "5.png", "action": "upload" },
    { "lang": "ja-JP", "type": "featureGraphic", "file": "1.png", "action": "skip" }
  ]
}
```

---

## Image requirements

Google Play validates every image at upload time. GPC does not run pre-upload validation (yet), so malformed images surface as opaque API errors. Meet these specs locally before calling `gpc listings images upload` or `gpc listings push`:

| Type                   | Format                  | Dimensions                              | Aspect ratio   | Max size |
| ---------------------- | ----------------------- | --------------------------------------- | -------------- | -------- |
| `icon`                 | 32-bit PNG (with alpha) | exactly 512 × 512                       | 1:1            | 1 MB     |
| `featureGraphic`       | PNG or JPEG             | exactly 1024 × 500                      | 2048:1000      | 1 MB     |
| `phoneScreenshots`     | PNG or JPEG             | 320–3840 px per side, min dimension 320 | 16:9 or 9:16   | 8 MB     |
| `sevenInchScreenshots` | PNG or JPEG             | same as phone                           | any            | 8 MB     |
| `tenInchScreenshots`   | PNG or JPEG             | same as phone                           | any            | 8 MB     |
| `tvScreenshots`        | PNG or JPEG             | 1280×720 or 1920×1080 recommended       | 16:9 landscape | 8 MB     |
| `wearScreenshots`      | PNG or JPEG             | 384×384 recommended                     | 1:1 square     | 8 MB     |
| `tvBanner`             | PNG or JPEG             | 1280×720                                | 16:9           | 8 MB     |

**Per-listing limits:**

- Up to 8 phone screenshots per locale (minimum 2 for new apps)
- Up to 8 seven-inch tablet screenshots per locale
- Up to 8 ten-inch tablet screenshots per locale
- Up to 8 TV screenshots per locale
- Up to 8 Wear OS screenshots per locale

**A quick local check before upload:**

```bash
# macOS / Linux
identify ./screens/home.png
# Verify: width, height, format, and file size
```

Authoritative spec: [Google Play Console image requirements](https://support.google.com/googleplay/android-developer/answer/9866151).

## Bulk workflow: text AND images

`listings pull` / `listings push` handle **text metadata only**. For images, use `listings images export` to download and `listings images sync` to upload with SHA-256 deduplication (skips unchanged files, optionally deletes remote-only images with `--delete`). There is no single "sync everything" command that handles both text and images today. See the [Store Listings & Screenshots guide](../guide/screenshots.md) for the full round-trip pattern.

---

## `listings availability`

Get country availability for a specific track.

### Synopsis

```bash
gpc listings availability [options]
```

### Options

| Flag      | Short | Type     | Default      | Description |
| --------- | ----- | -------- | ------------ | ----------- |
| `--track` |       | `string` | `production` | Track name  |

### Example

```bash
gpc listings availability --app com.example.myapp --track production
```

```json
{
  "countries": [
    { "countryCode": "US", "available": true },
    { "countryCode": "JP", "available": true },
    { "countryCode": "DE", "available": true }
  ]
}
```

## Related

- [publish](./publish) -- End-to-end release workflow
- [releases](./releases) -- Release management
- [Migration from Fastlane](/migration/from-fastlane) -- Fastlane directory compatibility
