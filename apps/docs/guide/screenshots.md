# Store Listings & Screenshots

A walkthrough of GPC's commands for managing Google Play store media: icons, feature graphics, phone and tablet screenshots, TV banners, and Wear OS screens. Covers every image type Google Play supports, the single-file and bulk workflows, localization, image requirements, a working CI/CD recipe, and the honest limitations of the current implementation.

::: tip Companion reference
For flag-by-flag details on each command, see [`gpc listings images`](../commands/listings#listings-images-list) in the command reference. This guide focuses on workflows and real-world usage.
:::

## What Google Play supports

Google Play's store listing page for a single app can carry up to **8 image types**, each stored separately per locale:

| Type (GPC `--type`) | What it is | Where it shows up |
| --- | --- | --- |
| `icon` | 512×512 app icon (separate from the APK icon) | Everywhere Google Play lists your app |
| `featureGraphic` | 1024×500 hero banner | Top of your Play Store page |
| `phoneScreenshots` | Phone UI screenshots | Main screenshot carousel on phones |
| `sevenInchScreenshots` | 7-inch tablet UI screenshots | Screenshot carousel on 7-inch tablets |
| `tenInchScreenshots` | 10-inch tablet UI screenshots | Screenshot carousel on 10-inch tablets |
| `tvScreenshots` | Android TV UI screenshots | TV Play Store listings |
| `wearScreenshots` | Wear OS UI screenshots | Wear OS Play Store listings |
| `tvBanner` | 1280×720 TV banner | Android TV carousel |

**Per-locale means per-language AND per-region.** `phoneScreenshots` for `en-US` is a distinct slot from `phoneScreenshots` for `en-GB` or `fr-FR`. You can have the same image in every locale (just upload it to each), or tailor screenshots per language (localized UI, regional pricing overlays, etc.).

## Image requirements

Google Play validates every image at upload time. Meet these specs locally before calling any GPC upload command. Core rejects malformed images pre-upload with a clear error message (see [`validateImage`](https://github.com/yasserstudio/gpc/blob/main/packages/core/src/utils/image-validation.ts) in the source).

| Type | Format | Dimensions | Aspect ratio | Max size |
| --- | --- | --- | --- | --- |
| `icon` | 32-bit PNG (with alpha) | exactly 512 × 512 | 1:1 square | 1 MB |
| `featureGraphic` | PNG or JPEG | exactly 1024 × 500 | ~2:1 | 1 MB |
| `phoneScreenshots` | PNG or JPEG | 320–3840 px per side, min dim 320 | 16:9 or 9:16 | 8 MB |
| `sevenInchScreenshots` | PNG or JPEG | 320–3840 px per side | any | 8 MB |
| `tenInchScreenshots` | PNG or JPEG | 320–3840 px per side | any | 8 MB |
| `tvScreenshots` | PNG or JPEG | 1280×720 or 1920×1080 | 16:9 landscape | 8 MB |
| `wearScreenshots` | PNG or JPEG | 384×384 recommended | 1:1 square | 8 MB |
| `tvBanner` | PNG or JPEG | 1280×720 | 16:9 | 8 MB |

**Per-listing quantity limits:**

- Up to 8 phone screenshots per locale (minimum 2 for new apps)
- Up to 8 seven-inch tablet screenshots per locale
- Up to 8 ten-inch tablet screenshots per locale
- Up to 8 TV screenshots per locale
- Up to 8 Wear OS screenshots per locale

Authoritative source: [Google Play Console image requirements](https://support.google.com/googleplay/android-developer/answer/9866151).

## Single-file workflow

The simplest workflow: upload one image at a time with `gpc listings images upload`. Good for iterating on a single screenshot during app development, testing a feature graphic before a launch, or updating one specific type without touching the rest.

```bash
# Upload the feature graphic for en-US
gpc listings images upload ./assets/feature-1024x500.png \
  --app com.example.myapp \
  --lang en-US \
  --type featureGraphic

# Upload phone screenshot 1 of 5
gpc listings images upload ./screens/en-US/1.png \
  --app com.example.myapp \
  --lang en-US \
  --type phoneScreenshots
```

### Listing what's currently on Google Play

Before uploading replacements, check what's already live:

```bash
gpc listings images list \
  --app com.example.myapp \
  --lang en-US \
  --type phoneScreenshots
```

Returns each image's ID, URL, and SHA hashes. Useful for `--id`-based deletion or for diffing against local files.

### Deleting a specific image

Only available by ID. There's no bulk delete in the CLI today (the underlying API supports `deleteAll`, but GPC hasn't exposed it as a flag yet).

```bash
# First, find the image ID
gpc listings images list --app com.example.myapp --lang en-US --type phoneScreenshots
# Then delete it
gpc listings images delete --app com.example.myapp --lang en-US --type phoneScreenshots --id <image-id>
```

### Exporting everything to local disk

`gpc listings images export` downloads every image for every locale + type (or a filtered subset) into a local directory:

```bash
# Export everything
gpc listings images export \
  --app com.example.myapp \
  --dir ./images

# Export only phone screenshots for one locale
gpc listings images export \
  --app com.example.myapp \
  --dir ./images-en-phones \
  --lang en-US \
  --type phoneScreenshots
```

The directory layout GPC writes:

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
    phoneScreenshots/
      1.png
      2.png
    ...
```

Files are numbered sequentially (`1.png`, `2.png`, ...). The original filenames from your build are not preserved because Google Play doesn't store them.

## Bulk workflow (the honest version)

::: warning Current limitation
GPC v0.9.61 does **not** have a single "sync all images from a directory" command. `gpc listings push` handles text metadata only. For bulk image upload, you need to loop over your files and call `gpc listings images upload` per file. The pattern below works and is what users should run today. A future `gpc listings images push --dir <path>` is an open feature request — if you want it, open an issue on [github.com/yasserstudio/gpc](https://github.com/yasserstudio/gpc/issues).
:::

### The shell loop

For each locale and each image type, loop over the local files and upload them one by one. Here's a portable shell script:

```bash
#!/bin/bash
# sync-images.sh — upload every image in ./images/<lang>/<type>/*.png to Google Play
set -euo pipefail

APP="com.example.myapp"
SOURCE_DIR="./images"

for lang_dir in "$SOURCE_DIR"/*/; do
  lang=$(basename "$lang_dir")
  for type_dir in "$lang_dir"*/; do
    type=$(basename "$type_dir")
    for file in "$type_dir"*.png "$type_dir"*.jpg; do
      [ -e "$file" ] || continue
      echo "Uploading $file → $lang / $type"
      gpc listings images upload "$file" \
        --app "$APP" \
        --lang "$lang" \
        --type "$type"
    done
  done
done
```

Save this as `scripts/sync-images.sh` in your repo, make it executable (`chmod +x`), and run it as part of your release flow.

**Before running:** if the Play Store already has images for any of these slots, you may want to delete them first (to avoid ending up with 10 phone screenshots where you wanted 5). The API **replaces** an image if you upload one with the same filename, but **adds** a new one if the filename is different. For clean replacement, list + delete the existing images for each locale + type first, then upload.

### Pairing text and image sync in one flow

Your realistic release flow looks like this:

```bash
# 1. Sync text metadata (title, descriptions, video URLs) from ./metadata
gpc listings push --dir ./metadata

# 2. Sync all images from ./images
./scripts/sync-images.sh
```

Your repo layout:

```
repo/
  metadata/              # Fastlane-compatible text metadata
    en-US/
      title.txt
      short_description.txt
      full_description.txt
      video.txt
    ja-JP/
      ...
  images/                # GPC-compatible image layout
    en-US/
      icon/
        1.png
      featureGraphic/
        1.png
      phoneScreenshots/
        1.png
        2.png
        3.png
    ja-JP/
      ...
  scripts/
    sync-images.sh
```

Note the two separate top-level directories: `metadata/` (Fastlane format for text) and `images/` (GPC format for binaries). You can combine them under a single parent if you prefer, but keep the internal layouts as shown above — `gpc listings push` expects text files directly under `<lang>/`, while `gpc listings images upload` / `export` expect binaries under `<lang>/<type>/`.

## Localization strategy

**Option 1: same images everywhere.** Create one canonical `en-US/` directory, then symlink or copy to every other locale at build time. Simplest, but the Play Store will show English screenshots to German users.

```bash
# Copy en-US images to every other locale
for lang in fr-FR de-DE ja-JP es-ES; do
  cp -r images/en-US images/$lang
done
./scripts/sync-images.sh
```

**Option 2: localized screenshots.** Generate separate screenshots per locale using Fastlane's [`screengrab`](https://docs.fastlane.tools/actions/screengrab/) or a custom tool. Commit the localized versions to `images/<lang>/` and let the sync loop handle them. More work, but higher conversion rates in non-English markets.

**Option 3: localized UI captures only.** Same image in every locale for icon + feature graphic (universal branding), but localized phone screenshots per language. Most common pragmatic choice.

## CI/CD recipe (GitHub Actions)

```yaml
name: Sync store listings

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'metadata/**'
      - 'images/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Install GPC
        run: npm install -g @gpc-cli/cli

      - name: Write service account key
        run: echo '${{ secrets.GPC_SA_KEY }}' > /tmp/sa.json
        env:
          GPC_SERVICE_ACCOUNT_KEY: /tmp/sa.json

      - name: Sync text metadata
        run: gpc listings push --app ${{ secrets.PACKAGE_NAME }} --dir ./metadata

      - name: Sync images
        run: ./scripts/sync-images.sh
        env:
          APP: ${{ secrets.PACKAGE_NAME }}
```

The `paths:` filter means this workflow only runs when something in `metadata/` or `images/` changes, not on every code commit. Designers and marketers can push screenshot updates and they land on the Play Store without a full app release.

## Pre-upload validation

GPC's core automatically validates images before upload. If an image is malformed (wrong dimensions, wrong format, too large), `gpc listings images upload` returns a clear error without hitting Google's API. See [`packages/core/src/utils/image-validation.ts`](https://github.com/yasserstudio/gpc/blob/main/packages/core/src/utils/image-validation.ts) for the exact checks.

You can also validate locally before committing with any image tool:

```bash
# macOS / Linux with ImageMagick
identify ./images/en-US/phoneScreenshots/1.png
# Output: PNG 1080x1920 sRGB 2.1MB

# Check aspect ratio
python3 -c "from PIL import Image; im = Image.open('./images/en-US/phoneScreenshots/1.png'); print(f'{im.size} ratio={im.size[0]/im.size[1]:.3f}')"
```

If you get in the habit of running `identify` or similar on every new screenshot before committing, you'll catch most image-spec violations before they reach your CI run.

## What GPC does NOT do

Being explicit about the edges so you know where to reach for other tools:

- **Screenshot generation.** GPC does not drive an emulator, run UI tests, or take screenshots of your app. If you need automated screenshot capture, use [Fastlane `screengrab`](https://docs.fastlane.tools/getting-started/android/screenshots/) or a custom Espresso test suite. Pipe the resulting PNGs into `gpc listings images upload` or the shell loop above.
- **Image optimization.** GPC does not compress, resize, or convert images. Your source files need to meet Google's specs already. Tools like `pngquant`, `jpegoptim`, or `squoosh` work well in a pre-upload step.
- **A/B testing store listings.** Google Play has a Store Listing Experiments feature for this. It's a separate API surface that GPC does not currently wrap. Open an issue if you want it.
- **Automatic translation of listing text or screenshot overlays.** GPC copies what's in your local directory. Translation is a separate concern.
- **Bulk image push from a directory.** As noted in the honest-version callout above. Use the shell loop today; file a feature request if you want a first-class command.
- **Old `promoGraphic` image type.** Google Play deprecated this years ago; GPC does not support it.

## Troubleshooting

**"Image validation failed: dimensions out of range"**
Your image is outside the 320-3840 px bounds for its type. Resize and retry. `identify <file>` shows the current dimensions.

**"Image validation failed: unsupported format"**
The file isn't PNG or JPEG. Convert with `pngquant` / `imagemagick` / `squoosh`.

**"Image validation failed: file too large"**
The file exceeds 8 MB for screenshots or 1 MB for icon/feature graphic. Compress with a lossy tool (phone screenshots often compress to 10-20% of original size at acceptable quality).

**"API_UPLOAD_FAILED: rejected by Play Store"**
The image passed local validation but Google rejected it. Check the response body in the error for the specific reason. Common causes: promotional text embedded in the feature graphic (against Play Store policy), nudity / violence, misleading UI.

**"No images found for language X type Y" when exporting**
Normal if you haven't uploaded any images for that slot. `listings images export` skips empty slots.

**"Shell loop is slow for N locales × 8 screenshots"**
Each upload is a separate API call. Google's rate limit is generous (several per second), but a 20-locale release is ~160 sequential API calls, ~2-3 minutes. If this is painful, parallelize the loop with `xargs -P` or GNU parallel. Stay under ~10 parallel uploads to avoid rate-limit errors.

## Related

- [`gpc listings`](../commands/listings) — full command reference
- [Migrating from Fastlane](../migration/from-fastlane) — mapping Fastlane commands to GPC
- [Google Play Console image requirements](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Fastlane `screengrab`](https://docs.fastlane.tools/actions/screengrab/) — for automated screenshot generation

## Known gaps (as of v0.9.61)

These are tracked for future GPC versions. Your feedback on which matter most drives prioritization:

- **`gpc listings images push --dir <path>`** — a first-class bulk upload command that walks a directory and replaces Play Store images atomically. Would eliminate the shell loop.
- **`gpc listings images delete --all`** — bulk-delete all images for a locale + type. The underlying API supports it (`deleteAll` method in the api-client); CLI exposure is missing.
- **Fastlane-layout compat for images.** GPC writes `<dir>/<lang>/<type>/` while Fastlane uses `<dir>/<lang>/images/<type>/`. Adding a `--fastlane-layout` flag to `export`/`upload` would enable direct round-trips with existing Fastlane repos.
- **Pre-upload image validation surfaced in preflight.** Currently only checked at upload time; could be moved to `gpc preflight` for earlier feedback.
- **Store Listing Experiments API** — A/B testing of icons, graphics, and descriptions. Google has the API; GPC doesn't wrap it yet.
- **Deprecated image types** — `promoGraphic` is no longer supported by Google Play and GPC matches that.

If any of these block your workflow, open an issue at [github.com/yasserstudio/gpc](https://github.com/yasserstudio/gpc/issues) with your use case.
