#!/usr/bin/env bash
# Regenerates the Billing Library preflight fixtures from real Gradle builds.
# Needs: Android SDK (platform 36) with ANDROID_HOME set, JDK 17+, network
# access to Google Maven. See README.md for the versions used.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
recipe="$here/recipe"
flavors=(billing7 billingKtx8 billing9 billing8NoMeta noBilling)

tasks=()
for f in "${flavors[@]}"; do
  tasks+=("bundle$(tr '[:lower:]' '[:upper:]' <<<"${f:0:1}")${f:1}Release")
done
(cd "$recipe" && ./gradlew --no-daemon -q "${tasks[@]}")

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for f in "${flavors[@]}"; do
  aab="$recipe/app/build/outputs/bundle/${f}Release/app-${f}-release.aab"
  # Flavor names are camelCase (Gradle); fixture files are kebab-case.
  name="$(sed -E 's/([a-z])([A-Z0-9])/\1-\2/g; s/([0-9])([A-Za-z])/\1-\2/g' <<<"$f" | tr '[:upper:]' '[:lower:]')"
  out="$here/${name}.aab"
  rm -rf "$work/x" "$out"
  mkdir -p "$work/x"
  # Keep only the base manifest: real protobuf bytes in a real ZIP, a few KB.
  unzip -q "$aab" base/manifest/AndroidManifest.xml -d "$work/x"
  # Fixed timestamp so a rebuild with unchanged inputs gives identical bytes.
  touch -t 202601010000 "$work/x/base/manifest/AndroidManifest.xml"
  (cd "$work/x" && zip -q -X "$out" base/manifest/AndroidManifest.xml)
  echo "wrote ${name}.aab ($(wc -c <"$out" | tr -d ' ') bytes)"
done
