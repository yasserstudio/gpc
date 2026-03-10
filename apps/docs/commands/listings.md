---
outline: deep
---

# listings

Manage store listings, metadata, images, and country availability.

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

| Flag          | Short | Type     | Default        | Description                       |
| ------------- | ----- | -------- | -------------- | --------------------------------- |
| `--lang`      |       | `string` | **(required)** | Language code (BCP 47)            |
| `--title`     |       | `string` |                | App title (max 30 chars)          |
| `--short`     |       | `string` |                | Short description (max 80 chars)  |
| `--full`      |       | `string` |                | Full description (max 4000 chars) |
| `--full-file` |       | `string` |                | Read full description from a file |
| `--video`     |       | `string` |                | YouTube video URL                 |

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

| Flag     | Short | Type     | Default        | Description            |
| -------- | ----- | -------- | -------------- | ---------------------- |
| `--lang` |       | `string` | **(required)** | Language code (BCP 47) |

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

Creates the following directory structure:

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

Upload store listings from a local Fastlane-compatible directory structure.

### Synopsis

```bash
gpc listings push [options]
```

### Options

| Flag        | Short | Type      | Default    | Description                      |
| ----------- | ----- | --------- | ---------- | -------------------------------- |
| `--dir`     |       | `string`  | `metadata` | Source directory path            |
| `--dry-run` |       | `boolean` | `false`    | Preview changes without applying |

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

| Flag     | Short | Type     | Default        | Description            |
| -------- | ----- | -------- | -------------- | ---------------------- |
| `--lang` |       | `string` | **(required)** | Language code (BCP 47) |
| `--type` |       | `string` | **(required)** | Image type             |

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

| Flag     | Short | Type     | Default        | Description            |
| -------- | ----- | -------- | -------------- | ---------------------- |
| `--lang` |       | `string` | **(required)** | Language code (BCP 47) |
| `--type` |       | `string` | **(required)** | Image type             |
| `--id`   |       | `string` | **(required)** | Image ID to delete     |

### Example

```bash
gpc listings images delete \
  --app com.example.myapp \
  --lang en-US \
  --type phoneScreenshots \
  --id 1
```

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
